/**
 * Adobe Preview webview bootstrap: content updates, link clicks, ready handshake.
 */
(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const root = document.getElementById('adobe-preview-root');
  if (!root) {
    function signalReadyEarly() {
      vscode.postMessage({ type: 'ready' });
    }
    if (document.readyState === 'complete') {
      signalReadyEarly();
    } else {
      window.addEventListener('load', signalReadyEarly);
    }
    return;
  }

  function collectDiagnostics() {
    var body = document.querySelector('.vscode-body') || document.body;
    var sampleCode = document.querySelector('#adobe-preview-root code');
    var bodyStyle = body ? getComputedStyle(body) : null;
    var codeStyle = sampleCode ? getComputedStyle(sampleCode) : null;
    var faces = [];
    try {
      faces = Array.from(document.fonts).map(function (f) {
        return {
          family: f.family,
          status: f.status,
          weight: f.weight,
          style: f.style,
        };
      });
    } catch (e) {
      faces = [{ error: String(e) }];
    }
    var links = Array.prototype.map.call(
      document.querySelectorAll('link[rel="stylesheet"]'),
      function (l) {
        return l.href;
      }
    );
    return {
      bodyFontFamily: bodyStyle ? bodyStyle.fontFamily : null,
      codeFontFamily: codeStyle ? codeStyle.fontFamily : null,
      fontFaceCount: faces.length,
      fontFaces: faces,
      stylesheetHrefs: links,
    };
  }

  function sendDiagnostics(reason) {
    if (document.documentElement.dataset.diagnostics !== 'true') {
      return;
    }
    function post() {
      vscode.postMessage({
        type: 'previewDiagnostics',
        reason: reason,
        data: collectDiagnostics(),
      });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(post).catch(post);
    } else {
      setTimeout(post, 0);
    }
  }

  window.addEventListener('message', function (event) {
    const data = event.data;
    if (data && data.type === 'updateContent' && typeof data.body === 'string') {
      root.innerHTML = data.body;
      window.dispatchEvent(new CustomEvent('adobe-preview-content-updated'));
      sendDiagnostics('updateContent');
    }
  });

  root.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) {
      return;
    }
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) {
      return;
    }
    if (/^https?:/i.test(href)) {
      return;
    }
    if (/^mailto:/i.test(href)) {
      return;
    }
    e.preventDefault();
    vscode.postMessage({ type: 'openLink', href: href });
  });

  function signalReady() {
    vscode.postMessage({ type: 'ready' });
    sendDiagnostics('initialLoad');
  }
  if (document.readyState === 'complete') {
    signalReady();
  } else {
    window.addEventListener('load', signalReady);
  }
}());
