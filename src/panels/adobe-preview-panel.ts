import * as path from 'path';
import * as vscode from 'vscode';
import { createAdobeMarkdownIt } from '../preview/adobe-markdown-it';
import {
  previewResourceRootFsPaths,
  rewriteHtmlLocalResources,
  resolveLocalPath,
} from '../preview/rewrite-html-resources';
import { stripYamlFrontmatterForPreview } from '../preview/strip-yaml-frontmatter';
import { stripHeadingPermalinkAnchors } from '../preview/strip-heading-permalinks';
import { output } from '../lib/common';

const VIEW_TYPE = 'adobeExl.adobePreview';

const PREVIEW_STYLES = [
  'assets/styles/fonts.css',
  'assets/styles/base.css',
  'assets/styles/adobe-preview.css',
];

/** Same load order as former markdown.previewScripts in package.json */
const PREVIEW_SCRIPTS = [
  'assets/scripts/prism/prism.js',
  'assets/scripts/prism/prism-clike.js',
  'assets/scripts/prism/prism-javascript.js',
  'assets/scripts/prism/prism-typescript.js',
  'assets/scripts/prism/prism-markup.js',
  'assets/scripts/prism/prism-markup-templating.js',
  'assets/scripts/prism/prism-css.js',
  'assets/scripts/prism/prism-scss.js',
  'assets/scripts/prism/prism-json.js',
  'assets/scripts/prism/prism-bash.js',
  'assets/scripts/prism/prism-python.js',
  'assets/scripts/prism/prism-yaml.js',
  'assets/scripts/prism/prism-java.js',
  'assets/scripts/prism/prism-sql.js',
  'assets/scripts/prism/prism-graphql.js',
  'assets/scripts/prism/prism-diff.js',
  'assets/scripts/prism/prism-http.js',
  'assets/scripts/prism/prism-velocity.js',
  'assets/scripts/prism/prism-apex.js',
  'assets/scripts/prism/prism-php.js',
  'assets/scripts/prism-init.js',
];

function webviewUri(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  relPath: string
): string {
  return webview
    .asWebviewUri(vscode.Uri.joinPath(extensionUri, ...relPath.split('/')))
    .toString();
}

function buildPreviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  options?: { diagnosticMode?: boolean }
): string {
  const diagnosticMode = options?.diagnosticMode === true;
  const csp = webview.cspSource;
  const styleHrefs = PREVIEW_STYLES.map((p) => webviewUri(webview, extensionUri, p));
  const bootstrap = webviewUri(webview, extensionUri, 'media/adobe-preview-bootstrap.js');
  const scriptSrcs = PREVIEW_SCRIPTS.map((p) => webviewUri(webview, extensionUri, p));

  const styleTags = styleHrefs.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n');
  const prismScripts = scriptSrcs
    .map((src) => `<script src="${src}"></script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-diagnostics="${diagnosticMode}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${csp} 'unsafe-inline'; img-src ${csp} data: https:; object-src ${csp} data: https:; media-src ${csp} data: https:; script-src ${csp}; font-src ${csp} data:;">
${styleTags}
</head>
<body class="vscode-body">
<div id="adobe-preview-root"></div>
<script src="${bootstrap}"></script>
${prismScripts}
</body>
</html>`;
}

export class AdobePreviewManager implements vscode.Disposable {
  private readonly panels = new Map<string, AdobePreviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  show(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
      void vscode.window.showWarningMessage(
        'Open a Markdown file to use Adobe Preview.'
      );
      return;
    }
    const key = editor.document.uri.toString();
    let panel = this.panels.get(key);
    if (panel) {
      panel.reveal();
      void panel.refresh();
      return;
    }
    panel = new AdobePreviewPanel(
      this.context,
      editor.document.uri,
      () => {
        this.panels.delete(key);
      }
    );
    this.panels.set(key, panel);
  }

  dispose(): void {
    const panels = Array.from(this.panels.values());
    this.panels.clear();
    for (const p of panels) {
      p.dispose();
    }
  }
}

class AdobePreviewPanel implements vscode.Disposable {
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private _webviewReady = false;
  private _pendingBody: string | null = null;
  private _debounce: ReturnType<typeof setTimeout> | undefined;

  constructor(
    context: vscode.ExtensionContext,
    private readonly documentUri: vscode.Uri,
    private readonly onDispose: () => void
  ) {
    const title = `Adobe Preview — ${path.basename(documentUri.fsPath)}`;
    const localResourceRoots: vscode.Uri[] = [
      context.extensionUri,
      vscode.Uri.joinPath(context.extensionUri, 'assets'),
      vscode.Uri.joinPath(context.extensionUri, 'media'),
      ...previewResourceRootFsPaths(documentUri.fsPath).map((p) =>
        vscode.Uri.file(p)
      ),
    ];
    this.panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      title,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots,
      }
    );

    const previewDiagnosticMode = vscode.workspace
      .getConfiguration()
      .get<boolean>('adobeExl.preview.diagnosticMode', false);
    this.panel.webview.html = buildPreviewHtml(
      this.panel.webview,
      context.extensionUri,
      { diagnosticMode: previewDiagnosticMode }
    );

    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((msg) => this.onMessage(msg))
    );

    this.disposables.push(
      this.panel.onDidDispose(() => {
        this.disposeInternal();
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() !== documentUri.toString()) {
          return;
        }
        if (this._debounce) {
          clearTimeout(this._debounce);
        }
        this._debounce = setTimeout(() => void this.refresh(), 250);
      })
    );
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside, false);
  }

  async refresh(): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(this.documentUri);
    const md = createAdobeMarkdownIt(doc.uri.fsPath);
    const markdownForPreview = stripYamlFrontmatterForPreview(doc.getText());
    let body = md.render(markdownForPreview);
    body = stripHeadingPermalinkAnchors(body);
    body = rewriteHtmlLocalResources(body, doc.uri.fsPath, this.panel.webview);
    this.postContent(body);
  }

  private postContent(html: string): void {
    if (!this._webviewReady) {
      this._pendingBody = html;
      return;
    }
    void this.panel.webview.postMessage({
      type: 'updateContent',
      body: html,
    });
  }

  private onMessage(msg: {
    type?: string;
    href?: string;
    reason?: string;
    data?: unknown;
  }): void {
    if (msg.type === 'previewDiagnostics') {
      const reason = typeof msg.reason === 'string' ? msg.reason : 'unknown';
      const payload =
        msg.data !== undefined ? JSON.stringify(msg.data, null, 2) : '{}';
      output.appendLine(`[Adobe Preview] diagnostics (${reason}):\n${payload}`);
      output.show(true);
      return;
    }
    if (msg.type === 'ready') {
      this._webviewReady = true;
      if (this._pendingBody !== null) {
        const b = this._pendingBody;
        this._pendingBody = null;
        void this.panel.webview.postMessage({ type: 'updateContent', body: b });
      } else {
        void this.refresh();
      }
      return;
    }
    if (msg.type === 'openLink' && msg.href) {
      void this.openLocalLink(msg.href);
    }
  }

  private async openLocalLink(href: string): Promise<void> {
    const roots = previewResourceRootFsPaths(this.documentUri.fsPath);
    const abs = resolveLocalPath(
      this.documentUri.fsPath,
      href,
      roots
    );
    if (!abs) {
      void vscode.window.showWarningMessage(`Could not resolve link: ${href}`);
      return;
    }
    try {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(abs)
      );
      await vscode.window.showTextDocument(doc, {
        preview: true,
        viewColumn: vscode.ViewColumn.One,
      });
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      void vscode.window.showErrorMessage(`Could not open: ${m}`);
    }
  }

  dispose(): void {
    this.panel.dispose();
  }

  private disposeInternal(): void {
    if (this._debounce) {
      clearTimeout(this._debounce);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
    this.onDispose();
  }
}
