/* ============================================================================
 * Ghazlan Phase 5 — Structured Memory, Relationship Timeline & Virtual World
 * (www/memory-world-ui.js)
 * Implements Sections 6 & 9 of Master Project Specification without deleting
 * existing memoriesByChar or breaking Phases 0-4:
 *  1) Structured Categorized Memories (user_fact, preference, shared_event,
 *     promise, char_story) with source, confidence, approval, deduplication,
 *     contradiction detection, sensitive-data guard, JSON export, & top-6
 *     selective relevance retrieval in buildCharacterPrompt
 *  2) Relationship Timeline (first_meet, milestone, conflict, reconciliation,
 *     occasion, trust_shift) per character
 *  3) Character Independence & Realism Controls (initiative, realism,
 *     spontaneity, relSpeed, independence)
 *  4) Lightweight Virtual World & Deterministic Event Engine (default +
 *     custom locations, editable daily schedule, active/low/frozen mode,
 *     mathematical elapsed-time simulation on return with zero background AI)
 * ============================================================================ */
(() => {
  // ---- Styles ----
  const css = document.createElement('style');
  css.id = 'phase5-mw-css';
  css.textContent = `
    .p5-pills { display: flex; gap: 5px; flex-wrap: wrap; margin: 6px; }
    .p5-pill { padding: 6px 10px; border-radius: 99px; border: 1px solid var(--border); background: var(--card); color: var(--muted); font-size: 11.5px; font-weight: 700; cursor: pointer; }
    .p5-pill.active { background: var(--user-bubble); color: #fff; border-color: transparent; }
    .p5-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 10px 11px; margin: 6px; display: flex; flex-direction: column; gap: 6px; }
    .p5-timeline { border-right: 2px solid var(--accent); padding-right: 10px; margin: 6px 4px; display: flex; flex-direction: column; gap: 8px; }
    .p5-tl-item { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 8px 10px; font-size: 12px; }
    .p5-slider-row { display: flex; flex-direction: column; gap: 3px; font-size: 12px; margin-bottom: 6px; }
    .p5-slider-row input[type=range] { width: 100%; accent-color: var(--accent); }
    .p5-slot { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 7px 9px; font-size: 12px; }
    .p5-slot.now { border-color: var(--emerald); }
  `;
  document.head.appendChild(css);

  // ---- Constants ----
  const MEM_CATS = [
    { id: 'user_fact', label: '👤 حقيقة عن المستخدم' },
    { id: 'preference', label: '❤️ تفضيل' },
    { id: 'shared_event', label: '🌟 حدث مشترك' },
    { id: 'promise', label: '🤝 وعد أو موعد' },
    { id: 'char_story', label: '📖 سياق الشخصية والقصة' },
  ];

  const TL_TYPES = [
    { id: 'first_meet', label: '✨ أول لقاء' },
    { id: 'milestone', label: '🏆 حدث مهم' },
    { id: 'conflict', label: '⚡ خلاف' },
    { id: 'reconciliation', label: '🕊️ مصالحة' },
    { id: 'occasion', label: '🎉 مناسبة' },
    { id: 'trust_shift', label: '💛 تطور الثقة' },
  ];

  const DEFAULT_LOCATIONS = ['الجامعة', 'المقهى', 'المنزل', 'الحديقة', 'المكتبة', 'المدينة'];

  const DEFAULT_SCHEDULE_SLOTS = [
    { id: 'morning', label: 'الصباح (06:00–11:00)', startH: 6, endH: 11, location: 'المنزل', activity: 'قهوة الصباح وتنظيم اليوم' },
    { id: 'noon', label: 'الظهيرة (11:00–15:00)', startH: 11, endH: 15, location: 'الجامعة', activity: 'دراسة ومحاضرات وتركيز' },
    { id: 'afternoon', label: 'العصر (15:00–18:00)', startH: 15, endH: 18, location: 'المقهى', activity: 'استراحة خفيفة ومطالعة' },
    { id: 'evening', label: 'المساء (18:00–22:00)', startH: 18, endH: 22, location: 'المنزل', activity: 'هوايات، موسيقى، ودردشة دافئة' },
    { id: 'night', label: 'الليل (22:00–06:00)', startH: 22, endH: 6, location: 'المنزل', activity: 'هدوء واستعداد للنوم' },
  ];

  const DEFAULT_BEHAVIOR = { initiative: 60, realism: 80, spontaneity: 75, relSpeed: 50, independence: 75 };

  // ---- Persistence & Non-Destructive Legacy Memory Sync ----
  let structMems = loadJSON('rp_structured_memories_v5', []);
  let relTimeline = loadJSON('rp_rel_timeline_v5', [
    { id: 'tl_init_1', character_id: 'ghazlan', type: 'first_meet', title: 'أول لقاء مع غزلان', note: 'بداية التعارف والمحادثات اليومية.', date: new Date().toISOString() },
  ]);
  let charBehavior = loadJSON('rp_char_behavior_v5', {});
  let worldState = loadJSON('rp_world_state_v5', {
    mode: 'active', // 'active' | 'low' | 'frozen'
    customLocations: [],
    schedules: {}, // { [charId]: slots[] }
    events: [], // { id, character_id, title, location, category, ts }
    lastTickAt: Date.now(),
  });

  const saveStructMems = () => store.set('rp_structured_memories_v5', JSON.stringify(structMems.slice(0, 400)));
  const saveTimeline = () => store.set('rp_rel_timeline_v5', JSON.stringify(relTimeline.slice(0, 200)));
  const saveBehavior = () => store.set('rp_char_behavior_v5', JSON.stringify(charBehavior));
  const saveWorld = () => store.set('rp_world_state_v5', JSON.stringify({ ...worldState, events: (worldState.events || []).slice(0, 120) }));

  // Migrate any legacy plain-string memoriesByChar into structMems non-destructively
  function syncLegacyMemoriesOnce() {
    if (typeof memoriesByChar !== 'object' || !memoriesByChar) return;
    let changed = false;
    for (const [cid, arr] of Object.entries(memoriesByChar)) {
      if (!Array.isArray(arr)) continue;
      for (const txt of arr) {
        const clean = String(txt || '').trim();
        if (!clean) continue;
        const exists = structMems.some((m) => m.character_id === cid && normalizeAr(m.content) === normalizeAr(clean));
        if (!exists) {
          structMems.push({
            id: 'm_leg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            character_id: cid,
            category: 'user_fact',
            content: clean,
            source: 'legacy',
            confidence: 0.85,
            user_approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          changed = true;
        }
      }
    }
    if (changed) saveStructMems();
  }

  // ---- Arabic Normalization, Deduplication, Contradiction & Sensitive Guard ----
  function normalizeAr(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\w\u0600-\u06FF\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenSet(str) {
    return new Set(normalizeAr(str).split(' ').filter((w) => w.length > 1));
  }

  function jaccard(a, b) {
    const sa = tokenSet(a), sb = tokenSet(b);
    if (!sa.size || !sb.size) return 0;
    let inter = 0;
    for (const w of sa) if (sb.has(w)) inter++;
    return inter / (sa.size + sb.size - inter);
  }

  const SENSITIVE_RX = /(كلمة\s*السر|باسورد|password|pin\s*code|otp|رقم\s*البطاقة|الرقم\s*الوطني|rib|ccp\s*\d{6,}|\b\d{12,19}\b)/i;

  function isContradictory(oldTxt, newTxt) {
    const a = normalizeAr(oldTxt), b = normalizeAr(newTxt);
    const posNeg = (a.includes('احب') && (b.includes('لا احب') || b.includes('اكره'))) ||
                   (b.includes('احب') && (a.includes('لا احب') || a.includes('اكره')));
    if (posNeg && jaccard(a, b) >= 0.35) return true;
    const sameTopic = ['اسكن', 'ادرس', 'اعمل', 'عمري', 'اسمي'].some((k) => a.includes(k) && b.includes(k));
    if (sameTopic && a !== b && jaccard(a, b) >= 0.3) return true;
    return false;
  }

  // ---- Supabase REST Helper ----
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

  async function syncMemToCloud(m) {
    if (!window.GhazlanAPI?.isSignedIn()) return;
    const sess = window.GhazlanAPI.getSession();
    if (!sess?.user?.id) return;
    try {
      await sbRest('/rest/v1/memories', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          owner_id: sess.user.id,
          character_id: m.character_id,
          category: m.category,
          content: m.content,
          source: m.source || 'manual',
          confidence: m.confidence ?? 0.9,
          user_approved: !!m.user_approved,
        }),
      });
    } catch {}
  }

  async function syncEventToCloud(ev) {
    if (!window.GhazlanAPI?.isSignedIn()) return;
    const sess = window.GhazlanAPI.getSession();
    if (!sess?.user?.id) return;
    try {
      await sbRest('/rest/v1/events', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          owner_id: sess.user.id,
          world_id: 'default',
          character_ids: [ev.character_id],
          event_type: ev.event_type || 'world_activity',
          title: ev.title || '',
          location: ev.location || '',
          category: ev.category || 'world_activity',
          payload: ev.payload || {},
          status: 'completed',
        }),
      });
    } catch {}
  }

  // ---- Structured Memory Add / Update with Dedup & Contradiction Check ----
  function upsertStructuredMemory({ character_id, category, content, source = 'manual', confidence = 0.9, user_approved = true }) {
    const clean = String(content || '').trim().slice(0, 320);
    if (!clean) return { status: 'empty' };
    if (source !== 'manual' && SENSITIVE_RX.test(clean)) {
      return { status: 'blocked_sensitive' };
    }
    const charMems = structMems.filter((m) => m.character_id === character_id);
    for (const existing of charMems) {
      const sim = jaccard(existing.content, clean);
      if (sim >= 0.65 || isContradictory(existing.content, clean)) {
        const wasConflict = isContradictory(existing.content, clean);
        existing.content = clean;
        existing.category = category || existing.category;
        existing.confidence = Math.max(existing.confidence || 0.7, confidence);
        existing.user_approved = user_approved;
        existing.updated_at = new Date().toISOString();
        saveStructMems();
        syncMemToCloud(existing);
        return { status: wasConflict ? 'updated_contradiction' : 'updated_duplicate', item: existing };
      }
    }
    const item = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      character_id,
      category: category || 'user_fact',
      content: clean,
      source,
      confidence,
      user_approved,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    structMems.unshift(item);
    saveStructMems();
    syncMemToCloud(item);
    return { status: 'created', item };
  }

  // ---- Selective Relevance Retrieval (Section 9) ----
  function getRelevantMemories(charId, queryText = '', limit = 6) {
    const pool = structMems.filter((m) => m.character_id === charId && m.user_approved);
    if (!pool.length) return [];
    const qTokens = tokenSet(queryText);
    const now = Date.now();
    const scored = pool.map((m) => {
      let score = (m.confidence || 0.75) * 2;
      if (m.category === 'promise') score += 1.4;
      if (m.category === 'user_fact') score += 0.9;
      if (qTokens.size) {
        const mTokens = tokenSet(m.content);
        let hits = 0;
        for (const t of qTokens) if (mTokens.has(t)) hits++;
        score += hits * 2.5;
      }
      const ageDays = Math.max(0, (now - Date.parse(m.updated_at || m.created_at || now)) / 86400000);
      score += Math.max(0, 1.0 - ageDays / 60);
      return { m, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((x) => x.m);
  }

  // ---- Virtual World & Deterministic Event Engine (Section 6) ----
  function getScheduleForChar(charId) {
    if (!worldState.schedules) worldState.schedules = {};
    if (!Array.isArray(worldState.schedules[charId]) || !worldState.schedules[charId].length) {
      worldState.schedules[charId] = DEFAULT_SCHEDULE_SLOTS.map((s) => ({ ...s }));
    }
    return worldState.schedules[charId];
  }

  function getSlotForHour(slots, hour) {
    for (const s of slots) {
      if (s.startH < s.endH) {
        if (hour >= s.startH && hour < s.endH) return s;
      } else {
        if (hour >= s.startH || hour < s.endH) return s;
      }
    }
    return slots[0];
  }

  function getCurrentHourInTz() {
    const tz = window.GhazlanTime?.getTimezone() || 'Africa/Algiers';
    try {
      const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(new Date()));
      return Number.isFinite(h) ? h % 24 : new Date().getHours();
    } catch {
      return new Date().getHours();
    }
  }

  function runDeterministicWorldTick(forceLog = false) {
    if (worldState.mode === 'frozen') return { skipped: true, reason: 'frozen', added: 0 };
    const now = Date.now();
    const elapsedMin = Math.round((now - (worldState.lastTickAt || now)) / 60000);
    const thresholdMin = worldState.mode === 'low' ? 120 : 30;
    if (!forceLog && elapsedMin < thresholdMin) return { skipped: true, reason: 'recent', added: 0, elapsedMin };

    const hr = getCurrentHourInTz();
    let added = 0;
    const activeChars = (typeof characters !== 'undefined' ? characters : []).slice(0, worldState.mode === 'low' ? 2 : 5);
    for (const ch of activeChars) {
      const slots = getScheduleForChar(ch.id);
      const cur = getSlotForHour(slots, hr);
      if (!cur) continue;
      // Update character's live status activity deterministically without AI calls
      if (ch.status) ch.status.activity = `${cur.activity} (${cur.location})`;
      const title = `${getDisplayName(ch)} الآن في ${cur.location}: ${cur.activity}`;
      const lastEv = (worldState.events || []).find((e) => e.character_id === ch.id);
      if (forceLog || !lastEv || lastEv.title !== title || now - lastEv.ts > 3600000) {
        const ev = {
          id: 'ev_' + now + '_' + ch.id,
          character_id: ch.id,
          event_type: 'world_activity',
          category: 'schedule_transition',
          title,
          location: cur.location,
          activity: cur.activity,
          elapsedMin,
          ts: now,
        };
        worldState.events.unshift(ev);
        syncEventToCloud(ev);
        added++;
      }
    }
    worldState.lastTickAt = now;
    saveWorld();
    if (typeof saveCharacters === 'function') saveCharacters();
    return { skipped: false, added, elapsedMin };
  }

  // ---- Hook buildCharacterPrompt for Selective Memory + Behavior + Virtual World ----
  const _origBuildPrompt = window.buildCharacterPrompt;
  if (typeof _origBuildPrompt === 'function') {
    window.buildCharacterPrompt = function (ch, groupChat = null) {
      let sys = _origBuildPrompt(ch, groupChat);
      try {
        // 1. Replace bloated raw memory dump with top-6 selectively retrieved structured memories
        const activeChat = typeof getChat === 'function' ? getChat() : null;
        const lastUserMsg = [...(activeChat?.messages || [])].reverse().find((m) => m.role === 'user')?.text || '';
        const topMems = getRelevantMemories(ch.id, lastUserMsg, 6);
        if (topMems.length) {
          const catMap = Object.fromEntries(MEM_CATS.map((c) => [c.id, c.label]));
          sys += `\n\n[ذكريات منتقاة ذات صلة بهذه الرسالة فقط]\n` +
            topMems.map((m) => `- (${catMap[m.category] || m.category}) ${m.content}`).join('\n');
        }

        // 2. Inject Character Independence & Realism settings
        const beh = { ...DEFAULT_BEHAVIOR, ...(charBehavior[ch.id] || {}) };
        sys += `\n\n[إعدادات الشخصية المستقلة]\nالواقعية: ${beh.realism}% | الاستقلالية في الرأي: ${beh.independence}% | العفوية: ${beh.spontaneity}% | المبادرة: ${beh.initiative}%.` +
          `\nلديكِ آراء وحدود وطباع مستقلة؛ يمكنك الاختلاف بلطف وإبداء رأيك بصدق دون إهانة أو تلاعب أو خلق اعتماد قهري.`;

        // 3. Inject Lightweight Virtual World current activity (when not frozen)
        if (worldState.mode !== 'frozen') {
          const slots = getScheduleForChar(ch.id);
          const cur = getSlotForHour(slots, getCurrentHourInTz());
          if (cur) {
            sys += `\n\n[العالم الافتراضي الحالي]\nمكانك الحالي: ${cur.location} | نشاطك المجدول الآن: ${cur.activity}. اذكري ذلك بطبيعية فقط إذا كان مناسباً للحوار.`;
          }
        }
      } catch {}
      return sys;
    };
  }

  // ---- UI State inside "🌍 العالم والذاكرة" ----
  let subSection = 'memories'; // 'memories' | 'timeline' | 'world' | 'behavior'
  let selectedCharId = 'ghazlan';
  let memCatFilter = 'all';

  function getAllLocations() {
    return [...DEFAULT_LOCATIONS, ...(worldState.customLocations || [])];
  }

  function renderWorldAndMemoryView() {
    const body = document.getElementById('homeBody');
    if (!body) return;
    if (!characters.some((c) => c.id === selectedCharId)) selectedCharId = characters[0]?.id || 'ghazlan';
    const ch = getChar(selectedCharId);

    const topTabs = `
      <div class="p4-subtabs">
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('chars')">🎭 الشخصيات</button>
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('stories')">📖 القصص</button>
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('diaries')">📓 اليوميات</button>
        <button class="p4-subtab active" onclick="window.GhazlanWorld.openHub()">🌍 العالم والذاكرة</button>
      </div>`;

    const charPicker = `
      <div class="sec-box" style="margin:6px">
        <div class="row-gap">
          <label style="font-size:12px;color:var(--muted)">الشخصية:</label>
          <select style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12.5px" onchange="window.GhazlanWorld.setChar(this.value)">
            ${characters.map((c) => `<option value="${esc(c.id)}" ${c.id === selectedCharId ? 'selected' : ''}>${c.emoji || '🌙'} ${esc(getDisplayName(c))}</option>`).join('')}
          </select>
        </div>
        <div class="p5-pills" style="margin:8px 0 0">
          <button class="p5-pill ${subSection === 'memories' ? 'active' : ''}" onclick="window.GhazlanWorld.setSection('memories')">🧠 الذاكرة المنظمة</button>
          <button class="p5-pill ${subSection === 'timeline' ? 'active' : ''}" onclick="window.GhazlanWorld.setSection('timeline')">⏳ سجل العلاقة</button>
          <button class="p5-pill ${subSection === 'world' ? 'active' : ''}" onclick="window.GhazlanWorld.setSection('world')">🌍 العالم والجدول</button>
          <button class="p5-pill ${subSection === 'behavior' ? 'active' : ''}" onclick="window.GhazlanWorld.setSection('behavior')">⚖️ الاستقلالية</button>
        </div>
      </div>`;

    let contentHtml = '';

    if (subSection === 'memories') {
      const list = structMems.filter((m) => m.character_id === selectedCharId && (memCatFilter === 'all' || m.category === memCatFilter));
      contentHtml = `
        <div class="p5-card">
          <div class="sec-title">
            <span>🧠 ذاكرة ${esc(getDisplayName(ch))} (${list.length})</span>
            <button class="btn-chip" onclick="window.GhazlanWorld.exportMems()">📤 تصدير JSON</button>
          </div>
          <div class="row-gap" style="flex-wrap:wrap">
            <select id="p5MemCatAdd" style="flex:1;min-width:130px;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
              ${MEM_CATS.map((c) => `<option value="${c.id}">${c.label}</option>`).join('')}
            </select>
            <input id="p5MemInput" style="flex:2;min-width:160px;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="أضف ذكرى منظمة (مع كشف التكرار والتناقض)..." />
            <button class="btn btn-primary" style="width:auto;padding:7px 12px;font-size:12px" onclick="window.GhazlanWorld.addMem()">➕ حفظ</button>
          </div>
          <div class="p5-pills" style="margin:4px 0 0">
            <button class="p5-pill ${memCatFilter === 'all' ? 'active' : ''}" onclick="window.GhazlanWorld.setMemCat('all')">الكل</button>
            ${MEM_CATS.map((c) => `<button class="p5-pill ${memCatFilter === c.id ? 'active' : ''}" onclick="window.GhazlanWorld.setMemCat('${c.id}')">${c.label}</button>`).join('')}
          </div>
          <div style="font-size:11px;color:var(--muted)">🎯 يتم استرجاع أهم 6 ذكريات موافق عليها فقط لكل رسالة لتوفير التكلفة ورفع الدقة، مع منع الحفظ التلقائي للمعلومات الحساسة.</div>
        </div>
        ${list.length ? list.map((m) => {
          const catL = MEM_CATS.find((c) => c.id === m.category)?.label || m.category;
          const dt = new Date(m.updated_at || m.created_at).toLocaleDateString('ar-DZ');
          return `<div class="p5-card">
            <div class="row-gap" style="justify-content:space-between">
              <span class="p4-badge">${esc(catL)}</span>
              <span style="font-size:10.5px;color:var(--muted)">ثقة ${Math.round((m.confidence || 0.8) * 100)}% • ${esc(dt)}</span>
            </div>
            <div style="font-size:13px;line-height:1.5">${esc(m.content)}</div>
            <div class="row-gap" style="flex-wrap:wrap">
              <button class="btn-chip" onclick="window.GhazlanWorld.toggleApprove('${m.id}')">${m.user_approved ? '✅ مفعّلة في الردود' : '⏸️ معلّقة (بانتظار موافقتك)'}</button>
              <button class="btn-chip" onclick="window.GhazlanWorld.editMem('${m.id}')">✏️ تعديل</button>
              <button class="btn-chip" style="color:var(--rose)" onclick="window.GhazlanWorld.delMem('${m.id}')">🗑️ حذف</button>
            </div>
          </div>`;
        }).join('') : `<div style="text-align:center;color:var(--muted);padding:18px;font-size:12.5px">لا توجد ذكريات في هذا التصنيف بعد.</div>`}`;
    } else if (subSection === 'timeline') {
      const list = relTimeline.filter((t) => t.character_id === selectedCharId);
      contentHtml = `
        <div class="p5-card">
          <div class="sec-title"><span>⏳ سجل العلاقة الزمني مع ${esc(getDisplayName(ch))}</span></div>
          <div class="row-gap" style="flex-wrap:wrap">
            <select id="p5TlType" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
              ${TL_TYPES.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}
            </select>
            <input id="p5TlTitle" style="flex:2;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="عنوان المحطة (مثلاً: أول نقاش عميق)..." />
          </div>
          <input id="p5TlNote" style="padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="تفاصيل مختصرة (اختياري)..." />
          <button class="btn btn-primary" style="font-size:12.5px" onclick="window.GhazlanWorld.addTimeline()">➕ إضافة محطة للسجل الزمني</button>
        </div>
        <div class="p5-timeline">
          ${list.length ? list.map((t) => {
            const tl = TL_TYPES.find((x) => x.id === t.type)?.label || t.type;
            return `<div class="p5-tl-item">
              <div class="row-gap" style="justify-content:space-between">
                <strong>${esc(tl)} — ${esc(t.title)}</strong>
                <button class="icon-btn" style="width:24px;height:24px;font-size:11px;color:var(--rose)" onclick="window.GhazlanWorld.delTimeline('${t.id}')">✕</button>
              </div>
              ${t.note ? `<div style="color:var(--muted);margin-top:4px">${esc(t.note)}</div>` : ''}
              <div style="font-size:10.5px;color:var(--muted);margin-top:4px">${esc(new Date(t.date).toLocaleString('ar-DZ'))}</div>
            </div>`;
          }).join('') : `<div style="color:var(--muted);font-size:12px">لا توجد محطات مسجلة بعد.</div>`}
        </div>`;
    } else if (subSection === 'world') {
      const slots = getScheduleForChar(selectedCharId);
      const curHour = getCurrentHourInTz();
      const curSlot = getSlotForHour(slots, curHour);
      const locs = getAllLocations();
      const evs = (worldState.events || []).filter((e) => e.character_id === selectedCharId).slice(0, 12);
      contentHtml = `
        <div class="p4-privacy">⚡ <strong>محرك عالم خفيف ومنضبط:</strong> يعمل حسابياً عند عودتك دون تشغيل الذكاء الاصطناعي في الخلفية لتوفير البطارية والتكلفة.</div>
        <div class="p5-card">
          <div class="sec-title"><span>🌍 حالة العالم الافتراضي</span></div>
          <div class="row-gap" style="flex-wrap:wrap">
            <select style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" onchange="window.GhazlanWorld.setWorldMode(this.value)">
              <option value="active" ${worldState.mode === 'active' ? 'selected' : ''}>🟢 نشط (تحديث طبيعي عند العودة)</option>
              <option value="low" ${worldState.mode === 'low' ? 'selected' : ''}>🟡 نشاط منخفض (توفير أكبر)</option>
              <option value="frozen" ${worldState.mode === 'frozen' ? 'selected' : ''}>❄️ مجمّد / متوقف</option>
            </select>
            <button class="btn-chip" onclick="window.GhazlanWorld.runTickNow()">⏩ محاكاة الوقت الفاصل</button>
          </div>
          <div style="font-size:12px;color:var(--emerald)">📍 النشاط الحالي لـ ${esc(getDisplayName(ch))}: <strong>${esc(curSlot?.location || '')}</strong> — ${esc(curSlot?.activity || '')}</div>
          <div class="row-gap" style="margin-top:4px">
            <input id="p5NewLoc" style="flex:1;padding:6px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="أضف موقعاً افتراضياً مخصصاً (مثلاً: البحر، الورشة)..." />
            <button class="btn-chip" onclick="window.GhazlanWorld.addLocation()">➕ موقع</button>
          </div>
        </div>
        <div class="p5-card">
          <div class="sec-title"><span>🗓️ جدول الحياة اليومي لـ ${esc(getDisplayName(ch))}</span></div>
          ${slots.map((s, idx) => `
            <div class="p5-slot ${curSlot?.id === s.id ? 'now' : ''}">
              <strong style="min-width:125px;font-size:11.5px">${curSlot?.id === s.id ? '🟢 ' : ''}${esc(s.label)}</strong>
              <select style="padding:4px 6px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:11.5px" onchange="window.GhazlanWorld.updateSlot(${idx}, 'location', this.value)">
                ${locs.map((l) => `<option value="${esc(l)}" ${s.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}
              </select>
              <input style="flex:1;min-width:130px;padding:4px 7px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:11.5px" value="${esc(s.activity)}" onchange="window.GhazlanWorld.updateSlot(${idx}, 'activity', this.value)" />
            </div>`).join('')}
        </div>
        <div class="p5-card">
          <div class="sec-title"><span>📜 سجل أحداث العالم (${evs.length})</span></div>
          ${evs.length ? evs.map((e) => `<div class="mem-item" style="font-size:11.5px"><span>📍 ${esc(e.title)} — <em style="color:var(--muted)">${esc(new Date(e.ts).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }))}</em></span></div>`).join('') : `<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px">اضغط "محاكاة الوقت الفاصل" لتسجيل أول حدث افتراضي.</div>`}
        </div>`;
    } else {
      const beh = { ...DEFAULT_BEHAVIOR, ...(charBehavior[selectedCharId] || {}) };
      const sliders = [
        { k: 'initiative', label: '💬 مستوى المبادرة' },
        { k: 'realism', label: '🎯 واقعية السلوك' },
        { k: 'spontaneity', label: '✨ عفوية الرد' },
        { k: 'relSpeed', label: '🌱 سرعة تطور العلاقة' },
        { k: 'independence', label: '⚖️ استقلالية الشخصية (إبداء رأي مستقل بلطف)' },
      ];
      contentHtml = `
        <div class="p5-card">
          <div class="sec-title"><span>⚖️ إعدادات استقلالية ${esc(getDisplayName(ch))}</span></div>
          ${sliders.map((sl) => `
            <div class="p5-slider-row">
              <div class="row-gap" style="justify-content:space-between"><span>${sl.label}</span><strong>${beh[sl.k]}%</strong></div>
              <input type="range" min="10" max="100" value="${beh[sl.k]}" oninput="window.GhazlanWorld.setBehavior('${sl.k}', Number(this.value))" />
            </div>`).join('')}
          <div class="p4-privacy" style="margin:4px 0 0">ℹ️ <strong>توضيح مهم:</strong> مؤشرات المزاج والدفء والثقة والتوتر هي حالات محاكاة داخل الشخصية فقط، وليست قياسات نفسية حقيقية للمستخدم.</div>
        </div>`;
    }

    body.innerHTML = topTabs + charPicker + contentHtml;
  }

  // ---- Hook Discover Sub-tabs to expose "🌍 العالم والذاكرة" ----
  if (window.GhazlanDiscover && typeof window.GhazlanDiscover.render === 'function') {
    const _origDiscRender = window.GhazlanDiscover.render;
    window.GhazlanDiscover.render = function () {
      _origDiscRender();
      const bar = document.querySelector('#homeBody .p4-subtabs');
      if (bar && !bar.querySelector('[data-p5-tab]')) {
        const b = document.createElement('button');
        b.className = 'p4-subtab';
        b.setAttribute('data-p5-tab', '1');
        b.textContent = '🌍 العالم والذاكرة';
        b.onclick = () => window.GhazlanWorld.openHub();
        bar.appendChild(b);
      }
    };
  }

  // ---- Hook Character Info Drawer (#infoDrawer) for Direct Access from Chat ----
  const _origOpenInfoP5 = window.openChatInfo;
  if (typeof _origOpenInfoP5 === 'function') {
    window.openChatInfo = function () {
      _origOpenInfoP5();
      const c = typeof getChat === 'function' ? getChat() : null;
      const body = document.getElementById('infoDrawerBody');
      if (!c || c.type !== 'direct' || !body || body.querySelector('#p5InfoShortcut')) return;
      const ch = getChar(c.charId);
      const curSlot = getSlotForHour(getScheduleForChar(ch.id), getCurrentHourInTz());
      const memCount = structMems.filter((m) => m.character_id === ch.id && m.user_approved).length;
      const card = document.createElement('div');
      card.id = 'p5InfoShortcut';
      card.className = 'sec-box';
      card.innerHTML = `
        <div class="sec-title"><span>🌍 العالم والذاكرة المنظمة (المرحلة 5)</span></div>
        <div style="font-size:12px;color:var(--muted)">📍 الآن: ${esc(curSlot?.location || 'المنزل')} — ${esc(curSlot?.activity || '')}</div>
        <div style="font-size:12px;color:var(--muted)">🧠 الذكريات المنظمة المفعّلة: <strong>${memCount}</strong></div>
        <div class="row-gap" style="flex-wrap:wrap;margin-top:6px">
          <button class="btn-chip" onclick="closeInfoDrawer();goHome();switchHomeTab('discover');window.GhazlanWorld.openHub('${esc(ch.id)}','memories')">🧠 إدارة الذاكرة</button>
          <button class="btn-chip" onclick="closeInfoDrawer();goHome();switchHomeTab('discover');window.GhazlanWorld.openHub('${esc(ch.id)}','timeline')">⏳ سجل العلاقة</button>
          <button class="btn-chip" onclick="closeInfoDrawer();goHome();switchHomeTab('discover');window.GhazlanWorld.openHub('${esc(ch.id)}','world')">🗓️ جدول العالم</button>
        </div>`;
      body.appendChild(card);
    };
  }

  // ---- Public API ----
  window.GhazlanWorld = {
    openHub(cid, sec) {
      if (cid) selectedCharId = cid;
      if (sec) subSection = sec;
      renderWorldAndMemoryView();
    },
    setChar(cid) { selectedCharId = cid; renderWorldAndMemoryView(); },
    setSection(sec) { subSection = sec; renderWorldAndMemoryView(); },
    setMemCat(cat) { memCatFilter = cat; renderWorldAndMemoryView(); },
    addMem() {
      const inp = document.getElementById('p5MemInput');
      const cat = document.getElementById('p5MemCatAdd')?.value || 'user_fact';
      const txt = inp?.value?.trim();
      if (!txt) { showToast('اكتب نص الذكرى أولاً.'); return; }
      const res = upsertStructuredMemory({ character_id: selectedCharId, category: cat, content: txt, source: 'manual', confidence: 0.95, user_approved: true });
      if (inp) inp.value = '';
      if (res.status === 'updated_duplicate') showToast('تم تحديث ذكرى مشابهة تلقائياً لمنع التكرار ♻️');
      else if (res.status === 'updated_contradiction') showToast('تم اكتشاف تناقض وتحديث الذكرى القديمة تلقائياً ⚖️');
      else showToast('تم حفظ الذكرى المنظمة بنجاح 🧠');
      renderWorldAndMemoryView();
    },
    toggleApprove(id) {
      const m = structMems.find((x) => x.id === id);
      if (!m) return;
      m.user_approved = !m.user_approved;
      saveStructMems();
      renderWorldAndMemoryView();
    },
    editMem(id) {
      const m = structMems.find((x) => x.id === id);
      if (!m) return;
      const nv = prompt('تعديل نص الذكرى:', m.content);
      if (nv !== null && nv.trim()) {
        m.content = nv.trim().slice(0, 320);
        m.updated_at = new Date().toISOString();
        saveStructMems();
        renderWorldAndMemoryView();
      }
    },
    delMem(id) {
      structMems = structMems.filter((x) => x.id !== id);
      saveStructMems();
      renderWorldAndMemoryView();
      showToast('تم حذف الذكرى 🗑️');
    },
    exportMems() {
      const list = structMems.filter((m) => m.character_id === selectedCharId);
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), character_id: selectedCharId, memories: list }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ghazlan_memories_${selectedCharId}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      showToast('تم تصدير الذكريات بصيغة JSON 📤');
    },
    addTimeline() {
      const type = document.getElementById('p5TlType')?.value || 'milestone';
      const title = document.getElementById('p5TlTitle')?.value?.trim();
      const note = document.getElementById('p5TlNote')?.value?.trim() || '';
      if (!title) { showToast('اكتب عنوان المحطة أولاً.'); return; }
      const item = { id: 'tl_' + Date.now(), character_id: selectedCharId, type, title: title.slice(0, 120), note: note.slice(0, 260), date: new Date().toISOString() };
      relTimeline.unshift(item);
      saveTimeline();
      syncEventToCloud({ character_id: selectedCharId, event_type: 'relationship_milestone', category: type, title, payload: { note } });
      renderWorldAndMemoryView();
      showToast('تمت إضافة المحطة إلى سجل العلاقة ⏳');
    },
    delTimeline(id) {
      relTimeline = relTimeline.filter((x) => x.id !== id);
      saveTimeline();
      renderWorldAndMemoryView();
    },
    setWorldMode(mode) {
      worldState.mode = mode;
      saveWorld();
      renderWorldAndMemoryView();
      showToast(mode === 'frozen' ? 'تم تجميد العالم الافتراضي ❄️' : 'تم تحديث وضع العالم الافتراضي ✅');
    },
    addLocation() {
      const inp = document.getElementById('p5NewLoc');
      const v = inp?.value?.trim().slice(0, 40);
      if (!v) return;
      worldState.customLocations = worldState.customLocations || [];
      if (!getAllLocations().includes(v)) {
        worldState.customLocations.push(v);
        saveWorld();
        showToast(`تمت إضافة موقع "${v}" 📍`);
      }
      renderWorldAndMemoryView();
    },
    updateSlot(idx, field, val) {
      const slots = getScheduleForChar(selectedCharId);
      if (slots[idx]) {
        slots[idx][field] = String(val || '').slice(0, 90);
        saveWorld();
        showToast('تم حفظ تعديل الجدول اليومي ✅');
      }
    },
    runTickNow() {
      const res = runDeterministicWorldTick(true);
      showToast(res.skipped ? 'العالم مجمّد حالياً ❄️' : `تمت محاكاة الوقت حسابياً وتسجيل ${res.added} حدث ✅`);
      renderWorldAndMemoryView();
    },
    setBehavior(k, v) {
      if (!charBehavior[selectedCharId]) charBehavior[selectedCharId] = { ...DEFAULT_BEHAVIOR };
      charBehavior[selectedCharId][k] = v;
      saveBehavior();
      renderWorldAndMemoryView();
    },
    getRelevantMemories,
    upsertStructuredMemory,
  };

  // Run non-destructive migration & lightweight return-tick on app open (zero AI cost)
  syncLegacyMemoriesOnce();
  setTimeout(() => runDeterministicWorldTick(false), 1200);
})();
