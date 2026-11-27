/* ============================================================================
 * Ghazlan Roleplay UX & GIF Tray Upgrade (www/roleplay-ux.js)
 *  1) Fixes stacked/overlapping GIF tiles & makes #mediaTray expandable upward
 *     (56vh default -> 78vh expanded, clean 2-column fixed-height grid)
 *  2) Action & Dialogue Color Mode (like classic RP):
 *     - Actions/expressions inside (...) or *...* rendered in distinct soft
 *       italic color (customizable), spoken dialogue in bright crisp text
 *     - Prompt hook instructing character to describe posture/expressions
 *  3) Per-message 🔊 TTS speaker button & ⭐ Bookmark favorite moments
 *  4) Quick Action Chips for the user + Pinned Scene Context Bar
 * ============================================================================ */
(() => {
  const ACTION_COLORS = [
    { id: 'silver', label: 'فضي ناعم', hex: '#a6b1c2' },
    { id: 'gold', label: 'ذهبي دافئ', hex: '#e6c67c' },
    { id: 'violet', label: 'بنفسجي هادئ', hex: '#c8a6ff' },
    { id: 'rose', label: 'وردي ناعم', hex: '#f4a8c4' },
    { id: 'mint', label: 'نعناعي هادئ', hex: '#8ee0c6' },
  ];

  const QUICK_ACTIONS = [
    '(أبتسم بهدوء)',
    '(أرتشف من قهوتي)',
    '(أنظر إليكِ بجدية)',
    '(أضحك بخفة)',
    '(أتنهد بهدوء)',
    '(أرفع حاجبي باستغراب)',
  ];

  let rpCfg = loadJSON('rp_roleplay_ux_v1', {
    enabled: true,
    colorHex: '#a6b1c2',
    showQuickActions: true,
    sceneText: '',
    bookmarks: [], // { id, charName, text, ts }
  });

  const saveRp = () => store.set('rp_roleplay_ux_v1', JSON.stringify({
    ...rpCfg,
    bookmarks: (rpCfg.bookmarks || []).slice(0, 80),
  }));

  // ---- 1. CSS: Fix GIF Tray Stacking + Expandable Height + RP Action Coloring ----
  const css = document.createElement('style');
  css.id = 'roleplay-ux-css';
  css.textContent = `
    :root { --rp-action-color: ${rpCfg.colorHex || '#a6b1c2'}; }

    /* FIX: Non-overlapping, spacious, upward-expanding GIF & Media Tray */
    #mediaTray.open {
      height: 56vh !important;
      max-height: 56vh !important;
      display: flex !important;
      flex-direction: column !important;
      transition: height .2s ease;
    }
    #mediaTray.open.p-expanded {
      height: 78vh !important;
      max-height: 78vh !important;
    }
    #mediaTray .tray-grid.gifs {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      grid-auto-rows: 124px !important;
      gap: 8px !important;
      padding: 6px !important;
      overflow-y: auto !important;
      align-content: start !important;
      flex: 1 1 auto !important;
      min-height: 0 !important;
    }
    #mediaTray .gif-tile {
      aspect-ratio: auto !important;
      height: 124px !important;
      min-height: 124px !important;
      width: 100% !important;
      position: relative !important;
      border-radius: 12px !important;
      overflow: hidden !important;
      background: var(--card) !important;
    }
    #mediaTray .gif-tile img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
    }

    /* Roleplay Action vs Spoken Dialogue Styling */
    .rp-action {
      color: var(--rp-action-color, #a6b1c2) !important;
      font-style: italic;
      font-weight: 400;
      opacity: 0.92;
    }
    .user-row .bubble .rp-action {
      color: rgba(255, 255, 255, 0.78) !important;
      font-style: italic;
    }
    .bot-row .bubble {
      color: #f6f7fb;
      line-height: 1.65;
    }

    /* Per-message tiny 🔊 TTS & ⭐ Bookmark buttons */
    .rp-msg-tools {
      display: inline-flex;
      gap: 4px;
      margin-top: 4px;
      align-items: center;
    }
    .rp-mini-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--border);
      color: var(--muted);
      border-radius: 99px;
      padding: 2px 7px;
      font-size: 11px;
      cursor: pointer;
    }
    .rp-mini-btn:active { transform: scale(.94); }

    /* Quick Action Chips above composer */
    .rp-quick-bar {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 4px 8px 2px;
      scrollbar-width: none;
    }
    .rp-quick-bar::-webkit-scrollbar { display: none; }
    .rp-qchip {
      flex-shrink: 0;
      font-size: 11px;
      padding: 4px 9px;
      border-radius: 99px;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--rp-action-color, #a6b1c2);
      font-style: italic;
      cursor: pointer;
    }

    /* Pinned Scene Context Bar */
    .rp-scene-bar {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 5px 10px;
      font-size: 11.5px;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid var(--border);
      color: var(--accent3);
    }
    .rp-scene-bar.show { display: flex; }
  `;
  document.head.appendChild(css);

  // ---- 2. Add Expand/Collapse Button to #mediaTray header ----
  const trayHead = document.querySelector('#mediaTray .tray-head');
  if (trayHead && !document.getElementById('rpExpandTrayBtn')) {
    const expBtn = document.createElement('button');
    expBtn.id = 'rpExpandTrayBtn';
    expBtn.className = 'del-chat';
    expBtn.title = 'توسيع/تصغير نافذة GIF';
    expBtn.textContent = '⬆️';
    expBtn.onclick = () => {
      const mt = document.getElementById('mediaTray');
      if (!mt) return;
      const isExp = mt.classList.toggle('p-expanded');
      expBtn.textContent = isExp ? '⬇️' : '⬆️';
    };
    trayHead.insertBefore(expBtn, trayHead.lastElementChild);
  }

  // ---- 3. Action & Dialogue Formatter (Overrides renderSimpleMd) ----
  window.renderSimpleMd = function (s) {
    let t = esc(s || '');
    // Bold first
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (rpCfg.enabled) {
      // Asterisk actions *...*
      t = t.replace(/\*([^*\n]+?)\*/g, '<span class="rp-action">($1)</span>');
      // Parentheses actions (...) — min 4 chars so tiny emojis/numbers aren't matched awkwardly
      t = t.replace(/\(([^()\n]{3,260})\)/g, '<span class="rp-action">($1)</span>');
    } else {
      t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    }
    return t.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  };

  // ---- 4. Prompt Hook: Instruct Character to Write Posture, Expressions & Movements ----
  const _origBuildRp = window.buildCharacterPrompt;
  if (typeof _origBuildRp === 'function') {
    window.buildCharacterPrompt = function (ch, groupChat = null) {
      let sys = _origBuildRp(ch, groupChat);
      if (rpCfg.enabled) {
        sys += `\n\n[أسلوب السرد والحركات والملامح]\n` +
          `عند كل رد، صِفي وضعيتك، ملامح وجهك، نظراتك، وحركاتك القصيرة عند تغيرها داخل قوسين مثل: (تبتسم بهدوء وتضع فنجان القهوة على الطاولة) في سطر مستقل، ثم اكتبي كلامك المنطوق بوضوح في السطر التالي خارج القوسين.\n` +
          `لا تضعي الكلام المنطوق أبداً داخل القوسين؛ القوسان مخصصان فقط للحركات والملامح والمشاعر الجسدية.`;
      }
      if (rpCfg.sceneText) {
        sys += `\n\n[المشهد المثبّت حالياً]\n${rpCfg.sceneText}`;
      }
      return sys;
    };
  }

  // ---- 5. Per-Message 🔊 Speaker + ⭐ Bookmark Buttons ----
  function speakDialogueOnly(rawText) {
    if (!('speechSynthesis' in window)) { showToast('القراءة الصوتية غير مدعومة في هذا المتصفح.'); return; }
    // Strip parenthetical actions so TTS reads the spoken dialogue naturally
    const spoken = String(rawText || '')
      .replace(/\([^()\n]{3,260}\)/g, ' ')
      .replace(/\*[^*\n]+?\*/g, ' ')
      .replace(/[*_`#]/g, '')
      .trim() || String(rawText || '');
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(spoken);
      u.lang = 'ar-DZ';
      u.rate = 1.0;
      window.speechSynthesis.speak(u);
      showToast('🔊 جاري قراءة الرد...');
    } catch {}
  }

  const _origRenderMsg = window.renderMessageNode;
  if (typeof _origRenderMsg === 'function') {
    window.renderMessageNode = function (m, idx, c) {
      const node = _origRenderMsg(m, idx, c);
      try {
        if (m && m.role === 'model' && node) {
          const textContent = m.raw || m.text || '';
          const col = node.querySelector('.msg-col');
          if (col && textContent && !col.querySelector('.rp-msg-tools')) {
            const tools = document.createElement('div');
            tools.className = 'rp-msg-tools';

            const spk = document.createElement('button');
            spk.className = 'rp-mini-btn';
            spk.title = 'استماع للرد';
            spk.textContent = '🔊';
            spk.onclick = (e) => { e.stopPropagation(); speakDialogueOnly(textContent); };

            const bm = document.createElement('button');
            bm.className = 'rp-mini-btn';
            bm.title = 'حفظ في أجمل اللحظات';
            bm.textContent = '⭐';
            bm.onclick = (e) => {
              e.stopPropagation();
              const ch = getChar(m.charId || c?.charId || 'ghazlan');
              rpCfg.bookmarks.unshift({ id: 'bm_' + Date.now(), charName: getDisplayName(ch), text: textContent.slice(0, 400), ts: Date.now() });
              saveRp();
              showToast('تم حفظ اللحظة في ⭐ أجمل اللحظات');
            };

            tools.appendChild(spk);
            tools.appendChild(bm);
            col.appendChild(tools);
          }
        }
      } catch {}
      return node;
    };
  }

  // ---- 6. Quick Action Chips above Composer ----
  const composerWrap = document.querySelector('#chatScreen footer .composer-wrap');
  const quickBar = document.createElement('div');
  quickBar.id = 'rpQuickBar';
  quickBar.className = 'rp-quick-bar';
  function renderQuickBar() {
    quickBar.style.display = (rpCfg.enabled && rpCfg.showQuickActions) ? 'flex' : 'none';
    quickBar.innerHTML = QUICK_ACTIONS.map((a) =>
      `<button class="rp-qchip" onclick="window.GhazlanRoleplay.insertAction('${esc(a)}')">${esc(a)}</button>`
    ).join('');
  }
  if (composerWrap) {
    composerWrap.parentNode.insertBefore(quickBar, composerWrap);
    renderQuickBar();
  }

  // ---- 7. Pinned Scene Context Bar at top of Chat ----
  const chatMain = document.getElementById('chat');
  const sceneBar = document.createElement('div');
  sceneBar.id = 'rpSceneBar';
  sceneBar.className = 'rp-scene-bar';
  function renderSceneBar() {
    if (rpCfg.sceneText) {
      sceneBar.classList.add('show');
      sceneBar.innerHTML = `<span>📍 <strong>المشهد:</strong> ${esc(rpCfg.sceneText)}</span><button class="rp-mini-btn" onclick="window.GhazlanRoleplay.openModal()">تعديل</button>`;
    } else {
      sceneBar.classList.remove('show');
    }
  }
  if (chatMain && chatMain.parentNode) {
    chatMain.parentNode.insertBefore(sceneBar, chatMain);
    renderSceneBar();
  }

  // ---- 8. Roleplay Controls Modal & Header Button (🎭) ----
  const rpModalBg = document.createElement('div');
  rpModalBg.id = 'rpModalBg';
  rpModalBg.className = 'modal-bg';
  rpModalBg.onclick = (e) => { if (e.target === rpModalBg) rpModalBg.classList.remove('open'); };
  rpModalBg.innerHTML = `<div class="modal" id="rpModalBody"></div>`;
  document.body.appendChild(rpModalBg);

  function openRpModal() {
    const body = document.getElementById('rpModalBody');
    body.innerHTML = `
      <h3>🎭 وضع السرد والحركات والمشهد
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="document.getElementById('rpModalBg').classList.remove('open')">✕</button>
      </h3>
      <div class="sec-box">
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:8px">
          <input type="checkbox" ${rpCfg.enabled ? 'checked' : ''} onchange="window.GhazlanRoleplay.toggleEnabled(this.checked)" />
          تفعيل وصف الحركات والملامح بلون مميز (...)
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer;margin-bottom:8px">
          <input type="checkbox" ${rpCfg.showQuickActions ? 'checked' : ''} onchange="window.GhazlanRoleplay.toggleQuick(this.checked)" />
          إظهار أزرار الحركات السريعة فوق الكتابة
        </label>
        <div style="font-size:12px;color:var(--muted);margin-bottom:5px">لون الحركات والملامح:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${ACTION_COLORS.map((c) => `
            <button class="btn-chip" style="border-color:${rpCfg.colorHex === c.hex ? c.hex : 'var(--border)'};color:${c.hex}" onclick="window.GhazlanRoleplay.setColor('${c.hex}')">● ${c.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="sec-box">
        <div class="sec-title"><span>📍 بطاقة المشهد المثبّتة</span></div>
        <div class="row-gap">
          <input id="rpSceneInp" style="flex:1;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" value="${esc(rpCfg.sceneText || '')}" placeholder="مثلاً: ☕ المقهى الهادئ • مساء ممطر" />
          <button class="btn-chip" onclick="window.GhazlanRoleplay.saveScene()">حفظ</button>
        </div>
      </div>

      <div class="sec-box">
        <div class="sec-title"><span>⭐ أجمل اللحظات المحفوظة (${(rpCfg.bookmarks || []).length})</span></div>
        <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
          ${(rpCfg.bookmarks || []).length ? rpCfg.bookmarks.map((b) => `
            <div class="mem-item" style="flex-direction:column;align-items:stretch;gap:4px;font-size:12px">
              <div class="row-gap" style="justify-content:space-between">
                <strong>${esc(b.charName)}</strong>
                <button class="icon-btn" style="width:22px;height:22px;font-size:11px;color:var(--rose)" onclick="window.GhazlanRoleplay.delBookmark('${b.id}')">✕</button>
              </div>
              <div>${window.renderSimpleMd(b.text)}</div>
            </div>`).join('') : `<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px">اضغط ⭐ أسفل أي رسالة جميلة لحفظها هنا.</div>`}
        </div>
      </div>
    `;
    rpModalBg.classList.add('open');
  }

  // Add 🎭 button to chat header
  const hActions = document.querySelector('#chatScreen header .h-actions');
  if (hActions && !document.getElementById('rpModeBtn')) {
    const b = document.createElement('button');
    b.id = 'rpModeBtn';
    b.className = 'icon-btn';
    b.title = 'وضع السرد والحركات وأجمل اللحظات';
    b.textContent = '🎭';
    b.onclick = openRpModal;
    hActions.prepend(b);
  }

  window.GhazlanRoleplay = {
    openModal: openRpModal,
    toggleEnabled(v) {
      rpCfg.enabled = !!v;
      saveRp();
      renderQuickBar();
      if (typeof renderCurrentChat === 'function') renderCurrentChat();
      showToast(v ? 'تم تفعيل أسلوب السرد والحركات الملوّن 🎭' : 'تم إيقاف تلوين الحركات');
    },
    toggleQuick(v) { rpCfg.showQuickActions = !!v; saveRp(); renderQuickBar(); },
    setColor(hex) {
      rpCfg.colorHex = hex;
      document.documentElement.style.setProperty('--rp-action-color', hex);
      saveRp();
      openRpModal();
    },
    saveScene() {
      rpCfg.sceneText = (document.getElementById('rpSceneInp')?.value || '').trim().slice(0, 120);
      saveRp();
      renderSceneBar();
      showToast(rpCfg.sceneText ? 'تم تثبيت المشهد الحالي 📍' : 'تمت إزالة بطاقة المشهد');
    },
    insertAction(txt) {
      const p = document.getElementById('prompt');
      if (!p) return;
      p.value = p.value ? `${p.value.trim()} ${txt} ` : `${txt}\n`;
      p.focus();
    },
    delBookmark(id) {
      rpCfg.bookmarks = (rpCfg.bookmarks || []).filter((x) => x.id !== id);
      saveRp();
      openRpModal();
    },
  };
})();
