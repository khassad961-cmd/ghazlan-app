/* ============================================================================
 * Ghazlan Phase 3 — UI/UX Upgrade Module (www/phase3-ui.js)
 * Implements Section 4 of Master Specification without breaking v7/v8/bridge:
 *  1) Smart Collapsible Chat Header on scroll (more reading space on phones)
 *  2) Independent Per-Character Wallpaper + Brightness/Blur/Dim controls
 *  3) Enhanced Character Info Panel (bio, traits chips, relationship bars, memory jump)
 *  4) Reduced Motion accessibility support & responsive polish
 *  5) Live 35+ Gemini model dropdown population
 * ============================================================================ */
(() => {
  const css = document.createElement('style');
  css.id = 'phase3-css';
  css.textContent = `
    /* Smart Collapsible Chat Header */
    #chatScreen header { transition: padding .2s ease, min-height .2s ease; }
    #chatScreen header.compact-head { min-height: 44px; padding: 4px 8px; }
    #chatScreen header.compact-head .av-wrap { width: 30px; height: 30px; }
    #chatScreen header.compact-head .status-line { display: none; }
    #chatScreen header.compact-head .brand { font-size: 14px; }

    /* Wallpaper brightness filter */
    #wallLayer { filter: blur(var(--wall-blur)) brightness(var(--wall-bright, 1)); }

    /* Enhanced Character Info Cards & Relationship Meters */
    .p3-traits { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-top: 6px; }
    .p3-trait-chip { font-size: 11px; padding: 3px 9px; border-radius: 99px; background: var(--card); border: 1px solid var(--border); color: var(--accent3); font-weight: 600; }
    .p3-meter { display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; }
    .p3-meter-top { display: flex; justify-content: space-between; }
    .p3-bar { height: 7px; border-radius: 99px; background: var(--bg); overflow: hidden; border: 1px solid var(--border); }
    .p3-bar > i { display: block; height: 100%; border-radius: 99px; background: var(--user-bubble); }

    /* Accessibility: Respect OS & in-app Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
    }
    body.reduced-motion *, body.reduced-motion *::before, body.reduced-motion *::after {
      animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important;
    }

    /* Comfortable tap targets on narrow screens */
    @media (max-width: 420px) {
      .icon-btn { width: 38px; height: 38px; }
      .msg-col { max-width: 84%; }
    }
  `;
  document.head.appendChild(css);

  // 1. Reduced Motion preference
  if (store.get('rp_reduced_motion', '0') === '1') document.body.classList.add('reduced-motion');

  // 2. Smart Collapsible Chat Header on scroll
  const chatMain = document.getElementById('chat');
  const chatHeader = document.querySelector('#chatScreen header');
  if (chatMain && chatHeader) {
    let lastScroll = 0;
    chatMain.addEventListener('scroll', () => {
      const top = chatMain.scrollTop;
      const maxScroll = chatMain.scrollHeight - chatMain.clientHeight;
      if (maxScroll > 160 && top < maxScroll - 90 && top < lastScroll) {
        chatHeader.classList.add('compact-head');
      } else if (top >= maxScroll - 40 || top < 20) {
        chatHeader.classList.remove('compact-head');
      }
      lastScroll = top;
    }, { passive: true });
  }

  // 3. Independent Per-Character Wallpaper + Brightness/Blur/Dim
  function getCharWallKey() {
    const c = typeof getChat === 'function' ? getChat() : null;
    if (!c) return null;
    return 'rp_cwall_' + (c.type === 'group' ? c.id : c.charId);
  }

  function getCharWallConfig() {
    const k = getCharWallKey();
    if (!k) return null;
    try { const raw = store.get(k, ''); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  function saveCharWallConfig(cfg) {
    const k = getCharWallKey();
    if (!k) return;
    if (!cfg) { try { localStorage.removeItem(k); } catch {} }
    else store.set(k, JSON.stringify(cfg));
    applyAppearance();
  }

  const _oldApplyApp = window.applyAppearance;
  window.applyAppearance = function () {
    if (typeof _oldApplyApp === 'function') _oldApplyApp();
    const cw = getCharWallConfig();
    const wl = document.getElementById('wallLayer');
    if (cw && wl) {
      if (cw.customImg) {
        wl.style.backgroundImage = `url("${cw.customImg}")`;
        wl.style.backgroundSize = 'cover';
        document.body.classList.add('has-wall-img');
      } else if (cw.wallId) {
        const wp = (typeof WALLPAPERS !== 'undefined' ? WALLPAPERS : []).find((w) => w.id === cw.wallId);
        if (wp) {
          wl.style.backgroundImage = wp.css;
          wl.style.backgroundSize = wp.size || 'cover';
          document.body.classList.remove('has-wall-img');
        }
      }
      document.documentElement.style.setProperty('--wall-blur', (cw.blur ?? settings.wallBlur ?? 0) + 'px');
      document.documentElement.style.setProperty('--wall-dim', (((cw.dim ?? settings.wallDim ?? 45)) / 100).toFixed(2));
      document.documentElement.style.setProperty('--wall-bright', (((cw.bright ?? 100)) / 100).toFixed(2));
    } else {
      document.documentElement.style.setProperty('--wall-bright', (Number(store.get('rp_wall_bright', '100')) / 100).toFixed(2));
    }
  };

  // Inject Per-Character Wallpaper + Brightness + Reduced Motion controls into Customize Modal
  const customModal = document.querySelector('#customBg .modal');
  if (customModal && !document.getElementById('p3WallBox')) {
    const p3Box = document.createElement('div');
    p3Box.id = 'p3WallBox';
    p3Box.className = 'sec-box';
    p3Box.innerHTML = `
      <div class="sec-title"><span>🖼️ خلفية مستقلة لهذه الشخصية + سطوع وإمكانية وصول</span></div>
      <div class="row-gap">
        <button class="btn-chip" style="flex:1" onclick="document.getElementById('p3CharWallFile').click()">📷 خلفية خاصة بهذه الشخصية</button>
        <button class="btn-chip" onclick="window.GhazlanPhase3.clearCharWall()">استخدام العامة</button>
        <input id="p3CharWallFile" type="file" accept="image/*" style="display:none" onchange="window.GhazlanPhase3.uploadCharWall(this)" />
      </div>
      <div class="field">
        <label>سطوع الخلفية: <strong id="p3BrightVal">100%</strong></label>
        <input id="p3BrightRange" type="range" min="40" max="130" value="100" oninput="window.GhazlanPhase3.setBrightness(this.value)" />
      </div>
      <div class="switch-row">
        <span>♿ تقليل الحركة (Reduced Motion)</span>
        <input id="p3RedMotChk" type="checkbox" style="width:18px;height:18px" onchange="window.GhazlanPhase3.setReducedMotion(this.checked)" />
      </div>`;
    customModal.appendChild(p3Box);
  }

  // 4. Enhanced Character Info Drawer (Bio, Traits Chips, Visual Relationship Meters, Quick Memory)
  const _oldOpenInfo = window.openChatInfo;
  window.openChatInfo = function () {
    if (typeof _oldOpenInfo === 'function') _oldOpenInfo();
    const c = typeof getChat === 'function' ? getChat() : null;
    const body = document.getElementById('infoDrawerBody');
    if (!c || !body || c.type === 'group') return;
    const ch = getChar(c.charId);
    if (!ch) return;

    const traitsList = (ch.traits || '').split(/[،,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const st = ch.status || { trust: 65, warmth: 60, tension: 20, stage: 'صداقة', mood: 'رايقة ✨', activity: '' };
    const memCount = (memoriesByChar[ch.id] || []).length;

    const richCard = document.createElement('div');
    richCard.className = 'sec-box';
    richCard.innerHTML = `
      <div class="sec-title"><span>✨ ملف الشخصية والعلاقة</span><span>🧠 ${memCount} ذكرى</span></div>
      ${traitsList.length ? `<div class="p3-traits">${traitsList.map((t) => `<span class="p3-trait-chip">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="p3-meter"><div class="p3-meter-top"><span>🤝 الثقة</span><strong>${st.trust ?? 65}%</strong></div><div class="p3-bar"><i style="width:${st.trust ?? 65}%"></i></div></div>
      <div class="p3-meter"><div class="p3-meter-top"><span>💗 الدفء والانسجام</span><strong>${st.warmth ?? 60}%</strong></div><div class="p3-bar"><i style="width:${st.warmth ?? 60}%;background:linear-gradient(90deg,#ec4899,#a855f7)"></i></div></div>
      <div class="p3-meter"><div class="p3-meter-top"><span>⚡ العناد والتوتر</span><strong>${st.tension ?? 20}%</strong></div><div class="p3-bar"><i style="width:${st.tension ?? 20}%;background:linear-gradient(90deg,#f59e0b,#f43f5e)"></i></div></div>`;
    body.prepend(richCard);
  };

  // 5. Populate ALL discovered live Gemini models into #geminiModelSelect
  function populateLiveGeminiModels() {
    const sel = document.getElementById('geminiModelSelect');
    if (!sel || !Array.isArray(cachedGeminiModels) || !cachedGeminiModels.length) return;
    const cur = settings.geminiModel || 'auto';
    sel.innerHTML = '<option value="auto">تلقائي ذكي (أفضل نموذج شغال)</option>' +
      cachedGeminiModels.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
  }

  const _oldToggleSettings = window.toggleSettings;
  window.toggleSettings = function (open) {
    if (open) populateLiveGeminiModels();
    if (typeof _oldToggleSettings === 'function') _oldToggleSettings(open);
  };

  const _oldFetchModels = window.fetchGeminiModels;
  window.fetchGeminiModels = async function () {
    if (typeof _oldFetchModels === 'function') await _oldFetchModels();
    populateLiveGeminiModels();
  };

  const _oldOpenCust = window.openCustomize;
  window.openCustomize = function () {
    if (typeof _oldOpenCust === 'function') _oldOpenCust();
    const cw = getCharWallConfig();
    const bVal = cw?.bright ?? Number(store.get('rp_wall_bright', '100'));
    const br = document.getElementById('p3BrightRange');
    const bv = document.getElementById('p3BrightVal');
    const rm = document.getElementById('p3RedMotChk');
    if (br) br.value = bVal;
    if (bv) bv.textContent = bVal + '%';
    if (rm) rm.checked = store.get('rp_reduced_motion', '0') === '1';
  };

  window.GhazlanPhase3 = {
    async uploadCharWall(inp) {
      const f = inp.files?.[0]; if (!f) return;
      try {
        const img = await compressImageFile(f, 1080, 0.78);
        const cur = getCharWallConfig() || {};
        saveCharWallConfig({ ...cur, customImg: img });
        showToast('تم حفظ خلفية مستقلة لهذه الشخصية 🖼️✅');
      } catch { showToast('تعذر تحميل الصورة.'); }
      inp.value = '';
    },
    clearCharWall() {
      saveCharWallConfig(null);
      showToast('تمت العودة للخلفية العامة');
    },
    setBrightness(val) {
      const n = Number(val) || 100;
      const bv = document.getElementById('p3BrightVal');
      if (bv) bv.textContent = n + '%';
      const cw = getCharWallConfig();
      if (cw) saveCharWallConfig({ ...cw, bright: n });
      else { store.set('rp_wall_bright', String(n)); applyAppearance(); }
    },
    setReducedMotion(on) {
      store.set('rp_reduced_motion', on ? '1' : '0');
      document.body.classList.toggle('reduced-motion', on);
      showToast(on ? 'تم تفعيل تقليل الحركة ♿' : 'تم إعادة الحركات الطبيعية');
    },
  };

  // Initial sync
  populateLiveGeminiModels();
})();
