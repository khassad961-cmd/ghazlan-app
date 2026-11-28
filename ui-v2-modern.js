/* ============================================================================
 * Ghazlan UI 2.0 — Interactive Modernization & Command Dock (www/ui-v2-modern.js)
 *  1) Upgrades Home brand to "🌙 غزلان" + Live Cloud Status Pill + Quick Ribbon
 *  2) Unifies Chat Header (.h-left) with 🎭 Roleplay, 📞 Voice Call, & ⚡ Command Dock
 *  3) Smart Command Dock: Mini-Games (4), Fork/Branch Chat, Regenerate Last Reply,
 *     Quick Jump to Memory/World, Roleplay Color Mode, and Voice Call
 *  4) Mood-Reactive Avatar Ring Glow + Subtle Haptic Feedback
 * ============================================================================ */
(() => {
  const haptic = (ms = 10) => {
    try {
      if (!document.body.classList.contains('reduced-motion') && navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  };

  // ---- 1. Upgrade Home Brand + Cloud Pill + Quick-Action Ribbon ----
  function upgradeHomeHeader() {
    const brand = document.querySelector('.home-brand');
    if (brand) {
      const signed = window.GhazlanAPI?.isSignedIn?.();
      brand.innerHTML = `🌙 غزلان <span class="v2-cloud-pill">${signed ? '🟢 سحابي' : '⚪ محلي'}</span>`;
    }

    const searchWrap = document.querySelector('.home-search-wrap');
    if (searchWrap && !document.getElementById('v2QuickRibbon')) {
      const rib = document.createElement('div');
      rib.id = 'v2QuickRibbon';
      rib.className = 'v2-quick-ribbon';
      rib.innerHTML = `
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanDiscover?.setSubTab?.('stories')">📖 قصص تفاعلية</button>
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanWorld?.openHub?.()">🌍 العالم والذاكرة</button>
        <button class="v2-qpill" onclick="switchHomeTab('tasks')">⏰ المهام الذكية</button>
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanSocial?.openHub?.()">🤝 تفاعل الشخصيات</button>
        <button class="v2-qpill" onclick="switchHomeTab('discover');window.GhazlanExt?.openHub?.()">✨ الصوت والألبوم</button>
        <button class="v2-qpill" onclick="openCharStudio()">➕ شخصية جديدة</button>
      `;
      searchWrap.parentNode.insertBefore(rib, searchWrap.nextSibling);
    }
  }

  // ---- 2. Unify Chat Header Buttons (.h-left) ----
  function upgradeChatHeader() {
    const hLeft = document.querySelector('#chatScreen header .h-left');
    if (!hLeft) return;

    if (!document.getElementById('v2CallBtn')) {
      const callBtn = document.createElement('button');
      callBtn.id = 'v2CallBtn';
      callBtn.className = 'icon-btn';
      callBtn.title = 'مكالمة صوتية مباشرة';
      callBtn.textContent = '📞';
      callBtn.onclick = () => { haptic(); window.GhazlanExt?.openVoiceCall?.(); };
      hLeft.prepend(callBtn);
    }

    if (!document.getElementById('v2RpBtn')) {
      const rpBtn = document.createElement('button');
      rpBtn.id = 'v2RpBtn';
      rpBtn.className = 'icon-btn';
      rpBtn.title = 'وضع السرد والحركات وأجمل اللحظات';
      rpBtn.textContent = '🎭';
      rpBtn.onclick = () => { haptic(); window.GhazlanRoleplay?.openModal?.(); };
      hLeft.prepend(rpBtn);
    }

    if (!document.getElementById('v2DockBtn')) {
      const dockBtn = document.createElement('button');
      dockBtn.id = 'v2DockBtn';
      dockBtn.className = 'icon-btn';
      dockBtn.title = 'لوحة الأدوات السريعة والألعاب';
      dockBtn.textContent = '⚡';
      dockBtn.onclick = () => { haptic(); openCommandDock(); };
      hLeft.prepend(dockBtn);
    }
  }

  // ---- 3. Mood-Reactive Avatar Ring Glow ----
  function updateMoodGlow() {
    const avWrap = document.querySelector('#chatScreen header .av-wrap');
    const c = typeof getChat === 'function' ? getChat() : null;
    if (!avWrap || !c || c.type !== 'direct') return;
    const ch = typeof getChar === 'function' ? getChar(c.charId) : null;
    const mood = String(ch?.status?.mood || '').toLowerCase();
    avWrap.classList.remove('mood-warm', 'mood-calm', 'mood-fun', 'mood-deep');
    if (/حب|دافئ|رومانس|مشتاق|عاطف/.test(mood)) avWrap.classList.add('mood-warm');
    else if (/مرحة|فرحان|ضحك|متحمس/.test(mood)) avWrap.classList.add('mood-fun');
    else if (/حزين|غامض|عميق|متوتر|عنيد/.test(mood)) avWrap.classList.add('mood-deep');
    else avWrap.classList.add('mood-calm');
  }

  const _origSyncUI = window.syncChatUI;
  if (typeof _origSyncUI === 'function') {
    window.syncChatUI = function (...args) {
      const res = _origSyncUI.apply(this, args);
      updateMoodGlow();
      return res;
    };
  }

  // ---- 4. Smart Command Dock (Mini-Games, Fork Chat, Regenerate, Quick Jumps) ----
  const dockBg = document.createElement('div');
  dockBg.id = 'v2DockBg';
  dockBg.className = 'modal-bg';
  dockBg.onclick = (e) => { if (e.target === dockBg) dockBg.classList.remove('open'); };
  dockBg.innerHTML = `<div class="modal" id="v2DockBody"></div>`;
  document.body.appendChild(dockBg);

  const MINI_GAMES = [
    { id: '20q', title: '🎯 لعبة 20 سؤال', prompt: 'يلا نلعب لعبة 20 سؤال! فكّري في شيء أو مكان في بالك وأنا سأحاول تخمينه بأسئلة نعم أو لا. ابدئي بتلميح صغير!' },
    { id: 'truth', title: '💬 سؤال صراحة عميق', prompt: 'خلّينا نلعب لعبة صراحة لطيفة: اسأليني سؤالاً عميقاً أو طريفاً، وبعد أن أجيب أسألك أنا أيضاً!' },
    { id: 'riddle', title: '🕵️ لغز بوليسي سريع', prompt: 'أعطيني لغزاً بوليسياً قصيراً من 3 أسطر في الجزائر العاصمة ودعيني أكتشف الحل خطوة بخطوة!' },
    { id: 'coop', title: '📖 أكمل القصة معاً', prompt: 'يلا نكتب قصة قصيرة معاً: اكتبي أول سطرين مشوّقين واتركي لي التكملة!' },
  ];

  function openCommandDock() {
    const body = document.getElementById('v2DockBody');
    const c = typeof getChat === 'function' ? getChat() : null;
    const chId = c?.type === 'direct' ? c.charId : 'ghazlan';
    body.innerHTML = `
      <h3>⚡ لوحة الأدوات السريعة
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="document.getElementById('v2DockBg').classList.remove('open')">✕</button>
      </h3>
      <div class="v2-dock-grid">
        <button class="v2-dock-tile" onclick="window.GhazlanV2.closeDock();window.GhazlanRoleplay?.openModal?.()">
          <strong>🎭 السرد والمشهد</strong>
          <span>لون الحركات، المشهد، والمفضلة</span>
        </button>
        <button class="v2-dock-tile" onclick="window.GhazlanV2.closeDock();window.GhazlanExt?.openVoiceCall?.()">
          <strong>📞 مكالمة صوتية</strong>
          <span>تحدث مباشرة بصوتك مجاناً</span>
        </button>
        <button class="v2-dock-tile" onclick="window.GhazlanV2.forkChat()">
          <strong>🔀 تفرّع المحادثة</strong>
          <span>نسخ المحادثة لتجربة مسار جديد</span>
        </button>
        <button class="v2-dock-tile" onclick="window.GhazlanV2.regenLast()">
          <strong>🔄 رد بديل لآخر رسالة</strong>
          <span>إعادة توليد آخر رد بأسلوب مختلف</span>
        </button>
        <button class="v2-dock-tile" onclick="window.GhazlanV2.closeDock();goHome();switchHomeTab('discover');window.GhazlanWorld?.openHub?.('${esc(chId)}','memories')">
          <strong>🧠 الذاكرة والعالم</strong>
          <span>إدارة الذكريات وجدول اليوم</span>
        </button>
        <button class="v2-dock-tile" onclick="window.GhazlanV2.closeDock();openCustomize()">
          <strong>🎨 السمات والخلفيات</strong>
          <span>تخصيص مظهر هذه المحادثة</span>
        </button>
      </div>

      <div class="sec-box" style="margin-top:10px">
        <div class="sec-title"><span>🎲 ألعاب تفاعلية فورية داخل الدردشة</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${MINI_GAMES.map((g) => `<button class="btn-chip" onclick="window.GhazlanV2.startGame('${g.id}')">${g.title}</button>`).join('')}
        </div>
      </div>
    `;
    dockBg.classList.add('open');
  }

  function forkCurrentChat() {
    const c = typeof getChat === 'function' ? getChat() : null;
    if (!c) return;
    const copy = JSON.parse(JSON.stringify(c));
    copy.id = (c.type === 'group' ? 'g_fork_' : 'c_fork_') + Date.now();
    copy.title = `🌿 فرع: ${c.title || 'محادثة'}`;
    chats.unshift(copy);
    saveChats();
    dockBg.classList.remove('open');
    openChatById(copy.id);
    showToast('تم إنشاء فرع مستقل من المحادثة 🌿');
  }

  function regenerateLastReply() {
    const c = typeof getChat === 'function' ? getChat() : null;
    if (!c || !c.messages?.length) { showToast('لا توجد رسائل لإعادة توليدها.'); return; }
    // Remove trailing model message(s) and re-trigger send on the last user message
    while (c.messages.length && c.messages[c.messages.length - 1].role === 'model') {
      c.messages.pop();
    }
    const lastUser = c.messages[c.messages.length - 1];
    if (!lastUser || lastUser.role !== 'user') {
      showToast('لم أجد رسالة مستخدم سابقة لإعادة التوليد.');
      return;
    }
    const txt = lastUser.text || '';
    c.messages.pop();
    saveChats();
    renderCurrentChat();
    dockBg.classList.remove('open');
    const p = document.getElementById('prompt');
    if (p && txt) {
      p.value = txt;
      if (typeof sendMessage === 'function') sendMessage();
      else p.focus();
    }
  }

  function startMiniGame(gid) {
    const g = MINI_GAMES.find((x) => x.id === gid);
    if (!g) return;
    dockBg.classList.remove('open');
    const p = document.getElementById('prompt');
    if (p) {
      p.value = g.prompt;
      if (typeof sendMessage === 'function') sendMessage();
      else p.focus();
    }
  }

  window.GhazlanV2 = {
    openDock: openCommandDock,
    closeDock: () => dockBg.classList.remove('open'),
    forkChat: forkCurrentChat,
    regenLast: regenerateLastReply,
    startGame: startMiniGame,
    refreshHeader: () => { upgradeHomeHeader(); upgradeChatHeader(); updateMoodGlow(); },
  };

  // Initialize cleanly
  upgradeHomeHeader();
  upgradeChatHeader();
  setTimeout(() => { upgradeHomeHeader(); updateMoodGlow(); }, 1800);
})();
