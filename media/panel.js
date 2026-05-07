  const vscode = acquireVsCodeApi();
  let _pollInterval = null;

  function refresh() { vscode.postMessage({ command: 'refresh' }); }
  function autoFix() { vscode.postMessage({ command: 'autoFix' }); }
  function pushCheck() {
    vscode.postMessage({ command: 'pushCheck' });
  }
  function commitAndPush() { vscode.postMessage({ command: 'commitAndPush' }); }
  function applyFixes() { vscode.postMessage({ command: 'applyFixes' }); }

  function openUrl(url) {
    vscode.postMessage({ command: 'openUrl', url });
  }

  function switchTab(tab) {
    document.querySelectorAll('.sp-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  }

  /** Tab + primary actions without inline onclick (strict CSP script-src works in VS Code and Cursor). */
  (function wirePanelChrome() {
    const root = document.getElementById('mainPanel');
    if (!root) return;
    root.addEventListener('click', function (e) {
      const tabBtn = e.target.closest('.sp-tab');
      if (tabBtn && tabBtn.dataset.tab) {
        switchTab(tabBtn.dataset.tab);
        return;
      }
      const act = e.target.closest('[data-exl-action]');
      if (!act) return;
      const a = act.getAttribute('data-exl-action');
      if (a === 'pushCheck') pushCheck();
      else if (a === 'autoFix') autoFix();
      else if (a === 'commitAndPush') commitAndPush();
    });
  })();

  function formatDuration(ms) {
    if (!ms) return '';
    const s = Math.round(ms / 1000);
    return s > 60 ? Math.floor(s / 60) + 'm ' + (s % 60) + 's' : s + 's';
  }

  function formatAgo(startTime) {
    if (!startTime) return '';
    const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    return Math.floor(diff / 3600) + 'h ago';
  }

  function badgeClass(result) {
    if (result === 'QUEUED')   return 'badge-queued';
    if (result === 'RUNNING')  return 'badge-running';
    if (result === 'SUCCESS')  return 'badge-success';
    if (result === 'FAILURE' || result === 'UNSTABLE') return 'badge-failure';
    return 'badge-aborted';
  }

  function renderHistory(history, queue) {
    if (!history || history.length === 0) {
      return '<span class="empty">No build history.</span>';
    }
    let html = '';
    if (queue) {
      html += '<div class="build-row"><span class="build-num">—</span><span class="badge badge-queued">QUEUED</span><span class="build-meta">' + escHtml(queue.why) + '</span></div>';
    }
    for (const run of history) {
      const result = run.result || 'ABORTED';
      const bc = badgeClass(result);
      html += '<div class="build-row">';
      html += '<span class="build-num">#' + escHtml(String(run.id || '')) + '</span>';
      html += '<span class="badge ' + bc + '">' + result + '</span>';
      html += '<span class="build-meta">' + formatAgo(run.startTime) + (run.durationInMillis ? ' · ' + formatDuration(run.durationInMillis) : '') + '</span>';
      html += '</div>';
    }
    return html;
  }

  function renderErrors(summary) {
    if (!summary || (!summary.errors.length && !summary.unparsed.length)) {
      return '<span class="empty">No errors from recent builds.</span>';
    }
    const hasCI = summary.runId > 0;
    let html = hasCI
      ? '<div class="exl-run-label">Run #' + summary.runId + '</div>'
      : '';

    // Parsed link errors
    for (const err of summary.errors) {
      const rowClass = 'error-row';
      const checkmark = '';
      const isLocal = err.source === 'local';
      html += '<div class="' + rowClass + '" data-file="' + escAttr(err.filepath) + '" data-line="' + escAttr(err.lineno) + '">';
      html += '<span class="error-file open-file" data-file="' + escAttr(err.filepath) + '" data-line="' + err.lineno + '">' + escHtml(err.filepath) + ':' + err.lineno + checkmark + '</span>';
      if (isLocal) {
        html += ' <span class="fix-badge fix-badge-local">local</span>';
      }
      if (err.rule) { html += ' <span class="error-rule">' + escHtml(err.rule) + '</span>'; }
      if (err.active) {
        if (err.fixStatus === 'path-fix') {
          const candidate = (err.fixCandidates && err.fixCandidates[0]) ? err.fixCandidates[0] : '';
          html += ' <span class="fix-badge fix-path">path fix</span>'
            + ' <button class="fix-action-btn fix-action-apply"'
            + ' data-action="path-fix" data-file="' + escAttr(err.filepath) + '"'
            + ' data-line="' + escAttr(err.lineno) + '" data-candidate="' + escAttr(candidate) + '"'
            + ' data-target="' + escAttr(err.target) + '">✓ Apply</button>';
        } else if (err.fixStatus === 'delink') {
          html += ' <span class="fix-badge fix-delink">de-link</span>'
            + ' <button class="fix-action-btn fix-action-delink"'
            + ' data-action="delink" data-file="' + escAttr(err.filepath) + '"'
            + ' data-line="' + escAttr(err.lineno) + '" data-candidate="" data-target="' + escAttr(err.target) + '">✗ De-link</button>';
        } else if (err.fixStatus === 'ambiguous') {
          html += ' <span class="fix-badge fix-ambiguous">ambiguous</span>';
        }
      }
      if (err.reason) { html += '<div class="error-reason">' + escHtml(err.reason) + '</div>'; }
      if (err.active && err.proposedFix) {
        // For rules that aren't path-fix/delink, show an Apply button inline with the diff
        var needsApplyBtn = err.fixStatus !== 'path-fix' && err.fixStatus !== 'delink';
        html += '<div class="diff-pre">'
          + '<span class="diff-del">- ' + escHtml(err.proposedFix.before.trimEnd()) + '</span>'
          + '<span class="diff-add">+ ' + escHtml(err.proposedFix.after.trimEnd()) + '</span>'
          + (needsApplyBtn
            ? ' <button class="fix-action-btn fix-action-apply"'
              + ' data-action="markdown-fix" data-file="' + escAttr(err.filepath) + '"'
              + ' data-line="' + escAttr(err.lineno) + '" data-candidate="" data-target="">✓ Apply</button>'
            : '')
          + '</div>';
      }
      html += '</div>';
    }

    // Raw stage failure lines (linting, test failures, etc.)
    if (summary.unparsed.length) {
      if (summary.errors.length) {
        html += '<div class="exl-divider"></div>';
      }
      let lastStage = '';
      for (const u of summary.unparsed) {
        if (u.stage !== lastStage) {
          lastStage = u.stage;
          const stageLabel = u.loglink
            ? '<span class="open-url" data-url="' + escAttr(u.loglink) + '">' + escHtml(u.stage) + '</span>'
            : escHtml(u.stage);
          html += '<div class="exl-stage-label">' + stageLabel + '</div>';
        }
        html += '<div class="error-row error-row-raw">' + escHtml(u.line) + '</div>';
      }
    }

    return html;
  }

  function updatePipelineStep(iconId, statusId, history) {
    const iconEl = document.getElementById(iconId);
    const statusEl = document.getElementById(statusId);
    if (!iconEl || !statusEl) { return; }
    if (!history || history.length === 0) {
      iconEl.textContent = '○'; iconEl.className = 'pipeline-icon icon-neutral';
      statusEl.textContent = 'no builds yet'; return;
    }
    const latest = history[0];
    const result = latest.result || (latest.state === 'RUNNING' ? 'RUNNING' : 'UNKNOWN');
    const ago = formatAgo(latest.startTime);
    if (result === 'SUCCESS') {
      iconEl.textContent = '✓'; iconEl.className = 'pipeline-icon icon-success';
      statusEl.textContent = 'passed ' + ago;
    } else if (result === 'FAILURE' || result === 'UNSTABLE') {
      iconEl.textContent = '✗'; iconEl.className = 'pipeline-icon icon-failure';
      statusEl.textContent = 'failed ' + ago;
    } else if (result === 'RUNNING') {
      iconEl.textContent = '●'; iconEl.className = 'pipeline-icon icon-running';
      statusEl.textContent = 'running…';
    } else {
      iconEl.textContent = '○'; iconEl.className = 'pipeline-icon icon-neutral';
      statusEl.textContent = result.toLowerCase() + ' ' + ago;
    }
  }

  function escAttr(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  }

  // Delegated click handler for all .open-file elements (avoids inline onclick quote issues)
  document.addEventListener('click', function(e) {
    const el = e.target.closest('.open-file');
    if (!el) return;
    const filepath = el.dataset.file;
    const line = parseInt(el.dataset.line) || 0;
    if (filepath) vscode.postMessage({ command: 'openFile', filepath, line });
  });

  document.addEventListener('click', function(e) {
    const el = e.target.closest('.open-url');
    if (!el || !el.dataset.url) return;
    openUrl(el.dataset.url);
  });

  // Delegated click handler for Apply / De-link fix buttons
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.fix-action-btn');
    if (!btn || btn.disabled) { return; }
    btn.disabled = true;
    btn.textContent = '…';
    vscode.postMessage({
      command: 'applyOneFix',
      action:    btn.dataset.action,
      filepath:  btn.dataset.file,
      lineno:    parseInt(btn.dataset.line) || 0,
      candidate: btn.dataset.candidate || '',
      target:    btn.dataset.target || '',
    });
  });

  function appendLog(text, isError) {
    const el = document.getElementById('buildLog');
    const div = document.createElement('div');
    if (isError) div.className = 'log-error';
    div.textContent = text;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  window.addEventListener('message', event => {
    const msg = event.data;
    try {
    switch (msg.type) {
      case 'loading':
        break;

      case 'banner': {
        const b = document.getElementById('bannerError');
        b.textContent = msg.text || '';
        b.style.display = msg.text ? 'block' : 'none';
        break;
      }

      case 'statusData': {
        document.getElementById('repoInfo').textContent = (msg.repo || '?') + '  ·  ' + (msg.branch || '?');
        document.getElementById('buildHistory').innerHTML = renderHistory(msg.runs, null);
        document.getElementById('errorList').innerHTML = renderErrors(msg.summary);
        document.getElementById('pipelineBranch').textContent = msg.branch || '—';
        updatePipelineStep('reviewBuildIcon', 'pipelineReviewStatus', msg.runs);
        const latestResult = msg.runs && msg.runs[0] ? msg.runs[0].result : null;
        const hasErrors = msg.summary && (msg.summary.errors.length > 0 || msg.summary.unparsed.length > 0);
        const errCount = hasErrors ? (msg.summary.errors.length || 0) + (msg.summary.unparsed.length || 0) : 0;
        const errHeading = document.getElementById('errorsHeading');
        if (errHeading) { errHeading.textContent = errCount > 0 ? `Errors (${errCount})` : 'Errors'; }
        const isActive = latestResult === 'RUNNING' || latestResult === 'QUEUED';
        if (isActive && !_pollInterval) {
          _pollInterval = setInterval(() => refresh(), 10000);
        } else if (!isActive && _pollInterval) {
          clearInterval(_pollInterval);
          _pollInterval = null;
        }
        break;
      }

      case 'log':
        appendLog(msg.text, false);
        break;

      case 'error':
        appendLog(msg.text, true);
        break;

      case 'buildStarted':
        document.getElementById('progressWrap').style.display = 'block';
        document.getElementById('progressFill').style.width = '0%';
        // Update Status tab pipeline icon immediately
        document.getElementById('reviewBuildIcon').textContent = '●';
        document.getElementById('reviewBuildIcon').className = 'pipeline-icon icon-running';
        document.getElementById('pipelineReviewStatus').textContent = 'build #' + msg.buildNum + ' running…';
        document.getElementById('buildHistory').innerHTML =
          '<div class="build-row"><span class="build-num">#' + escHtml(String(msg.buildNum || '')) + '</span>'
          + '<span class="badge badge-running">RUNNING</span></div>'
          + (document.getElementById('buildHistory').innerHTML || '');
        break;

      case 'buildProgress': {
        const pct = Math.min(99, Math.round((msg.elapsed / msg.estSecs) * 100));
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('etaRow').textContent = msg.elapsed + 's elapsed  ' + msg.etaStr;
        document.getElementById('pipelineReviewStatus').textContent = 'running…';
        break;
      }

      case 'buildDone': {
        const success = msg.result === 'SUCCESS';
        document.getElementById('reviewBuildIcon').textContent = success ? '✓' : '✗';
        document.getElementById('reviewBuildIcon').className = 'pipeline-icon ' + (success ? 'icon-success' : 'icon-failure');
        document.getElementById('pipelineReviewStatus').textContent = 'build #' + msg.buildNum + ' ' + msg.result.toLowerCase();
        setTimeout(() => { document.getElementById('progressWrap').style.display = 'none'; }, 2000);
        break;
      }

      case 'switchTab':
        switchTab(msg.tab);
        break;

      case 'fixApplied': {
        const row = document.querySelector(
          '.error-row[data-file="' + CSS.escape(msg.filepath) + '"][data-line="' + CSS.escape(String(msg.lineno)) + '"]'
        );
        if (row) {
          row.querySelectorAll('.fix-action-btn').forEach(b => b.remove());
          const diffEl = row.querySelector('.diff-pre');
          if (diffEl) { diffEl.remove(); }
          row.style.opacity = '0.45';
        }
        break;
      }

      case 'commitDone':
        appendLog('Committed and pushed. Monitoring CI…', false);
        break;

      case 'fixFilesStarting': {
        const fc = document.getElementById('fixCards');
        fc.innerHTML = '';
        fc.style.display = 'block';
        for (const file of (msg.files || [])) {
          const card = document.createElement('div');
          card.className = 'fix-card';
          card.id = 'fc-' + btoa(file).replace(/[^a-z0-9]/gi, '_');
          card.dataset.file = file;
          card.dataset.fixes = '0';
          card.dataset.notfound = '0';
          card.innerHTML =
            '<div class="fix-card-row">'
            + '<span class="fix-card-icon"><span class="fix-spinner"></span></span>'
            + '<span class="fix-card-file">' + escHtml(file) + '</span>'
            + '</div>';
          fc.appendChild(card);
        }
        break;
      }

      case 'actionResult': {
        const cardId = 'fc-' + btoa(msg.file || '').replace(/[^a-z0-9]/gi, '_');
        const card = document.getElementById(cardId);
        if (!card) break;
        if (msg.type === 'fix') {
          card.dataset.fixes = String(parseInt(card.dataset.fixes || '0') + 1);
        } else if (msg.type === 'notfound') {
          card.dataset.notfound = String(parseInt(card.dataset.notfound || '0') + 1);
          const detail = document.createElement('div');
          detail.className = 'fix-card-detail';
          detail.textContent = '✗ ' + (msg.find || '');
          card.appendChild(detail);
        }
        break;
      }

      case 'fixDone': {
        const changed = new Set(msg.changed || []);
        document.querySelectorAll('.fix-card').forEach(card => {
          const file = card.dataset.file || '';
          const fixes = parseInt(card.dataset.fixes || '0');
          const notfound = parseInt(card.dataset.notfound || '0');
          const row = card.querySelector('.fix-card-row');
          const iconEl = card.querySelector('.fix-card-icon');
          if (fixes > 0 && notfound === 0) {
            iconEl.textContent = '✓';
            iconEl.style.color = '#66bb6a';
            row.innerHTML = '<span class="fix-card-icon" style="color:#66bb6a">✓</span>'
              + '<span class="fix-card-file">' + escHtml(file) + '</span>'
              + '<span class="fix-card-badge fix-card-badge-fixed">' + fixes + ' fixed</span>';
          } else if (notfound > 0) {
            row.innerHTML = '<span class="fix-card-icon" style="color:#ef5350">✗</span>'
              + '<span class="fix-card-file">' + escHtml(file) + '</span>'
              + (fixes > 0 ? '<span class="fix-card-badge fix-card-badge-fixed">' + fixes + ' fixed</span>' : '')
              + '<span class="fix-card-badge fix-card-badge-fail">' + notfound + ' not found</span>';
          } else {
            row.innerHTML = '<span class="fix-card-icon exl-muted">·</span>'
              + '<span class="fix-card-file exl-muted">' + escHtml(file) + '</span>'
              + '<span class="fix-card-badge fix-card-badge-neutral">no changes</span>';
          }
        });
        break;
      }
    }
    } catch(e) {
      const b = document.getElementById('bannerError');
      if (b) { b.textContent = 'UI error (' + msg.type + '): ' + e.message; b.style.display = 'block'; }
    }
  });
