/* ============================================================================
 * Ghazlan Phase 7 — Optional Extensions Suite (www/extensions-p7-ui.js)
 * Implements Section 11 of Master Project Specification using FREE built-in
 * Web/Device APIs (zero forced paid third-party APIs):
 *  1) Voice Call Mode (free Web Speech STT + TTS + ai-proxy) & Voice Messages
 *     (MediaRecorder + 1x/1.25x/1.5x/2x playback speed)
 *  2) Album & Contextual Scene Cards (local HTML5 Canvas illustrated cards +
 *     photo uploads, saved locally & to Supabase `album_items`)
 *  3) Shared Calendar (aggregates Smart Tasks + Relationship Timeline + Dates)
 *  4) Non-Coercive Goals & Cosmetic Badges (no manipulative streaks)
 *  5) Toggleable Seasonal Events (can be turned OFF at any time)
 *  6) Privacy-Checked Safe Content Sharing
 * ============================================================================ */
(() => {
  const SEASONS = [
    { id: 'none', label: '⏸️ إيقاف الأحداث الموسمية', banner: '' },
    { id: 'ramadan', label: '🌙 أجواء رمضان', banner: '🌙 رمضان مبارك — أجواء هادئة ودافئة مفعّلة' },
    { id: 'eid', label: '🎉 أجواء العيد', banner: '🎉 عيد مبارك — كل عام وأنت بخير' },
    { id: 'winter', label: '☕ أجواء الشتاء والمطر', banner: '🌧️ أجواء شتوية دافئة — وقت القهوة والهدوء' },
    { id: 'spring', label: '🌸 أجواء الربيع', banner: '🌸 نسمات الربيع مفعّلة' },
    { id: 'exams', label: '📚 موسم المراجعة والامتحانات', banner: '📚 وضع التركيز والمراجعة مفعّل' },
  ];

  const BADGES = [
    { min: 1, icon: '🌱', name: 'بداية هادئة' },
    { min: 3, icon: '☕', name: 'رفيق منتظم' },
    { min: 6, icon: '⭐', name: 'منجز متوازن' },
    { min: 10, icon: '🌙', name: 'نجمة غزلان' },
  ];

  let extState = loadJSON('rp_extensions_p7_v1', {
    season: 'none',
    ttsRate: 1.0,
    album: [], // { id, charId, title, caption, type, img, ts }
    goals: [
      { id: 'g_init_1', title: 'جلسة مراجعة هادئة 30 دقيقة', cadence: 'daily', due: '', done: false, icon: '📚' },
      { id: 'g_init_2', title: 'شرب الماء وأخذ استراحة قصيرة', cadence: 'daily', due: '', done: false, icon: '💧' },
    ],
    voiceNotes: [], // { id, charId, url, dur, ts }
  });

  const saveExt = () => store.set('rp_extensions_p7_v1', JSON.stringify({
    ...extState,
    album: (extState.album || []).slice(0, 30),
    goals: (extState.goals || []).slice(0, 40),
    voiceNotes: [], // blob URLs are session-scoped
  }));

  let activeExtSub = 'album'; // 'album' | 'calendar' | 'goals' | 'voice' | 'seasonal'

  async function sbRest(path, opts = {}) {
    const cfg = window.GhazlanAPI?.getConfig();
    const sess = window.GhazlanAPI?.getSession();
    if (!cfg?.url || !cfg?.anonKey || !sess?.access_token) return null;
    const r = await fetch(`${cfg.url}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${sess.access_token}`,
        ...(opts.headers || {}),
      },
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  }

  // ---- 1. Voice Call Modal (Web Speech STT + TTS + ai-proxy) ----
  const callBg = document.createElement('div');
  callBg.id = 'p7VoiceCallBg';
  callBg.className = 'modal-bg';
  callBg.innerHTML = `
    <div class="modal" style="text-align:center">
      <h3>📞 مكالمة صوتية مباشرة
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="window.GhazlanExt.closeVoiceCall()">✕</button>
      </h3>
      <div id="p7CallChar" style="font-size:16px;font-weight:700;margin:6px 0">🌙 غزلان</div>
      <div id="p7CallStatus" style="font-size:12.5px;color:var(--muted);margin-bottom:10px">اضغط "تحدث الآن" للمحادثة الصوتية المجانية عبر متصفحك.</div>
      <div id="p7CallLog" class="sec-box" style="max-height:180px;overflow-y:auto;text-align:right;font-size:12.5px">جاهز للمكالمة...</div>
      <div class="row-gap" style="justify-content:center;margin:8px 0">
        <label style="font-size:11.5px;color:var(--muted)">سرعة الصوت:</label>
        <select id="p7TtsRate" onchange="window.GhazlanExt.setTtsRate(Number(this.value))" style="padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
          <option value="0.85">0.85x</option>
          <option value="1" selected>1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
        </select>
      </div>
      <div class="row-gap" style="justify-content:center">
        <button id="p7ListenBtn" class="btn btn-primary" style="flex:1" onclick="window.GhazlanExt.startVoiceTurn()">🎙️ تحدث الآن</button>
        <button class="btn-chip" onclick="window.GhazlanExt.stopSpeaking()">🔇 إيقاف الصوت</button>
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:8px">ℹ️ تستخدم واجهة الصوت المجانية في جهازك (Web Speech) + خادم غزلان الآمن بلا أي اشتراك إضافي.</div>
    </div>`;
  document.body.appendChild(callBg);

  let activeRec = null;
  function speakText(txt) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(txt.replace(/[*_`#]/g, ''));
      u.lang = 'ar-DZ';
      u.rate = Number(extState.ttsRate || 1.0);
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function openVoiceCall() {
    const c = typeof getChat === 'function' ? getChat() : null;
    const ch = c?.type === 'direct' ? getChar(c.charId) : getChar('ghazlan');
    const el = document.getElementById('p7CallChar');
    if (el) el.textContent = `${ch.emoji || '🌙'} ${getDisplayName(ch)}`;
    const rs = document.getElementById('p7TtsRate');
    if (rs) rs.value = String(extState.ttsRate || 1);
    callBg.classList.add('open');
  }

  function closeVoiceCall() {
    try { if (activeRec) activeRec.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    callBg.classList.remove('open');
  }

  function startVoiceTurn() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('المتصفح لا يدعم التعرف الصوتي (جرّب Chrome على أندرويد).'); return; }
    if (!window.GhazlanAPI?.isSignedIn()) { showToast('سجّل الدخول إلى Supabase أولاً.'); return; }
    const st = document.getElementById('p7CallStatus');
    const log = document.getElementById('p7CallLog');
    const rec = new SR();
    activeRec = rec;
    rec.lang = 'ar-DZ';
    rec.interimResults = false;
    rec.onstart = () => { if (st) st.textContent = '🎙️ أستمع إليك الآن...'; };
    rec.onerror = (e) => { if (st) st.textContent = 'تعذر الاستماع: ' + (e.error || 'حاول مجدداً'); };
    rec.onresult = async (ev) => {
      const said = ev.results?.[0]?.[0]?.transcript?.trim();
      if (!said) return;
      if (log) log.innerHTML += `<div style="margin-bottom:4px"><strong>أنت:</strong> ${esc(said)}</div>`;
      if (st) st.textContent = '⏳ جاري الرد...';
      const c = typeof getChat === 'function' ? getChat() : null;
      const ch = c?.type === 'direct' ? getChar(c.charId) : getChar('ghazlan');
      try {
        let reply = '';
        await window.GhazlanAPI.streamChatCompletion({
          provider: settings.provider || 'gemini',
          geminiModel: settings.geminiModel || 'auto',
          systemPrompt: `${buildCharacterPrompt(ch)}\n[وضع مكالمة صوتية] ردي بجملة إلى جملتين قصيرتين وطبيعيتين للحديث الصوتي بدون رموز أو إيموجي كثيرة.`,
          messages: [{ role: 'user', text: said }],
          temperature: 0.85,
          maxTokens: 160,
          fastMode: true,
          autoFallback: true,
          stream: true,
          timezone: window.GhazlanTime?.getTimezone() || 'Africa/Algiers',
        }, (d) => { reply += d; });
        reply = reply.trim() || 'سمعتك جيداً!';
        if (log) { log.innerHTML += `<div style="color:var(--accent3);margin-bottom:6px"><strong>${esc(getDisplayName(ch))}:</strong> ${esc(reply)}</div>`; log.scrollTop = log.scrollHeight; }
        if (st) st.textContent = '🔊 جاري التحدث...';
        speakText(reply);
      } catch (err) {
        if (st) st.textContent = 'خطأ: ' + err.message;
      }
    };
    rec.start();
  }

  // Inject 📞 Voice Call button into Chat Header
  const chatHeaderActions = document.querySelector('#chatScreen header .h-actions');
  if (chatHeaderActions && !document.getElementById('p7CallBtn')) {
    const cb = document.createElement('button');
    cb.id = 'p7CallBtn';
    cb.className = 'icon-btn';
    cb.title = 'مكالمة صوتية مباشرة';
    cb.textContent = '📞';
    cb.onclick = openVoiceCall;
    chatHeaderActions.prepend(cb);
  }

  // ---- Voice Message Recorder (MediaRecorder + Playback Speed) ----
  let mediaRec = null, recChunks = [], isRecording = false;
  async function toggleVoiceNoteRecord() {
    if (isRecording && mediaRec) {
      mediaRec.stop();
      isRecording = false;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast('التسجيل الصوتي غير مدعوم في هذا المتصفح.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunks = [];
      mediaRec = new MediaRecorder(stream);
      mediaRec.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
      mediaRec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        extState.voiceNotes.unshift({ id: 'vn_' + Date.now(), url, ts: Date.now() });
        showToast('تم حفظ المقطع الصوتي بنجاح 🎙️');
        renderExtensionsHub();
      };
      mediaRec.start();
      isRecording = true;
      showToast('🔴 جاري التسجيل... اضغط مرة أخرى للإيقاف');
      renderExtensionsHub();
    } catch {
      showToast('لم يتم منح إذن الميكروفون.');
    }
  }

  // ---- 2. Contextual Scene Card Generator (Local HTML5 Canvas — Zero API Cost) ----
  function generateSceneCard() {
    const cid = document.getElementById('p7AlbChar')?.value || 'ghazlan';
    const title = (document.getElementById('p7AlbTitle')?.value || '').trim() || 'لحظة جميلة';
    const caption = (document.getElementById('p7AlbDesc')?.value || '').trim() || 'ذكرى دافئة محفوظة في الألبوم';
    const ch = getChar(cid);

    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 380;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 640, 380);
    grad.addColorStop(0, '#1b1530');
    grad.addColorStop(0.55, '#3b1d52');
    grad.addColorStop(1, '#c83e6b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 380);

    // Decorative soft stars/circles
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(540, 80, 95, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(90, 320, 75, 0, Math.PI * 2); ctx.fill();

    // Card frame
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 600, 340);

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`${ch.emoji || '🌙'} ${title.slice(0, 28)}`, 590, 105);

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '20px sans-serif';
    const words = caption.split(' ');
    let line = '', y = 165;
    for (const w of words) {
      if ((line + ' ' + w).length > 42) { ctx.fillText(line, 590, y); line = w; y += 34; if (y > 275) break; }
      else line = line ? line + ' ' + w : w;
    }
    if (line && y <= 280) ctx.fillText(line, 590, y);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '15px sans-serif';
    ctx.fillText(`غزلان • ${getDisplayName(ch)} • ${new Date().toLocaleDateString('ar-DZ')}`, 590, 332);

    const img = canvas.toDataURL('image/jpeg', 0.82);
    const item = { id: 'alb_' + Date.now(), charId: cid, title, caption, type: 'scene_card', img, ts: Date.now() };
    extState.album.unshift(item);
    saveExt();
    if (window.GhazlanAPI?.isSignedIn()) {
      const sess = window.GhazlanAPI.getSession();
      if (sess?.user?.id) {
        sbRest('/rest/v1/album_items', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ owner_id: sess.user.id, character_id: cid, title, caption, item_type: 'scene_card', image_data: img }),
        }).catch(() => {});
      }
    }
    showToast('تم إنشاء بطاقة المشهد وحفظها في الألبوم 🖼️');
    renderExtensionsHub();
  }

  function uploadAlbumPhoto(input) {
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        const s = Math.min(1, 640 / img.width);
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL('image/jpeg', 0.75);
        const cid = document.getElementById('p7AlbChar')?.value || 'ghazlan';
        const title = (document.getElementById('p7AlbTitle')?.value || '').trim() || 'صورة محفوظة';
        extState.album.unshift({ id: 'alb_' + Date.now(), charId: cid, title, caption: '', type: 'photo', img: data, ts: Date.now() });
        saveExt();
        showToast('تم حفظ الصورة في الألبوم ✅');
        renderExtensionsHub();
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  function shareAlbumItemSafely(id) {
    const it = extState.album.find((x) => x.id === id);
    if (!it) return;
    if (!confirm('مراجعة الخصوصية: هل أنت متأكد أن هذه الصورة لا تحتوي على بيانات شخصية خاصة قبل تحميلها للمشاركة؟')) return;
    const a = document.createElement('a');
    a.href = it.img;
    a.download = `${(it.title || 'ghazlan_scene').replace(/[^\w\u0600-\u06FF-]+/g, '_')}.jpg`;
    a.click();
    showToast('تم تنزيل البطاقة للمشاركة الآمنة 📤');
  }

  // ---- Seasonal Prompt Hook ----
  const _origBuildP7 = window.buildCharacterPrompt;
  if (typeof _origBuildP7 === 'function') {
    window.buildCharacterPrompt = function (ch, groupChat = null) {
      let sys = _origBuildP7(ch, groupChat);
      if (extState.season && extState.season !== 'none') {
        const s = SEASONS.find((x) => x.id === extState.season);
        if (s) sys += `\n\n[حدث موسمي مفعّل]\n${s.label} — يمكنك الإشارة للأجواء بلطف عند المناسبة.`;
      }
      return sys;
    };
  }

  // ---- Render Extensions Hub ----
  function renderExtensionsHub() {
    const body = document.getElementById('homeBody');
    if (!body) return;
    const chars = typeof characters !== 'undefined' ? characters : [];
    const curSeason = SEASONS.find((s) => s.id === extState.season);

    const topTabs = `
      <div class="p4-subtabs">
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('chars')">🎭 الشخصيات</button>
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('stories')">📖 القصص</button>
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('diaries')">📓 اليوميات</button>
        <button class="p4-subtab" onclick="window.GhazlanWorld.openHub()">🌍 العالم</button>
        <button class="p4-subtab" onclick="window.GhazlanSocial.openHub()">🤝 التفاعل</button>
        <button class="p4-subtab active" onclick="window.GhazlanExt.openHub()">✨ إضافات</button>
      </div>`;

    const pills = `
      <div class="p5-pills">
        <button class="p5-pill ${activeExtSub === 'album' ? 'active' : ''}" onclick="window.GhazlanExt.setSub('album')">🖼️ الألبوم والصور</button>
        <button class="p5-pill ${activeExtSub === 'calendar' ? 'active' : ''}" onclick="window.GhazlanExt.setSub('calendar')">📅 التقويم المشترك</button>
        <button class="p5-pill ${activeExtSub === 'goals' ? 'active' : ''}" onclick="window.GhazlanExt.setSub('goals')">🌿 الأهداف والشارات</button>
        <button class="p5-pill ${activeExtSub === 'voice' ? 'active' : ''}" onclick="window.GhazlanExt.setSub('voice')">🎙️ الصوت</button>
        <button class="p5-pill ${activeExtSub === 'seasonal' ? 'active' : ''}" onclick="window.GhazlanExt.setSub('seasonal')">🌸 موسمي</button>
      </div>`;

    let html = curSeason?.banner ? `<div class="p4-privacy" style="border-style:solid;color:var(--accent3)">${esc(curSeason.banner)}</div>` : '';

    if (activeExtSub === 'album') {
      html += `
        <div class="p5-card">
          <div class="sec-title"><span>🖼️ الألبوم والبطاقات السياقية (${extState.album.length})</span></div>
          <div class="row-gap" style="flex-wrap:wrap">
            <select id="p7AlbChar" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
              ${chars.map((c) => `<option value="${esc(c.id)}">${c.emoji || '🌙'} ${esc(getDisplayName(c))}</option>`).join('')}
            </select>
            <input id="p7AlbTitle" style="flex:2;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="عنوان المشهد أو الصورة..." />
          </div>
          <input id="p7AlbDesc" style="padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="وصف المشهد لتصميم بطاقة سياقية مجانية..." />
          <div class="row-gap" style="flex-wrap:wrap">
            <button class="btn btn-primary" style="flex:1;font-size:12px" onclick="window.GhazlanExt.genCard()">🎨 إنشاء بطاقة مشهد سياقية</button>
            <label class="btn-chip" style="cursor:pointer">📤 رفع صورة للألبوم<input type="file" accept="image/*" style="display:none" onchange="window.GhazlanExt.uploadPhoto(this)" /></label>
          </div>
        </div>
        ${extState.album.map((it) => `
          <div class="p5-card">
            <div class="row-gap" style="justify-content:space-between">
              <strong>${esc(it.title)}</strong>
              <span style="font-size:10.5px;color:var(--muted)">${esc(new Date(it.ts).toLocaleDateString('ar-DZ'))}</span>
            </div>
            <img class="p4-diary-img" src="${esc(it.img)}" alt="${esc(it.title)}" />
            <div class="row-gap">
              <button class="btn-chip" onclick="window.GhazlanExt.shareSafe('${it.id}')">📤 مشاركة آمنة</button>
              <button class="btn-chip" style="color:var(--rose)" onclick="window.GhazlanExt.delAlbum('${it.id}')">🗑️ حذف</button>
            </div>
          </div>`).join('') || `<div style="text-align:center;color:var(--muted);padding:16px;font-size:12px">الألبوم فارغ — صمّم أول بطاقة مشهد أو ارفع صورة.</div>`}`;
    } else if (activeExtSub === 'calendar') {
      const tasks = loadJSON('rp_tasks_cache_v2', []);
      const tl = loadJSON('rp_rel_timeline_v5', []);
      const goals = extState.goals || [];
      html += `
        <div class="p5-card">
          <div class="sec-title"><span>📅 التقويم المشترك (المهام + المناسبات + الأهداف)</span></div>
          <div style="font-size:12px;color:var(--accent3)">⏰ مهام مجدولة: ${tasks.length} • ⏳ محطات العلاقة: ${tl.length} • 🌿 أهداف: ${goals.length}</div>
          ${tasks.map((t) => `<div class="mem-item" style="font-size:12px"><span>⏰ <strong>${esc(t.title)}</strong> — ${t.next_run_at ? esc(new Date(t.next_run_at).toLocaleString('ar-DZ')) : 'مجدولة'}</span></div>`).join('')}
          ${tl.slice(0, 6).map((x) => `<div class="mem-item" style="font-size:12px"><span>⏳ <strong>${esc(x.title)}</strong> — ${esc(new Date(x.date).toLocaleDateString('ar-DZ'))}</span></div>`).join('')}
          ${goals.filter((g) => g.due).map((g) => `<div class="mem-item" style="font-size:12px"><span>${g.icon} <strong>${esc(g.title)}</strong> — موعد: ${esc(g.due)}</span></div>`).join('')}
        </div>`;
    } else if (activeExtSub === 'goals') {
      const doneCount = extState.goals.filter((g) => g.done).length;
      html += `
        <div class="p5-card">
          <div class="sec-title"><span>🌿 الأهداف اليومية والشارات التجميلية (غير قسرية)</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">
            ${BADGES.map((b) => `<span class="p4-badge" style="opacity:${doneCount >= b.min ? '1' : '0.35'}">${b.icon} ${b.name} (${doneCount >= b.min ? 'مكتسبة' : `${b.min}+`})</span>`).join('')}
          </div>
          <div class="row-gap" style="flex-wrap:wrap">
            <input id="p7GoalTitle" style="flex:2;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="أضف هدفاً يومياً أو أسبوعياً..." />
            <input id="p7GoalDue" type="date" style="padding:6px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:11.5px" />
            <button class="btn btn-primary" style="width:auto;padding:7px 12px;font-size:12px" onclick="window.GhazlanExt.addGoal()">➕ إضافة</button>
          </div>
          ${extState.goals.map((g) => `
            <div class="mem-item" style="justify-content:space-between">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12.5px;text-decoration:${g.done ? 'line-through' : 'none'}">
                <input type="checkbox" ${g.done ? 'checked' : ''} onchange="window.GhazlanExt.toggleGoal('${g.id}')" />
                ${g.icon || '🌿'} ${esc(g.title)}
              </label>
              <button class="icon-btn" style="width:24px;height:24px;font-size:11px;color:var(--rose)" onclick="window.GhazlanExt.delGoal('${g.id}')">✕</button>
            </div>`).join('')}
        </div>`;
    } else if (activeExtSub === 'voice') {
      html += `
        <div class="p5-card">
          <div class="sec-title"><span>🎙️ المكالمات والرسائل الصوتية (مجانية عبر الجهاز)</span></div>
          <div class="row-gap" style="flex-wrap:wrap">
            <button class="btn btn-primary" style="flex:1" onclick="window.GhazlanExt.openVoiceCall()">📞 فتح مكالمة صوتية مباشرة</button>
            <button class="btn-chip" onclick="window.GhazlanExt.toggleRecord()">${isRecording ? '⏹️ إيقاف التسجيل' : '🔴 تسجيل رسالة صوتية'}</button>
          </div>
          ${extState.voiceNotes.map((v) => `
            <div class="mem-item" style="flex-direction:column;align-items:stretch;gap:6px;margin-top:6px">
              <audio controls src="${v.url}" style="width:100%" id="aud_${v.id}"></audio>
              <div class="row-gap">
                <span style="font-size:11px;color:var(--muted)">سرعة التشغيل:</span>
                ${[1, 1.25, 1.5, 2].map((sp) => `<button class="btn-chip" onclick="document.getElementById('aud_${v.id}').playbackRate=${sp}">${sp}x</button>`).join('')}
              </div>
            </div>`).join('') || `<div style="font-size:12px;color:var(--muted);margin-top:6px">سجّل مقطعاً صوتياً أو ابدأ مكالمة مباشرة (زر 📞 متاح أيضاً داخل كل محادثة).</div>`}
        </div>`;
    } else {
      html += `
        <div class="p5-card">
          <div class="sec-title"><span>🌸 الأحداث والمواسم الاختيارية</span></div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:6px">اختر موسماً لتفعيل أجوائه في المحادثات، أو أوقفه تماماً في أي وقت.</div>
          ${SEASONS.map((s) => `
            <button class="p4-choice-btn" style="${extState.season === s.id ? 'border-color:var(--accent);font-weight:700' : ''}" onclick="window.GhazlanExt.setSeason('${s.id}')">${esc(s.label)}</button>
          `).join('')}
        </div>`;
    }

    body.innerHTML = topTabs + pills + html;
  }

  // Inject "✨ إضافات" tab into Discover, World, and Social bars
  function injectExtTab() {
    const bar = document.querySelector('#homeBody .p4-subtabs');
    if (bar && !bar.querySelector('[data-p7-tab]')) {
      const b = document.createElement('button');
      b.className = 'p4-subtab';
      b.setAttribute('data-p7-tab', '1');
      b.textContent = '✨ إضافات';
      b.onclick = () => window.GhazlanExt.openHub();
      bar.appendChild(b);
    }
  }

  for (const [obj, fn] of [
    [window.GhazlanDiscover, 'render'],
    [window.GhazlanWorld, 'openHub'],
    [window.GhazlanSocial, 'openHub'],
  ]) {
    if (obj && typeof obj[fn] === 'function') {
      const orig = obj[fn];
      obj[fn] = function (...args) { orig.apply(this, args); injectExtTab(); };
    }
  }

  window.GhazlanExt = {
    openHub: renderExtensionsHub,
    setSub(s) { activeExtSub = s; renderExtensionsHub(); },
    openVoiceCall,
    closeVoiceCall,
    startVoiceTurn,
    stopSpeaking() { try { window.speechSynthesis?.cancel(); } catch {} },
    setTtsRate(r) { extState.ttsRate = r; saveExt(); },
    toggleRecord: toggleVoiceNoteRecord,
    genCard: generateSceneCard,
    uploadPhoto: uploadAlbumPhoto,
    shareSafe: shareAlbumItemSafely,
    delAlbum(id) { extState.album = extState.album.filter((x) => x.id !== id); saveExt(); renderExtensionsHub(); },
    addGoal() {
      const t = (document.getElementById('p7GoalTitle')?.value || '').trim();
      const due = document.getElementById('p7GoalDue')?.value || '';
      if (!t) return;
      extState.goals.unshift({ id: 'g_' + Date.now(), title: t.slice(0, 100), cadence: 'daily', due, done: false, icon: '🌿' });
      saveExt();
      renderExtensionsHub();
    },
    toggleGoal(id) {
      const g = extState.goals.find((x) => x.id === id);
      if (g) { g.done = !g.done; saveExt(); renderExtensionsHub(); }
    },
    delGoal(id) { extState.goals = extState.goals.filter((x) => x.id !== id); saveExt(); renderExtensionsHub(); },
    setSeason(s) { extState.season = s; saveExt(); renderExtensionsHub(); showToast('تم تحديث إعداد الموسم ✅'); },
  };
})();
