import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

export type ClaudeChunk = string;

export interface ClaudeClient {
  /** Stream response text chunks. Resolves when the response is complete. */
  query(systemPrompt: string, userPrompt: string, onChunk: (chunk: ClaudeChunk) => void): Promise<void>;
}

// ── Anthropic / Claude client ─────────────────────────────────────────────────

class AnthropicClient implements ClaudeClient {
  constructor(private readonly apiKey: string) {}

  query(systemPrompt: string, userPrompt: string, onChunk: (chunk: ClaudeChunk) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        stream: true,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: userPrompt }],
      });

      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Anthropic API error ${res.statusCode}`)); return;
        }
        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) { continue; }
            const json = line.slice(6).trim();
            if (json === '[DONE]') { continue; }
            try {
              const evt = JSON.parse(json);
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                onChunk(evt.delta.text);
              }
            } catch { /* ignore */ }
          }
        });
        res.on('end', resolve);
        res.on('error', reject);
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

// ── OpenAI / ChatGPT client ───────────────────────────────────────────────────

class OpenAiClient implements ClaudeClient {
  constructor(private readonly apiKey: string) {}

  query(systemPrompt: string, userPrompt: string, onChunk: (chunk: ClaudeChunk) => void): Promise<void> {
    return this._queryWithRetry(systemPrompt, userPrompt, onChunk, 3, 2000);
  }

  private _queryWithRetry(
    systemPrompt: string, userPrompt: string,
    onChunk: (chunk: ClaudeChunk) => void,
    retriesLeft: number, delayMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const messages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt },
      ];
      const body = JSON.stringify({
        model: 'gpt-4o',
        stream: true,
        messages,
      });

      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        if (res.statusCode === 429 || (res.statusCode && res.statusCode >= 400)) {
          let errBody = '';
          res.on('data', (c: Buffer) => { errBody += c.toString('utf8'); });
          res.on('end', () => {
            if (res.statusCode === 429 && retriesLeft > 0) {
              // Check for quota exhaustion — no point retrying
              let parsed: any = {};
              try { parsed = JSON.parse(errBody); } catch { /* ignore */ }
              const code = parsed?.error?.code ?? '';
              if (code === 'insufficient_quota') {
                reject(new Error('OpenAI quota exhausted — add credits at platform.openai.com, or switch to a Claude API key.')); return;
              }
              const retryAfterMs = parseInt(res.headers['retry-after'] ?? '0', 10) * 1000 || delayMs;
              setTimeout(() => {
                this._queryWithRetry(systemPrompt, userPrompt, onChunk, retriesLeft - 1, delayMs * 2)
                  .then(resolve, reject);
              }, retryAfterMs);
              return;
            }
            reject(new Error(`OpenAI API error ${res.statusCode}`));
          });
          return;
        }
        let buffer = '';
        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) { continue; }
            const json = line.slice(6).trim();
            if (json === '[DONE]') { continue; }
            try {
              const evt = JSON.parse(json);
              const text = evt.choices?.[0]?.delta?.content;
              if (text) { onChunk(text); }
            } catch { /* ignore */ }
          }
        });
        res.on('end', resolve);
        res.on('error', reject);
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

// ── Claude CLI client ─────────────────────────────────────────────────────────

class ClaudeCliClient implements ClaudeClient {
  query(systemPrompt: string, userPrompt: string, onChunk: (chunk: ClaudeChunk) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userPrompt}` : userPrompt;

      // Write prompt via stdin to avoid shell escaping issues with special chars.
      // Strip CLAUDECODE so the CLI doesn't refuse to run inside an active session.
      const env = { ...process.env };
      delete env['CLAUDECODE'];

      const proc = spawn('claude', ['--output-format', 'stream-json', '--verbose', '--permission-mode', 'bypassPermissions'], {
        env,
        shell: true,
      });

      proc.stdin.write(fullPrompt, 'utf8');
      proc.stdin.end();

      let errText = '';
      let buffer = '';
      proc.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { continue; }
          try {
            const evt = JSON.parse(trimmed);
            if (evt.type === 'assistant') {
              for (const block of (evt.message?.content ?? [])) {
                if (block.type === 'text') { onChunk(block.text); }
              }
            } else if (evt.type === 'result') {
              if (evt.is_error) {
                errText = `claude result error: ${evt.result ?? 'unknown'}`;
              } else if (evt.result && !evt.result.startsWith('{')) {
                // Fallback plain-text result (no assistant event fired)
                onChunk(evt.result);
              }
            }
          } catch { /* incomplete line */ }
        }
      });

      proc.stderr.on('data', (chunk: Buffer) => { errText += chunk.toString('utf8'); });

      proc.on('close', (code: number) => {
        if (code !== 0) {
          reject(new Error(`claude CLI exited ${code}: ${errText.trim() || 'unknown error'}`));
        } else {
          // Surface any stderr warnings even on success
          if (errText.trim()) {
            onChunk(`\n[cli stderr]: ${errText.trim()}`);
          }
          resolve();
        }
      });

      proc.on('error', (err: Error) => {
        reject(new Error(`Failed to spawn claude CLI: ${err.message}`));
      });
    });
  }
}

// ── Fallback wrapper ──────────────────────────────────────────────────────────

class FallbackClient implements ClaudeClient {
  constructor(private readonly primary: ClaudeClient, private readonly fallback: ClaudeClient) {}

  async query(systemPrompt: string, userPrompt: string, onChunk: (chunk: ClaudeChunk) => void): Promise<void> {
    try {
      await this.primary.query(systemPrompt, userPrompt, onChunk);
    } catch (e: any) {
      if (e.message?.includes('quota') || e.message?.includes('429')) {
        return this.fallback.query(systemPrompt, userPrompt, onChunk);
      }
      throw e;
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export const ANTHROPIC_KEY_SECRET = 'anthropic-api-key';
export const OPENAI_KEY_SECRET = 'openai-api-key';

/**
 * Load the bundled link-repair context file that is injected into Claude's system prompt.
 * Pass the extension's root directory (context.extensionPath).
 */
export function loadRepairContext(extensionPath: string): string {
  const contextFile = path.join(extensionPath, 'assets', 'prompts', 'link-repair-context.md');
  try {
    return fs.readFileSync(contextFile, 'utf8');
  } catch {
    return ''; // missing in dev builds — not fatal
  }
}

/**
 * Build an AI client. Prefers Anthropic key, then OpenAI, then falls back to
 * the locally-installed claude CLI (Claude Code).
 */
export function buildClaudeClient(claudeKey?: string, openAiKey?: string): ClaudeClient {
  if (claudeKey) { return new AnthropicClient(claudeKey); }
  if (openAiKey) { return new FallbackClient(new OpenAiClient(openAiKey), new ClaudeCliClient()); }
  return new ClaudeCliClient();
}
