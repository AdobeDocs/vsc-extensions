/**
 * Client-side Prism syntax highlighting for Adobe Preview (custom webview)
 * and legacy VS Code built-in markdown preview if scripts are injected there.
 * Re-run after content updates via CustomEvent or vscode.markdown.updateContent.
 *
 * For languages not explicitly bundled, falls back to the `clike` grammar
 * (covers C-like syntax: keywords, strings, comments, numbers) so the block
 * still gets token colors rather than plain silver text.
 */
(function () {
  'use strict';

  function highlightAll() {
    if (typeof Prism === 'undefined') { return; }
    document.querySelectorAll('pre code[class*="language-"]').forEach(function (block) {
      // Skip blocks already tokenized by Prism this cycle
      if (block.querySelector('.token')) { return; }

      // VS Code's built-in highlight.js runs on common languages (json, js, etc.)
      // and outputs .hljs-* spans. Strip those before Prism runs so Prism sees
      // plain text — our Prism CSS uses .token classes, not .hljs-* classes.
      if (block.classList.contains('hljs')) {
        block.textContent = block.textContent;
      }

      // Resolve the declared language; fall back to clike for unknowns
      var cls = Array.prototype.find.call(block.classList, function (c) {
        return c.startsWith('language-');
      });
      if (cls) {
        var lang = cls.slice('language-'.length);
        if (!Prism.languages[lang] && Prism.languages.clike) {
          block.classList.add('language-clike');
        }
      }

      Prism.highlightElement(block);
    });
  }

  // Build interactive tabs from >[!BEGINTABS]/>[!TAB]/>[!ENDTABS] markers.
  // The core rule emits .exl-tab-start markers inside a .exl-tabs container;
  // this function restructures that flat HTML into labelled panels.
  function initTabs() {
    document.querySelectorAll('.exl-tabs').forEach(function (container) {
      var starts = container.querySelectorAll('.exl-tab-start');
      if (!starts.length) { return; }

      var tabEnd = container.querySelector('.exl-tab-end');
      // Bail if there is no closing marker — prevents runaway node collection
      // when the DOM was already restructured and exl-tab-end was removed.
      if (!tabEnd) { return; }

      var tabs = [];

      starts.forEach(function (start, idx) {
        var title = start.getAttribute('data-title') || ('Tab ' + (idx + 1));
        var nodes = [];
        var cursor = start.nextSibling;
        var boundary = idx < starts.length - 1 ? starts[idx + 1] : tabEnd;
        while (cursor && cursor !== boundary) {
          var next = cursor.nextSibling;
          nodes.push(cursor);
          cursor = next;
        }
        tabs.push({ title: title, nodes: nodes });
      });

      // Build labels row
      var labelsDiv = document.createElement('div');
      labelsDiv.className = 'exl-tab-labels';

      // Build panels
      var panels = tabs.map(function (tab, idx) {
        var panel = document.createElement('div');
        panel.className = 'exl-tab-panel' + (idx === 0 ? ' active' : '');
        panel.setAttribute('data-panel', String(idx));
        tab.nodes.forEach(function (n) { panel.appendChild(n); });
        return panel;
      });

      tabs.forEach(function (tab, idx) {
        var btn = document.createElement('button');
        btn.className = 'exl-tab-label' + (idx === 0 ? ' active' : '');
        btn.textContent = tab.title;
        btn.setAttribute('data-panel', String(idx));
        btn.addEventListener('click', function () {
          container.querySelectorAll('.exl-tab-label').forEach(function (b) { b.classList.remove('active'); });
          container.querySelectorAll('.exl-tab-panel').forEach(function (p) { p.classList.remove('active'); });
          btn.classList.add('active');
          panels[idx].classList.add('active');
        });
        labelsDiv.appendChild(btn);
      });

      // Replace container contents with the structured tab UI
      container.innerHTML = '';
      container.appendChild(labelsDiv);
      panels.forEach(function (p) { container.appendChild(p); });
    });
  }

  // Initial highlight and tab init on load
  highlightAll();
  initTabs();

  // Re-run when VS Code refreshes the preview content.
  // VS Code fires the 'vscode.markdown.updateContent' custom DOM event after
  // it injects new HTML — this is the correct hook for preview scripts.
  window.addEventListener('vscode.markdown.updateContent', function () {
    highlightAll();
    initTabs();
  });

  window.addEventListener('adobe-preview-content-updated', function () {
    highlightAll();
    initTabs();
  });
}());
