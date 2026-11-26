/* ============================================================================
 * Ghazlan Phase 6 — Inter-Character Social Interaction Engine (www/social-p6-ui.js)
 * Implements Section 10 of Master Project Specification:
 *  1) Character-to-Character Relationships (friendship, acquaintance, story kin,
 *     rivalry, fictional disagreement) with date, closeness, shared interests
 *  2) Master enable/disable toggle + per-character allowlist
 *  3) Bounded Shared Events (meetup, debate, teamwork, disagreement) with HARD
 *     turn/call budget (2–4 turns max) so characters NEVER loop infinitely
 *  4) Group chat prompt enhancement: injects inter-character relationships +
 *     strict anti-repetition rule for natural turn-taking
 * ============================================================================ */
(() => {
  const REL_TYPES = [
    { id: 'friendship', label: '🤝 صداقة' },
    { id: 'acquaintance', label: '👋 معرفة' },
    { id: 'story_kin', label: '🌿 قرابة قصصية' },
    { id: 'rivalry', label: '⚔️ منافسة ودية' },
    { id: 'fictional_conflict', label: '⚡ خلاف قصصي' },
  ];

  const SHARED_EVENT_TYPES = [
    { id: 'meetup', label: '☕ لقاء في مكان افتراضي' },
    { id: 'debate', label: '💬 نقاش فكري أو يومي' },
    { id: 'teamwork', label: '🛠️ تعاون في مهمة' },
    { id: 'disagreement', label: '⚖️ اختلاف محترم في الرأي' },
  ];

  let socialCfg = loadJSON('rp_social_p6_v1', {
    enabled: true,
    maxTurnsBudget: 3, // Hard cap 2..4 to prevent infinite loops & excess cost
    allowedChars: [], // empty = all characters allowed
    relationships: [], // { id, charA, charB, type, level, interests, since, lastEvent }
    sharedEvents: [], // { id, type, title, location, participants[], turns:[{charId,name,text}], ts }
  });

  const saveSocial = () => store.set('rp_social_p6_v1', JSON.stringify({
    ...socialCfg,
    sharedEvents: (socialCfg.sharedEvents || []).slice(0, 30),
  }));

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

  async function syncRelToCloud(rel) {
    if (!window.GhazlanAPI?.isSignedIn()) return;
    const sess = window.GhazlanAPI.getSession();
    if (!sess?.user?.id) return;
    try {
      await sbRest('/rest/v1/relationships', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          owner_id: sess.user.id,
          character_a: rel.charA,
          character_b: rel.charB,
          relationship_type: rel.type,
          state: { level: rel.level, interests: rel.interests, since: rel.since, lastEvent: rel.lastEvent || '' },
          history_ref: [],
        }),
      });
    } catch {}
  }

  function isCharAllowed(cid) {
    if (!socialCfg.enabled) return false;
    if (!Array.isArray(socialCfg.allowedChars) || !socialCfg.allowedChars.length) return true;
    return socialCfg.allowedChars.includes(cid);
  }

  // ---- Hook buildCharacterPrompt for Group Chat Relationships + Anti-Repetition ----
  const _origBuildP6 = window.buildCharacterPrompt;
  if (typeof _origBuildP6 === 'function') {
    window.buildCharacterPrompt = function (ch, groupChat = null) {
      let sys = _origBuildP6(ch, groupChat);
      try {
        if (groupChat && groupChat.type === 'group' && socialCfg.enabled) {
          const others = (groupChat.members || []).filter((id) => id !== ch.id);
          const relLines = [];
          for (const oid of others) {
            const rel = (socialCfg.relationships || []).find((r) =>
              (r.charA === ch.id && r.charB === oid) || (r.charA === oid && r.charB === ch.id)
            );
            if (rel) {
              const rLabel = REL_TYPES.find((x) => x.id === rel.type)?.label || rel.type;
              relLines.push(`- علاقتك مع ${getDisplayName(getChar(oid))}: ${rLabel} (قوة المعرفة ${rel.level}%، اهتمامات مشتركة: ${rel.interests || 'متنوعة'}).`);
            }
          }
          if (relLines.length) sys += `\n\n[علاقاتك داخل المجموعة]\n${relLines.join('\n')}`;
          sys += `\n[قاعدة تناوب المجموعة ومنع التكرار]\nلا تكرري كلام المتحدث السابق ولا تعيدي نفس الجمل؛ أضيفي رأياً أو زاوية جديدة قصيرة وتفاعلي بطبيعية مع من سبقك.`;
        }
      } catch {}
      return sys;
    };
  }

  // ---- Bounded Shared Event Runner (Hard Call Budget, Zero Infinite Loops) ----
  let eventRunning = false;

  async function runSharedEvent() {
    if (!socialCfg.enabled) { showToast('تفاعل الشخصيات معطّل حالياً من الإعدادات.'); return; }
    if (eventRunning) { showToast('يوجد حدث مشترك قيد التنفيذ الآن...'); return; }
    const cA = document.getElementById('p6EvA')?.value;
    const cB = document.getElementById('p6EvB')?.value;
    const evType = document.getElementById('p6EvType')?.value || 'meetup';
    const topic = (document.getElementById('p6EvTopic')?.value || '').trim() || 'حديث عفوي حول يومنا';
    const loc = (document.getElementById('p6EvLoc')?.value || '').trim() || 'المقهى';

    if (!cA || !cB || cA === cB) { showToast('اختر شخصيتين مختلفتين للحدث المشترك.'); return; }
    if (!isCharAllowed(cA) || !isCharAllowed(cB)) { showToast('إحدى الشخصيتين غير مسموح لها بالتفاعل في قائمة السماح.'); return; }

    const budget = Math.min(4, Math.max(2, Number(socialCfg.maxTurnsBudget || 3)));
    const charA = getChar(cA), charB = getChar(cB);
    const rel = (socialCfg.relationships || []).find((r) =>
      (r.charA === cA && r.charB === cB) || (r.charA === cB && r.charB === cA)
    );
    const evLabel = SHARED_EVENT_TYPES.find((e) => e.id === evType)?.label || evType;

    eventRunning = true;
    const btn = document.getElementById('p6RunEvBtn');
    if (btn) { btn.disabled = true; btn.textContent = `⏳ جاري تشغيل الحدث (بحد أقصى ${budget} أدوار)...`; }

    const turns = [];
    const cast = [charA, charB];
    try {
      for (let i = 0; i < budget; i++) {
        const speaker = cast[i % 2];
        const partner = cast[(i + 1) % 2];
        let line = `${getDisplayName(speaker)}: (${loc}) ${i === 0 ? `أهلاً يا ${getDisplayName(partner)}، بخصوص ${topic}...` : 'فكرة جميلة فعلاً، وأنا أرى الأمر من زاوية أخرى أيضاً!'}`;

        if (window.GhazlanAPI?.isSignedIn()) {
          const histTxt = turns.map((t) => `${t.name}: ${t.text}`).join('\n');
          const sys = `${buildCharacterPrompt(speaker)}\n[حدث مشترك منضبط — الدور ${i + 1} من ${budget}]\nالمكان: ${loc} | نوع الحدث: ${evLabel} | الموضوع: ${topic}.\nأنت تتحدث مع ${getDisplayName(partner)}${rel ? ` (العلاقة: ${rel.type})` : ''}.\nاكتب رداً قصيراً (جملة أو جملتين فقط) دون تكرار كلام سابق ودون فتح موضوع لانهائي.`;
          let out = '';
          try {
            await window.GhazlanAPI.streamChatCompletion({
              provider: settings.provider || 'gemini',
              geminiModel: settings.geminiModel || 'auto',
              systemPrompt: sys,
              messages: [{ role: 'user', text: histTxt ? `الحوار حتى الآن:\n${histTxt}\n\nأضف دورك الآن:` : `ابدأ الحوار حول: ${topic}` }],
              temperature: 0.85,
              maxTokens: 140,
              fastMode: true,
              autoFallback: true,
              stream: true,
              timezone: window.GhazlanTime?.getTimezone() || 'Africa/Algiers',
            }, (delta) => { out += delta; });
            if (out.trim()) line = out.trim();
          } catch {}
        }
        turns.push({ charId: speaker.id, name: getDisplayName(speaker), text: line });
      }

      const evObj = {
        id: 'sev_' + Date.now(),
        type: evType,
        title: topic,
        location: loc,
        participants: [cA, cB],
        turns,
        ts: Date.now(),
      };
      socialCfg.sharedEvents.unshift(evObj);
      if (rel) { rel.lastEvent = topic; syncRelToCloud(rel); }
      saveSocial();
      showToast(`اكتمل الحدث المشترك بنجاح ضمن ميزانية ${budget} أدوار ✅`);
    } finally {
      eventRunning = false;
      renderSocialHub();
    }
  }

  // ---- UI Rendering ----
  function renderSocialHub() {
    const body = document.getElementById('homeBody');
    if (!body) return;
    const chars = typeof characters !== 'undefined' ? characters : [];

    const topTabs = `
      <div class="p4-subtabs">
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('chars')">🎭 الشخصيات</button>
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('stories')">📖 القصص</button>
        <button class="p4-subtab" onclick="window.GhazlanDiscover.setSubTab('diaries')">📓 اليوميات</button>
        <button class="p4-subtab" onclick="window.GhazlanWorld.openHub()">🌍 العالم</button>
        <button class="p4-subtab active" onclick="window.GhazlanSocial.openHub()">🤝 التفاعل</button>
      </div>`;

    const charOpts = chars.map((c) => `<option value="${esc(c.id)}">${c.emoji || '🌙'} ${esc(getDisplayName(c))}</option>`).join('');

    body.innerHTML = topTabs + `
      <div class="p5-card">
        <div class="sec-title"><span>🛡️ ضوابط وميزانية تفاعل الشخصيات (المرحلة 6)</span></div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;cursor:pointer">
          <input type="checkbox" ${socialCfg.enabled ? 'checked' : ''} onchange="window.GhazlanSocial.toggleEnabled(this.checked)" />
          تفعيل تفاعل الشخصيات مع بعضها
        </label>
        <div class="row-gap" style="margin-top:6px">
          <span style="font-size:12px;color:var(--muted)">الحد الأقصى للأدوار لكل حدث (منع الحلقات):</span>
          <select style="padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" onchange="window.GhazlanSocial.setBudget(Number(this.value))">
            ${[2, 3, 4].map((n) => `<option value="${n}" ${Number(socialCfg.maxTurnsBudget) === n ? 'selected' : ''}>${n} أدوار كحد أقصى</option>`).join('')}
          </select>
        </div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:6px">الشخصيات المسموح لها بالتفاعل (اتركها كلها مفعّلة أو خصّصها):</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">
          ${chars.map((c) => {
            const on = !socialCfg.allowedChars.length || socialCfg.allowedChars.includes(c.id);
            return `<button class="p5-pill ${on ? 'active' : ''}" onclick="window.GhazlanSocial.toggleAllow('${esc(c.id)}')">${c.emoji || '🌙'} ${esc(getDisplayName(c))}</button>`;
          }).join('')}
        </div>
      </div>

      <div class="p5-card">
        <div class="sec-title"><span>💞 علاقات الشخصيات (${(socialCfg.relationships || []).length})</span></div>
        ${chars.length < 2 ? `<div style="font-size:12px;color:var(--amber)">أضف شخصية ثانية من «مكتبة الشخصيات» لربط العلاقات بين الشخصيات.</div>` : `
          <div class="row-gap" style="flex-wrap:wrap">
            <select id="p6RelA" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">${charOpts}</select>
            <select id="p6RelB" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">${charOpts}</select>
          </div>
          <div class="row-gap" style="flex-wrap:wrap;margin-top:4px">
            <select id="p6RelType" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
              ${REL_TYPES.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}
            </select>
            <input id="p6RelLevel" type="number" min="0" max="100" value="65" style="width:76px;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" title="مستوى المعرفة %" />
          </div>
          <input id="p6RelInt" style="padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;margin-top:4px" placeholder="الاهتمامات المشتركة (مثلاً: القهوة، الموسيقى، الدراسة)..." />
          <button class="btn btn-primary" style="margin-top:6px;font-size:12.5px" onclick="window.GhazlanSocial.addRel()">➕ حفظ العلاقة</button>
        `}
        ${(socialCfg.relationships || []).map((r) => {
          const tl = REL_TYPES.find((x) => x.id === r.type)?.label || r.type;
          return `<div class="mem-item" style="flex-direction:column;align-items:stretch;gap:4px;margin-top:6px">
            <div class="row-gap" style="justify-content:space-between">
              <strong>${esc(getDisplayName(getChar(r.charA)))} ⇄ ${esc(getDisplayName(getChar(r.charB)))}</strong>
              <button class="icon-btn" style="width:24px;height:24px;font-size:11px;color:var(--rose)" onclick="window.GhazlanSocial.delRel('${r.id}')">✕</button>
            </div>
            <div style="font-size:11.5px;color:var(--muted)">${esc(tl)} • المعرفة: ${r.level}% • منذ: ${esc(r.since)}${r.interests ? ' • اهتمامات: ' + esc(r.interests) : ''}</div>
            ${r.lastEvent ? `<div style="font-size:11px;color:var(--accent3)">آخر حدث مشترك: ${esc(r.lastEvent)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>

      <div class="p5-card">
        <div class="sec-title"><span>🎬 تشغيل حدث مشترك منضبط</span></div>
        ${chars.length < 2 ? `<div style="font-size:12px;color:var(--muted)">تحتاج لشخصيتين على الأقل لتشغيل حدث مشترك.</div>` : `
          <div class="row-gap" style="flex-wrap:wrap">
            <select id="p6EvA" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">${charOpts}</select>
            <select id="p6EvB" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">${charOpts}</select>
          </div>
          <div class="row-gap" style="flex-wrap:wrap;margin-top:4px">
            <select id="p6EvType" style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">
              ${SHARED_EVENT_TYPES.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}
            </select>
            <input id="p6EvLoc" value="المقهى" style="flex:1;padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" placeholder="المكان" />
          </div>
          <input id="p6EvTopic" style="padding:7px 9px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;margin-top:4px" placeholder="موضوع اللقاء أو النقاش..." />
          <button id="p6RunEvBtn" class="btn btn-primary" style="margin-top:6px;font-size:12.5px" onclick="window.GhazlanSocial.runEvent()">▶️ بدء الحدث (بحد أقصى ${socialCfg.maxTurnsBudget} أدوار)</button>
        `}
      </div>

      ${(socialCfg.sharedEvents || []).map((ev) => `
        <div class="p5-card">
          <div class="row-gap" style="justify-content:space-between">
            <strong>🎬 ${esc(ev.title)} (${esc(ev.location)})</strong>
            <span style="font-size:10.5px;color:var(--muted)">${esc(new Date(ev.ts).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }))}</span>
          </div>
          ${(ev.turns || []).map((t) => `<div class="p4-comment"><strong>${esc(t.name)}:</strong> ${esc(t.text)}</div>`).join('')}
        </div>`).join('')}
    `;

    // Default second select to second character if available
    const b1 = document.getElementById('p6RelB');
    const b2 = document.getElementById('p6EvB');
    if (chars.length > 1) {
      if (b1) b1.selectedIndex = 1;
      if (b2) b2.selectedIndex = 1;
    }
  }

  // Inject "🤝 التفاعل" pill into Discover & World sub-tab bars
  function injectSocialTab() {
    const bar = document.querySelector('#homeBody .p4-subtabs');
    if (bar && !bar.querySelector('[data-p6-tab]')) {
      const b = document.createElement('button');
      b.className = 'p4-subtab';
      b.setAttribute('data-p6-tab', '1');
      b.textContent = '🤝 التفاعل';
      b.onclick = () => window.GhazlanSocial.openHub();
      bar.appendChild(b);
    }
  }

  if (window.GhazlanDiscover?.render) {
    const _r = window.GhazlanDiscover.render;
    window.GhazlanDiscover.render = function () { _r(); injectSocialTab(); };
  }
  if (window.GhazlanWorld?.openHub) {
    const _w = window.GhazlanWorld.openHub;
    window.GhazlanWorld.openHub = function (a, b) { _w(a, b); injectSocialTab(); };
  }

  window.GhazlanSocial = {
    openHub: renderSocialHub,
    toggleEnabled(v) { socialCfg.enabled = !!v; saveSocial(); renderSocialHub(); showToast(v ? 'تم تفعيل تفاعل الشخصيات ✅' : 'تم إيقاف تفاعل الشخصيات ⏸️'); },
    setBudget(n) { socialCfg.maxTurnsBudget = Math.min(4, Math.max(2, n)); saveSocial(); renderSocialHub(); },
    toggleAllow(cid) {
      const allIds = (typeof characters !== 'undefined' ? characters : []).map((c) => c.id);
      if (!socialCfg.allowedChars.length) socialCfg.allowedChars = [...allIds];
      if (socialCfg.allowedChars.includes(cid)) socialCfg.allowedChars = socialCfg.allowedChars.filter((x) => x !== cid);
      else socialCfg.allowedChars.push(cid);
      saveSocial();
      renderSocialHub();
    },
    addRel() {
      const charA = document.getElementById('p6RelA')?.value;
      const charB = document.getElementById('p6RelB')?.value;
      const type = document.getElementById('p6RelType')?.value || 'friendship';
      const level = Math.min(100, Math.max(0, Number(document.getElementById('p6RelLevel')?.value || 60)));
      const interests = (document.getElementById('p6RelInt')?.value || '').trim().slice(0, 140);
      if (!charA || !charB || charA === charB) { showToast('اختر شخصيتين مختلفتين.'); return; }
      const ex = socialCfg.relationships.find((r) => (r.charA === charA && r.charB === charB) || (r.charA === charB && r.charB === charA));
      const rel = ex || { id: 'rel_' + Date.now(), charA, charB, since: new Date().toLocaleDateString('ar-DZ'), lastEvent: '' };
      rel.type = type; rel.level = level; rel.interests = interests;
      if (!ex) socialCfg.relationships.unshift(rel);
      saveSocial();
      syncRelToCloud(rel);
      renderSocialHub();
      showToast('تم حفظ العلاقة بين الشخصيتين 💞');
    },
    delRel(id) { socialCfg.relationships = socialCfg.relationships.filter((x) => x.id !== id); saveSocial(); renderSocialHub(); },
    runEvent: runSharedEvent,
  };
})();
