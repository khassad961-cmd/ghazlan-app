/* ============================================================================
 * Ghazlan UI 3.0 — Native Vector SVG Icon System & Categorized Settings Menu
 * (www/icons-and-settings-v3.js)
 *  1) Replaces emoji UI icons across Home, Bottom Nav, Chat Header, Composer,
 *     and Sub-Tabs with crisp monochrome/accent SVG icons (Messenger-style)
 *  2) Reorganizes #settingsBg into a clean drill-down Categorized Settings Menu
 *     where every category opens its dedicated sub-panel with a Back button,
 *     preserving 100% of existing input IDs, event handlers, and saveSettings()
 * ============================================================================ */
(() => {
  // ---- 1. Crisp Inline SVG Icon Library (Zero External Font Dependencies) ----
  const svg = (paths, size = 21, filled = true) =>
    `<svg class="v3-ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" ${filled ? '' : 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${paths}</svg>`;

  const ICONS = {
    chat: svg('<path d="M12 3C6.5 3 2 7 2 11.8c0 2.7 1.4 5.1 3.7 6.7V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4 10-8.7C22 7 17.5 3 12 3z"/>'),
    users: svg('<path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.8 2 2 2 3.4V19h6v-2.5c0-2.3-4.7-3.5-7-3.5z"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    clock: svg('<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.4 3.2 1.9-1 1.7L11 13.5V7h2z"/>'),
    compass: svg('<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm2.2 12.2-6.4 2.6 2.6-6.4 6.4-2.6-2.6 6.4z"/><circle cx="12" cy="12" r="1.3" fill="var(--bg)"/>'),
    gear: svg('<path d="M19.4 13a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.4 7.4 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5a.5.5 0 0 0 .6.2l2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6a.5.5 0 0 0 .5.4h4a.5.5 0 0 0 .5-.4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"/>'),
    edit: svg('<path d="M3 17.2V21h3.8L17.8 9.9l-3.8-3.8L3 17.2zm17.7-10.4a1 1 0 0 0 0-1.4l-2.1-2.1a1 1 0 0 0-1.4 0l-1.6 1.6 3.8 3.8 1.3-1.9z"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 18, false),
    backRtl: svg('<path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>', 21, false),
    phone: svg('<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.6 21 3 13.4 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1z"/>'),
    info: svg('<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/>'),
    palette: svg('<path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H13a1 1 0 0 1 0-2h3a5 5 0 0 0 0-10zm-4.5 9A1.5 1.5 0 1 1 9 10.5 1.5 1.5 0 0 1 7.5 12zm3-4A1.5 1.5 0 1 1 12 6.5 1.5 1.5 0 0 1 10.5 8zm4.5 0A1.5 1.5 0 1 1 16.5 6.5 1.5 1.5 0 0 1 15 8z"/>'),
    drama: svg('<path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4V5z"/><path d="M8 8h8M8 12h5" stroke="var(--bg)" stroke-width="2" stroke-linecap="round"/>'),
    grid: svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>', 19),
    image: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.5" fill="var(--bg)"/><path d="m21 16-5-5-4 4-2-2-5 5" stroke="var(--bg)" stroke-width="1.8" fill="none"/>'),
    mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
    smile: svg('<circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.2" fill="var(--bg)"/><circle cx="15" cy="10" r="1.2" fill="var(--bg)"/><path d="M8.5 14.5a4 4 0 0 0 7 0" stroke="var(--bg)" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
    heart: svg('<path d="M12 21s-7.5-4.7-9.6-9.1C.8 8.6 2.8 5 6.4 5c2 0 3.6 1.1 4.6 2.5h2C14 6.1 15.6 5 17.6 5c3.6 0 5.6 3.6 4 6.9C19.5 16.3 12 21 12 21z"/>'),
    send: svg('<path d="M21.4 2.6a1 1 0 0 0-1.1-.2L2.8 9.6a1 1 0 0 0 .1 1.9l7.1 2.2 2.2 7.1a1 1 0 0 0 1.9.1l7.2-17.5a1 1 0 0 0 .1-.8z"/>'),
    cloud: svg('<path d="M19.3 10.1A7 7 0 0 0 5.6 8.3 5 5 0 0 0 6 18h13a4 4 0 0 0 .3-7.9z"/>'),
    cpu: svg('<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    gif: svg('<rect x="2" y="5" width="20" height="14" rx="3"/><text x="12" y="15" text-anchor="middle" font-size="8.5" font-weight="800" fill="var(--bg)" font-family="sans-serif">GIF</text>'),
    shield: svg('<path d="M12 2 4 5v6c0 5.5 3.4 10.7 8 12 4.6-1.3 8-6.5 8-12V5z"/>'),
    globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" stroke="var(--bg)" stroke-width="1.6" fill="none"/>'),
    book: svg('<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/><path d="M8 7h8M8 11h6" stroke="var(--bg)" stroke-width="1.8" stroke-linecap="round"/>'),
    spark: svg('<path d="m12 2 2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 20, false),
    chevLeft: svg('<path d="m15 18-6-6 6-6"/>', 18, false),
    speaker: svg('<path d="M11 5 6 9H2v6h4l5 4V5zm4.5 3.5a5 5 0 0 1 0 7m2.8-9.8a9 9 0 0 1 0 12.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>', 15, false),
    star: svg('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1z"/>', 14),
  };

  // ---- 2. Clean Vector Icon & Categorized Settings CSS ----
  const css = document.createElement('style');
  css.id = 'v3-icons-settings-css';
  css.textContent = `
    .v3-ico { display: inline-block; vertical-align: middle; flex-shrink: 0; }
    #chatScreen header .h-left .icon-btn,
    #chatScreen header .h-right .icon-btn { color: var(--accent, #6366f1) !important; background: transparent !important; border-color: transparent !important; }
    #chatScreen header .h-left .icon-btn:active { background: rgba(255,255,255,0.08) !important; }
    #chatScreen footer .foot-in > .icon-btn { color: var(--accent, #6366f1) !important; background: transparent !important; border: none !important; }
    #chatScreen footer .pill-input-box .icon-btn { color: var(--accent, #6366f1) !important; background: transparent !important; border: none !important; }
    .bottom-nav .bnav-btn .bi { display: inline-flex; align-items: center; justify-content: center; height: 22px; }
    .bottom-nav .bnav-btn { color: var(--muted); }
    .bottom-nav .bnav-btn.active { color: #fff; }
    .home-top-actions .circle-btn { color: var(--text) !important; display: inline-flex; align-items: center; justify-content: center; }

    /* Messenger-Style Categorized Settings Menu */
    .v3-set-profile {
      display: flex; align-items: center; gap: 12px;
      padding: 12px; border-radius: 16px;
      background: rgba(255,255,255,0.04); border: 1px solid var(--v2-glass-border, var(--border));
      margin-bottom: 10px;
    }
    .v3-set-av {
      width: 46px; height: 46px; border-radius: 50%;
      background: var(--user-bubble); color: #fff;
      display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;
    }
    .v3-set-group {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--v2-glass-border, var(--border));
      border-radius: 16px; overflow: hidden; margin-bottom: 10px;
    }
    .v3-set-row {
      width: 100%; display: flex; align-items: center; gap: 12px;
      padding: 13px 14px; background: transparent; border: none;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: var(--text); text-align: right; cursor: pointer;
      transition: background .15s ease;
    }
    .v3-set-row:last-child { border-bottom: none; }
    .v3-set-row:active { background: rgba(255,255,255,0.08); }
    .v3-set-ico {
      width: 36px; height: 36px; border-radius: 12px;
      background: rgba(255,255,255,0.07); color: var(--text);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .v3-set-meta { flex: 1; min-width: 0; }
    .v3-set-meta strong { display: block; font-size: 13.5px; font-weight: 700; }
    .v3-set-meta small { display: block; font-size: 11px; color: var(--muted); margin-top: 2px; }
    .v3-set-chev { color: var(--muted); }
    .v3-sub-head {
      display: flex; align-items: center; gap: 8px;
      padding-bottom: 10px; margin-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .v3-back-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 11px; border-radius: 10px;
      background: rgba(255,255,255,0.07); border: 1px solid var(--border);
      color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .v3-hidden-sec { display: none !important; }
  `;
  document.head.appendChild(css);

  // ---- 3. Apply Vector Icons Across Entire UI ----
  function applyVectorIcons() {
    // Bottom Navigation
    const navMap = {
      navChats: ICONS.chat,
      navChars: ICONS.users,
      navNotes: ICONS.moon,
      navTasks: ICONS.clock,
      navDiscover: ICONS.compass,
    };
    for (const [id, ico] of Object.entries(navMap)) {
      const el = document.querySelector(`#${id} .bi`);
      if (el) el.innerHTML = ico;
    }

    // Home Top Bar Actions & Brand
    const brand = document.querySelector('.home-brand');
    if (brand) {
      const signed = window.GhazlanAPI?.isSignedIn?.();
      brand.innerHTML = `<span style="color:var(--accent);-webkit-text-fill-color:initial;display:inline-flex">${ICONS.moon}</span> غزلان <span class="v2-cloud-pill">${signed ? 'متصل' : 'محلي'}</span>`;
    }
    const homeBtns = document.querySelectorAll('.home-top-actions .circle-btn');
    if (homeBtns[0]) homeBtns[0].innerHTML = ICONS.edit;
    if (homeBtns[1]) homeBtns[1].innerHTML = ICONS.users;
    if (homeBtns[2]) homeBtns[2].innerHTML = ICONS.gear;

    const searchIco = document.querySelector('.home-search > span');
    if (searchIco) searchIco.innerHTML = ICONS.search;

    // Quick Ribbon Pills on Home
    const ribbon = document.getElementById('v2QuickRibbon');
    if (ribbon) {
      ribbon.innerHTML = `
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanDiscover?.setSubTab?.('stories')">${ICONS.book} قصص تفاعلية</button>
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanWorld?.openHub?.()">${ICONS.globe} العالم والذاكرة</button>
        <button class="v2-qpill" onclick="switchHomeTab('tasks')">${ICONS.clock} المهام</button>
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanSocial?.openHub?.()">${ICONS.users} التفاعل</button>
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanExt?.openHub?.()">${ICONS.spark} الإضافات</button>
        <button class="v2-qpill" onclick="openCharStudio()">${ICONS.plus} شخصية جديدة</button>
      `;
    }

    // Chat Header Icons (exact Messenger vector feel)
    const backBtn = document.querySelector('#chatScreen header .h-right .icon-btn');
    if (backBtn) backBtn.innerHTML = ICONS.backRtl;

    const v2Call = document.getElementById('v2CallBtn');
    if (v2Call) v2Call.innerHTML = ICONS.phone;
    const v2Rp = document.getElementById('v2RpBtn');
    if (v2Rp) v2Rp.innerHTML = ICONS.drama;
    const v2Dock = document.getElementById('v2DockBtn');
    if (v2Dock) v2Dock.innerHTML = ICONS.grid;

    document.querySelectorAll('#chatScreen header .h-left .icon-btn').forEach((btn) => {
      const oc = btn.getAttribute('onclick') || '';
      if (oc.includes('openCustomize')) btn.innerHTML = ICONS.palette;
      else if (oc.includes('openChatInfo')) btn.innerHTML = ICONS.info;
    });

    // Chat Composer Icons
    const footBtns = document.querySelectorAll('#chatScreen footer .foot-in > .icon-btn');
    footBtns.forEach((btn) => {
      const oc = btn.getAttribute('onclick') || '';
      if (btn.id === 'micBtn') btn.innerHTML = ICONS.mic;
      else if (oc.includes('fileInput')) btn.innerHTML = ICONS.image;
      else if (oc.includes('sendQuickReaction')) btn.innerHTML = ICONS.heart;
      else if (btn.id === 'sendBtn' || oc.includes('sendMessage')) btn.innerHTML = ICONS.send;
    });
    const mediaBtn = document.querySelector('#chatScreen footer .pill-input-box .icon-btn');
    if (mediaBtn) mediaBtn.innerHTML = ICONS.smile;

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.innerHTML = ICONS.send;
  }

  // Replace 🔊 and ⭐ on message tool buttons with crisp SVG vectors
  function upgradeMsgToolIcons() {
    document.querySelectorAll('.rp-mini-btn').forEach((b) => {
      if (b.textContent.trim() === '🔊') b.innerHTML = ICONS.speaker;
      else if (b.textContent.trim() === '⭐') b.innerHTML = ICONS.star;
    });
  }

  const chatElObs = document.getElementById('chat');
  if (chatElObs && typeof MutationObserver !== 'undefined') {
    new MutationObserver(upgradeMsgToolIcons).observe(chatElObs, { childList: true, subtree: true });
  }

  // ---- 4. Categorized Drill-Down Settings Menu (Messenger Style) ----
  let settingsBuilt = false;
  let activeSettingsCat = null; // null = main menu, or 'cloud' | 'ai' | 'media' | 'privacy'
  let categorizedBoxes = { cloud: [], ai: [], media: [], privacy: [] };

  function buildCategorizedSettings() {
    const modal = document.querySelector('#settingsBg .modal');
    if (!modal || settingsBuilt) return;
    settingsBuilt = true;

    const boxes = Array.from(modal.querySelectorAll(':scope > .sec-box'));
    const saveBtn = modal.querySelector(':scope > button.btn-primary');

    boxes.forEach((b) => {
      const txt = b.textContent || '';
      if (b.id === 'p8GifSec' || txt.includes('GIPHY')) categorizedBoxes.media.push(b);
      else if (txt.includes('Supabase') || txt.includes('الخادم الآمن')) categorizedBoxes.cloud.push(b);
      else if (txt.includes('المزوّد') || txt.includes('اختيار النماذج')) categorizedBoxes.ai.push(b);
      else categorizedBoxes.privacy.push(b);
    });

    // Create Main Menu Container & Sub-Page Header
    const menuDiv = document.createElement('div');
    menuDiv.id = 'v3SettingsMenu';

    const subHeader = document.createElement('div');
    subHeader.id = 'v3SettingsSubHead';
    subHeader.className = 'v3-sub-head v3-hidden-sec';
    subHeader.innerHTML = `
      <button class="v3-back-btn" onclick="window.GhazlanSettingsV3.showMenu()">${ICONS.backRtl} رجوع</button>
      <strong id="v3SubTitle" style="font-size:14px"></strong>
    `;

    const h3 = modal.querySelector(':scope > h3');
    if (h3) {
      h3.insertAdjacentElement('afterend', subHeader);
      h3.insertAdjacentElement('afterend', menuDiv);
    } else {
      modal.prepend(subHeader);
      modal.prepend(menuDiv);
    }

    if (saveBtn) saveBtn.id = 'v3OrigSaveBtn';
    renderSettingsMenu();
    showSettingsCategory(null);
  }

  function renderSettingsMenu() {
    const menuDiv = document.getElementById('v3SettingsMenu');
    if (!menuDiv) return;
    const uname = (typeof settings !== 'undefined' && settings.userName) ? settings.userName : 'المستخدم';
    const sess = window.GhazlanAPI?.getSession?.();
    const emailTxt = sess?.user?.email || 'الوضع المحلي (سجّل الدخول للمزامنة السحابية)';

    menuDiv.innerHTML = `
      <div class="v3-set-profile">
        <div class="v3-set-av">${esc(uname.slice(0, 1))}</div>
        <div class="v3-set-meta">
          <strong>${esc(uname)}</strong>
          <small>${esc(emailTxt)}</small>
        </div>
      </div>

      <div class="v3-set-group">
        <button class="v3-set-row" onclick="window.GhazlanSettingsV3.openCat('cloud','الحساب والسحابة (Supabase)')">
          <span class="v3-set-ico">${ICONS.cloud}</span>
          <span class="v3-set-meta"><strong>الحساب والسحابة (Supabase)</strong><small>رابط المشروع، تسجيل الدخول، والترحيل السحابي</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
        <button class="v3-set-row" onclick="window.GhazlanSettingsV3.openCat('ai','الذكاء الاصطناعي والنماذج')">
          <span class="v3-set-ico">${ICONS.cpu}</span>
          <span class="v3-set-meta"><strong>الذكاء الاصطناعي والنماذج</strong><small>المزوّد، النماذج الحية، البث المباشر، والسرعة</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
        <button class="v3-set-row" onclick="window.GhazlanSettingsV3.openCat('media','الوسائط ومفتاح GIF')">
          <span class="v3-set-ico">${ICONS.gif}</span>
          <span class="v3-set-meta"><strong>الوسائط ومفتاح GIF</strong><small>مفتاح GIPHY / Tenor، فحص الصور، وتحديث التطبيق</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
        <button class="v3-set-row" onclick="window.GhazlanSettingsV3.openCat('privacy','الأصوات والخصوصية والنسخ الاحتياطي')">
          <span class="v3-set-ico">${ICONS.shield}</span>
          <span class="v3-set-meta"><strong>الأصوات والخصوصية والنسخ</strong><small>الأصوات، قفل التطبيق، الحرارة، والنسخ الاحتياطي</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
      </div>

      <div class="v3-set-group">
        <button class="v3-set-row" onclick="toggleSettings(false);openCustomize()">
          <span class="v3-set-ico">${ICONS.palette}</span>
          <span class="v3-set-meta"><strong>المظهر والخلفيات والحركة</strong><small>السمات، خلفية كل شخصية، السطوع، وتقليل الحركة</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
        <button class="v3-set-row" onclick="toggleSettings(false);window.GhazlanRoleplay?.openModal?.()">
          <span class="v3-set-ico">${ICONS.drama}</span>
          <span class="v3-set-meta"><strong>أسلوب السرد والحركات والمشهد</strong><small>لون الحركات، الأزرار السريعة، وأجمل اللحظات</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
        <button class="v3-set-row" onclick="toggleSettings(false);goHome();switchHomeTab('tasks')">
          <span class="v3-set-ico">${ICONS.clock}</span>
          <span class="v3-set-meta"><strong>المهام الذكية والجدولة</strong><small>إدارة المهام المجدولة والمنطقة الزمنية</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
        <button class="v3-set-row" onclick="toggleSettings(false);goHome();switchHomeTab('discover');window.GhazlanWorld?.openHub?.()">
          <span class="v3-set-ico">${ICONS.globe}</span>
          <span class="v3-set-meta"><strong>العالم الافتراضي والذاكرة المنظمة</strong><small>إدارة الذكريات، سجل العلاقة، وجدول الحياة</small></span>
          <span class="v3-set-chev">${ICONS.chevLeft}</span>
        </button>
      </div>
    `;
  }

  function showSettingsCategory(cat, title = '') {
    activeSettingsCat = cat;
    const menuDiv = document.getElementById('v3SettingsMenu');
    const subHead = document.getElementById('v3SettingsSubHead');
    const subTitle = document.getElementById('v3SubTitle');
    const saveBtn = document.getElementById('v3OrigSaveBtn');

    // Hide all original sec-boxes first
    Object.values(categorizedBoxes).flat().forEach((b) => b.classList.add('v3-hidden-sec'));

    if (!cat) {
      if (menuDiv) menuDiv.classList.remove('v3-hidden-sec');
      if (subHead) subHead.classList.add('v3-hidden-sec');
      if (saveBtn) saveBtn.classList.add('v3-hidden-sec');
      renderSettingsMenu();
    } else {
      if (menuDiv) menuDiv.classList.add('v3-hidden-sec');
      if (subHead) subHead.classList.remove('v3-hidden-sec');
      if (subTitle) subTitle.textContent = title;
      (categorizedBoxes[cat] || []).forEach((b) => b.classList.remove('v3-hidden-sec'));
      if (saveBtn) saveBtn.classList.toggle('v3-hidden-sec', cat === 'media');
    }
  }

  // Hook toggleSettings so opening settings always starts cleanly at the categorized menu
  const _origToggleSettings = window.toggleSettings;
  if (typeof _origToggleSettings === 'function') {
    window.toggleSettings = function (open) {
      const res = _origToggleSettings(open);
      if (open) {
        buildCategorizedSettings();
        showSettingsCategory(null);
      }
      return res;
    };
  }

  window.GhazlanSettingsV3 = {
    openCat: showSettingsCategory,
    showMenu: () => showSettingsCategory(null),
    refreshIcons: applyVectorIcons,
  };

  // Run after all modules have mounted
  setTimeout(() => {
    applyVectorIcons();
    upgradeMsgToolIcons();
    buildCategorizedSettings();
  }, 350);
  setTimeout(applyVectorIcons, 1900);
})();
