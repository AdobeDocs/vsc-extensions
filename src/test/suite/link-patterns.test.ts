import * as assert from 'assert';
import { EXL_LINK_PATTERNS, tryFixUrl } from '../../services/link-patterns';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Find a pattern by id — throws if missing so test failures are obvious. */
function pat(id: string) {
  const p = EXL_LINK_PATTERNS.find(p => p.id === id);
  if (!p) { throw new Error(`Pattern '${id}' not found`); }
  return p;
}

// Dummy paths — only used for patterns that require sourceFile / repoRoot.
// Patterns under test here are pure (no fs calls), so the values don't matter.
const SRC  = '/repo/help/rest-api/authentication.md';
const ROOT = '/repo';

// ─── external-trailing-slash ──────────────────────────────────────────────────

suite('external-trailing-slash', () => {
  const p = pat('external-trailing-slash');

  test('detects external URL ending with /', () => {
    assert.ok(p.detect('https://example.com/page/'));
  });

  test('detects external URL with trailing slash before fragment', () => {
    assert.ok(p.detect('https://example.com/page/#anchor'));
  });

  test('does not detect external URL without trailing slash', () => {
    assert.ok(!p.detect('https://example.com/page'));
  });

  test('does not detect internal URL', () => {
    assert.ok(!p.detect('../some/page/'));
  });

  test('strips trailing slash', () => {
    assert.strictEqual(p.fix('https://example.com/page/', SRC, ROOT), 'https://example.com/page');
  });

  test('strips trailing slash, preserves fragment', () => {
    assert.strictEqual(
      p.fix('https://example.com/page/#anchor', SRC, ROOT),
      'https://example.com/page#anchor'
    );
  });
});

// ─── marketo-api-old-redocly ──────────────────────────────────────────────────
//
// Old Redocly paths use #operation/<operationId> (no tag segment).
// These are broken in the current SPA — the old fragment format is not
// recognised. Fix: strip the old fragment, leave just the base # so the
// SPA at least loads the root of that API spec.

suite('marketo-api-old-redocly', () => {
  const p = pat('marketo-api-old-redocly');

  test('detects #operation/ fragment on marketo-apis URL', () => {
    assert.ok(p.detect('https://developer.adobe.com/marketo-apis/api/mapi#operation/SubmitFormUsingPOST'));
  });

  test('detects #operation/ fragment with trailing slash before hash (link checker form)', () => {
    assert.ok(p.detect('https://developer.adobe.com/marketo-apis/api/mapi/#operation/SubmitFormUsingPOST'));
  });

  test('does not detect #tag/ fragment (new Redocly format — those are handled separately)', () => {
    assert.ok(!p.detect('https://developer.adobe.com/marketo-apis/api/user#tag/User-Management/operation/getUserUsingGET'));
  });

  test('does not detect non-marketo-apis URL', () => {
    assert.ok(!p.detect('https://example.com/api/page#operation/foo'));
  });

  test('fixes to base URL with bare # (strips old operation fragment)', () => {
    assert.strictEqual(
      p.fix('https://developer.adobe.com/marketo-apis/api/mapi#operation/SubmitFormUsingPOST', SRC, ROOT),
      'https://developer.adobe.com/marketo-apis/api/mapi#'
    );
  });

  test('fixes link-checker form (slash before hash) to base URL with bare #', () => {
    assert.strictEqual(
      p.fix('https://developer.adobe.com/marketo-apis/api/mapi/#operation/SubmitFormUsingPOST', SRC, ROOT),
      'https://developer.adobe.com/marketo-apis/api/mapi#'
    );
  });
});

// ─── marketo-api-spa (suppress) ───────────────────────────────────────────────
//
// New Redocly paths use #tag/<tag>/operation/<operationId>.
// These are valid SPA routes that work in the browser. The link checker
// cannot verify them (it strips the hash before requesting). Suppress silently.
//
// Base URLs (no fragment) also redirect through # but the files are already
// correct — these show as "already correct" and need no pattern.

suite('marketo-api-spa suppress', () => {
  const p = pat('marketo-api-spa');

  test('is marked suppress', () => {
    assert.ok(p.suppress);
  });

  test('detects #tag/ fragment on marketo-apis URL', () => {
    assert.ok(p.detect('https://developer.adobe.com/marketo-apis/api/user#tag/User-Management/operation/getUserUsingGET'));
  });

  test('detects #tag/ fragment with trailing slash before hash (link checker form)', () => {
    assert.ok(p.detect('https://developer.adobe.com/marketo-apis/api/user/#tag/User-Management/operation/getUserUsingGET'));
  });

  test('does not detect #operation/ fragment (that is handled by marketo-api-old-redocly)', () => {
    assert.ok(!p.detect('https://developer.adobe.com/marketo-apis/api/mapi#operation/SubmitFormUsingPOST'));
  });

  test('does not detect non-marketo-apis URL', () => {
    assert.ok(!p.detect('https://example.com/api/user#tag/foo'));
  });
});

// ─── tryFixUrl integration ────────────────────────────────────────────────────

suite('tryFixUrl', () => {

  test('returns suppressed for new-format marketo-apis deep link', () => {
    const result = tryFixUrl(
      'https://developer.adobe.com/marketo-apis/api/user/#tag/User-Management/operation/getUserUsingGET',
      SRC, ROOT
    );
    assert.ok(result && 'suppressed' in result, 'expected suppressed result');
  });

  test('returns fix for old-format marketo-apis deep link', () => {
    const result = tryFixUrl(
      'https://developer.adobe.com/marketo-apis/api/mapi#operation/SubmitFormUsingPOST',
      SRC, ROOT
    );
    assert.ok(result && 'fixedUrl' in result, 'expected fixedUrl result');
    assert.strictEqual((result as any).fixedUrl, 'https://developer.adobe.com/marketo-apis/api/mapi#');
  });

  test('old-redocly pattern takes precedence over external-trailing-slash', () => {
    // Link checker form: slash before hash
    const result = tryFixUrl(
      'https://developer.adobe.com/marketo-apis/api/mapi/#operation/SubmitFormUsingPOST',
      SRC, ROOT
    );
    assert.ok(result && 'fixedUrl' in result);
    assert.strictEqual((result as any).patternId, 'marketo-api-old-redocly');
    assert.strictEqual((result as any).fixedUrl, 'https://developer.adobe.com/marketo-apis/api/mapi#');
  });

  test('returns null for unknown URL', () => {
    const result = tryFixUrl('https://completely-unknown.example.com/page', SRC, ROOT);
    assert.strictEqual(result, null);
  });
});
