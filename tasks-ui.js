/* ============================================================================
 * Ghazlan Phase 2 — Smart Tasks UI & Real-Time Context Manager (www/tasks-ui.js)
 * Modular addon: adds "المهام الذكية" tab to Home Bottom Nav, connects to
 * Supabase `tasks`, `task_runs`, and `task-runner`, with offline cache fallback.
 * ============================================================================ */
(() => {
  const TASK_TYPES = [
    { id: 'morning', label: '☀️ رسالة صباحية يومية' },
    { id: 'evening', label: '🌙 رسالة مسائية / تصبح على خير' },
    { id: 'proactive', label: '💬 مبادرة شخصية عفوية' },
    { id: 'reminder', label: '⏰ تذكير للمستخدم (دراسة / موعد / ماء)' },
    { id: 'event', label: '🎭 حدث للشخصية أو تحديث حالة' },
    { id: 'occasion', label: '🎉 مناسبة وتاريخ خاص' },
  ];

  const getTz = () => {
    try {
      return store.get('rp_timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Algiers');
    } catch {
      return 'Africa/Algiers';
    }
  };

  // Expose helper for api-client / index.html
  window.GhazlanTime = {
    getTimezone: getTz,
    setTimezone(tz) { store.set('rp_timezone', tz || 'Africa/Algiers'); },
    getContextSummary() {
      const tz = getTz();
      const now = new Date();
      try {
        const d = new Intl.DateTimeFormat('ar-DZ', { timeZone: tz, dateStyle: 'full', timeStyle: 'short' }).format(now);
        return `${d} (${tz})`;
      } catch {
        return `${now.toLocaleString()} (${tz})`;
      }
    },
  };

  // Inject "المهام" 4th tab into Bottom Navigation Bar
  const bnav = document.querySelector('.bottom-nav');
  if (bnav && !document.getElementById('navTasks')) {
    const btn = document.createElement('button');
    btn.className = 'bnav-btn';
    btn.id = 'navTasks';
    btn.innerHTML = '<span class="bi">⏰</span><span>المهام</span>';
    btn.onclick = () => switchHomeTab('tasks');
    bnav.appendChild(btn);
  }

  // Inject Task Creation / Edit Modal
  const modalBg = document.createElement('div');
  modalBg.id = 'taskModalBg';
  modalBg.className = 'modal-bg';
  modalBg.onclick = (e) => { if (e.target === modalBg) modalBg.classList.remove('open'); };
  modalBg.innerHTML = `
    <div class="modal">
      <h3>⏰ <span id="tmTitle">إنشاء مهمة ذكية جديدة</span>
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="document.getElementById('taskModalBg').classList.remove('open')">✕</button>
      </h3>
      <input type="hidden" id="tmEditId" />
      <div class="sec-box">
        <div class="field"><label>اسم المهمة *</label><input id="tmName" placeholder="مثلاً: رسالة صباح الخير من غزلان" /></div>
        <div class="row-gap">
          <div class="field" style="flex:1"><label>الشخصية المنفذة</label><select id="tmChar"></select></div>
          <div class="field" style="flex:1"><label>نوع المهمة</label><select id="tmType">${TASK_TYPES.map((t) => `<option value="${t.id}">${t.label}</option>`).join('')}</select></div>
        </div>
        <div class="row-gap">
          <div class="field" style="flex:1"><label>التاريخ والوقت *</label><input id="tmDateTime" type="datetime-local" /></div>
          <div class="field" style="flex:1"><label>التكرار</label>
            <select id="tmFreq">
              <option value="daily">يومياً</option>
              <option value="once">مرة واحدة</option>
              <option value="weekly">أسبوعياً</option>
              <option value="monthly">شهرياً</option>
            </select>
          </div>
        </div>
        <div class="field"><label>المنطقة الزمنية (IANA)</label><input id="tmTz" value="Africa/Algiers" /></div>
        <div class="field"><label>طريقة المحتوى</label>
          <select id="tmMode">
            <option value="ai">توليد تلقائي بالذكاء الاصطناعي (وفق التوجيه)</option>
            <option value="fixed">نص ثابت يكتبه المستخدم</option>
          </select>
        </div>
        <div class="field"><label>النص الثابت أو التوجيه القصير</label><textarea id="tmPayload" rows="2" placeholder="مثلاً: صباح الخير يا أسعد، لا تنسَ قهوتك ودراستك اليوم!"></textarea></div>
      </div>
      <button class="btn btn-primary" onclick="window.GhazlanTasks.saveTask()">حفظ المهمة المجدولة ✅</button>
    </div>`;
  document.body.appendChild(modalBg);

  let tasksCache = loadJSON('rp_tasks_cache_v2', []);
  let runsCache = [];

  async function sbRest(path, opts = {}) {
    const cfg = window.GhazlanAPI?.getConfig();
    const sess = window.GhazlanAPI?.getSession();
    if (!cfg?.url || !cfg?.anonKey || !sess?.access_token) throw new Error('سجّل الدخول إلى Supabase أولاً لإدارة المهام الخادمية.');
    const r = await fetch(`${cfg.url}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${sess.access_token}`,
        ...(opts.headers || {}),
      },
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.message || data.error || `HTTP ${r.status}`);
    return data;
  }

  async function fetchTasksAndRuns() {
    if (!window.GhazlanAPI?.isSignedIn()) return { tasks: tasksCache, runs: [] };
    try {
      const [t, r] = await Promise.all([
        sbRest('/rest/v1/tasks?select=*&order=created_at.desc'),
        sbRest('/rest/v1/task_runs?select=*&order=started_at.desc&limit=15'),
      ]);
      if (Array.isArray(t)) { tasksCache = t; store.set('rp_tasks_cache_v2', JSON.stringify(t)); }
      if (Array.isArray(r)) runsCache = r;
    } catch {}
    return { tasks: tasksCache, runs: runsCache };
  }

  function openTaskModal(editTask = null) {
    document.getElementById('tmEditId').value = editTask?.id || '';
    document.getElementById('tmTitle').textContent = editTask ? 'تعديل المهمة' : 'إنشاء مهمة ذكية جديدة';
    document.getElementById('tmChar').innerHTML = characters.map((c) => `<option value="${c.id}">${esc(getDisplayName(c))}</option>`).join('');
    document.getElementById('tmName').value = editTask?.title || '';
    document.getElementById('tmChar').value = editTask?.character_id || characters[0]?.id || 'ghazlan';
    document.getElementById('tmType').value = editTask?.task_type || 'morning';
    document.getElementById('tmFreq').value = editTask?.schedule_rule?.freq || 'daily';
    document.getElementById('tmTz').value = editTask?.timezone || getTz();
    document.getElementById('tmMode').value = editTask?.content_mode || 'ai';
    document.getElementById('tmPayload').value = editTask?.payload?.text || editTask?.payload?.promptHint || '';
    const d = editTask?.next_run_at ? new Date(editTask.next_run_at) : new Date(Date.now() + 3600000);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('tmDateTime').value = localIso;
    modalBg.classList.add('open');
  }

  async function saveTask() {
    const title = document.getElementById('tmName').value.trim();
    const dtVal = document.getElementById('tmDateTime').value;
    if (!title || !dtVal) return showToast('أدخل اسم المهمة والتاريخ والوقت أولاً.');
    const sess = window.GhazlanAPI?.getSession();
    if (!sess?.user?.id) return showToast('سجّل الدخول إلى Supabase من الإعدادات ⚙️ أولاً.');

    const editId = document.getElementById('tmEditId').value;
    const nextRunIso = new Date(dtVal).toISOString();
    const tz = document.getElementById('tmTz').value.trim() || 'Africa/Algiers';
    const mode = document.getElementById('tmMode').value;
    const textVal = document.getElementById('tmPayload').value.trim();

    const row = {
      owner_id: sess.user.id,
      title,
      character_id: document.getElementById('tmChar').value,
      task_type: document.getElementById('tmType').value,
      schedule_rule: { freq: document.getElementById('tmFreq').value, time: dtVal.slice(11, 16) },
      timezone: tz,
      next_run_at: nextRunIso,
      content_mode: mode,
      payload: mode === 'fixed' ? { text: textVal } : { promptHint: textVal },
      enabled: true,
    };

    try {
      if (editId) {
        await sbRest(`/rest/v1/tasks?id=eq.${encodeURIComponent(editId)}`, { method: 'PATCH', body: JSON.stringify(row) });
      } else {
        await sbRest('/rest/v1/tasks', { method: 'POST', body: JSON.stringify([row]), headers: { Prefer: 'return=representation' } });
      }
      modalBg.classList.remove('open');
      showToast('تم حفظ المهمة المجدولة على الخادم ⏰✅');
      renderTasksScreen();
    } catch (e) {
      showToast('فشل الحفظ: ' + e.message);
    }
  }

  async function toggleTask(id, enabled) {
    try {
      await sbRest(`/rest/v1/tasks?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
      renderTasksScreen();
    } catch (e) { showToast(e.message); }
  }

  async function deleteTask(id) {
    try {
      await sbRest(`/rest/v1/tasks?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      showToast('تم حذف المهمة 🗑️');
      renderTasksScreen();
    } catch (e) { showToast(e.message); }
  }

  async function runDueNow() {
    try {
      showToast('جاري تشغيل المهام المستحقة على الخادم... ⏳');
      const res = await sbRest('/functions/v1/task-runner', { method: 'POST', body: JSON.stringify({}) });
      showToast(res.executed ? `تم تنفيذ ${res.executed} مهمة مستحقة ✅` : 'لا توجد مهام مستحقة في هذه اللحظة.');
      await syncScheduledMessages();
      renderTasksScreen();
    } catch (e) { showToast('تعذر التشغيل: ' + e.message); }
  }

  async function syncScheduledMessages() {
    if (!window.GhazlanAPI?.isSignedIn()) return;
    try {
      const msgs = await sbRest('/rest/v1/messages?delivery_status=eq.scheduled_sent&order=created_at.desc&limit=15');
      if (!Array.isArray(msgs) || !msgs.length) return;
      let added = 0;
      const seen = loadJSON('rp_seen_sched_ids', []);
      for (const m of msgs.reverse()) {
        if (seen.includes(m.id)) continue;
        const c = chats.find((x) => x.type === 'direct' && x.charId === m.character_id);
        if (c) {
          c.messages.push({ role: 'model', charId: m.character_id, raw: m.content, ts: m.client_ts || Date.parse(m.created_at) });
          added++;
        }
        seen.push(m.id);
      }
      if (added) {
        store.set('rp_seen_sched_ids', JSON.stringify(seen.slice(-100)));
        saveChats();
        renderHomeScreen();
        showToast(`وصلت ${added} رسالة مجدولة جديدة 🌙`);
      }
    } catch {}
  }

  async function renderTasksScreen() {
    const body = document.getElementById('homeBody');
    if (!body) return;
    body.innerHTML = `<div style="padding:16px;text-align:center;color:var(--muted)">⏳ جاري تحميل المهام الذكية...</div>`;
    const { tasks, runs } = await fetchTasksAndRuns();
    const signed = window.GhazlanAPI?.isSignedIn();

    body.innerHTML = `
      <div class="sec-box" style="margin:6px">
        <div class="sec-title"><span>🕒 السياق الزمني الحالي</span></div>
        <div style="font-size:12.5px;color:var(--text)">${esc(window.GhazlanTime.getContextSummary())}</div>
        <div class="row-gap" style="margin-top:6px">
          <button class="btn btn-primary" style="flex:1" onclick="window.GhazlanTasks.openModal()">➕ مهمة ذكية جديدة</button>
          <button class="btn-chip" onclick="window.GhazlanTasks.runDueNow()">▶️ فحص وتشغيل المستحق</button>
        </div>
        ${!signed ? `<div style="font-size:11.5px;color:var(--amber);margin-top:4px">⚠️ سجّل الدخول إلى Supabase من الإعدادات ⚙️ لتفعيل الجدولة الخادمية.</div>` : ''}
      </div>

      <div class="sec-box" style="margin:6px">
        <div class="sec-title"><span>📋 المهام المجدولة (${tasks.length})</span></div>
        ${tasks.length ? tasks.map((t) => {
          const ch = getChar(t.character_id);
          const nextTxt = t.next_run_at ? new Date(t.next_run_at).toLocaleString('ar-DZ', { timeZone: t.timezone || 'Africa/Algiers' }) : 'منتهية';
          return `<div class="mem-item" style="flex-direction:column;gap:6px">
            <div class="row-gap" style="justify-content:space-between;width:100%">
              <strong>${esc(t.title)}</strong>
              <span style="font-size:11px;color:${t.enabled ? 'var(--emerald)' : 'var(--muted)'}">${t.enabled ? '● نشطة' : '○ متوقفة'}</span>
            </div>
            <div style="font-size:11.5px;color:var(--muted)">الشخصية: ${esc(getDisplayName(ch))} • التكرار: ${esc(t.schedule_rule?.freq || 'once')} • القادم: ${esc(nextTxt)}</div>
            <div class="row-gap">
              <button class="btn-chip" onclick="window.GhazlanTasks.toggle('${t.id}', ${!t.enabled})">${t.enabled ? '⏸ إيقاف' : '▶️ تفعيل'}</button>
              <button class="btn-chip" style="color:var(--rose)" onclick="window.GhazlanTasks.remove('${t.id}')">🗑️ حذف</button>
            </div>
          </div>`;
        }).join('') : `<div style="text-align:center;color:var(--muted);font-size:12.5px;padding:12px">لا توجد مهام مجدولة بعد. أنشئ أول مهمة (مثل: رسالة صباح الخير الساعة 07:00).</div>`}
      </div>

      <div class="sec-box" style="margin:6px">
        <div class="sec-title"><span>📜 سجل التنفيذ الأخير (${runs.length})</span></div>
        ${runs.length ? runs.map((r) => `
          <div class="mem-item" style="font-size:11.5px">
            <span>${r.status === 'completed' ? '✅' : (r.status === 'failed' ? '❌' : '⏸️')} ${esc(r.status)} — ${esc(new Date(r.started_at).toLocaleString('ar-DZ'))}${r.error ? ' (' + esc(r.error) + ')' : ''}</span>
          </div>`).join('') : `<div style="text-align:center;color:var(--muted);font-size:12px;padding:8px">لا توجد عمليات تنفيذ مسجلة بعد.</div>`}
      </div>`;
  }

  // Hook into switchHomeTab & renderHomeScreen without breaking existing tabs
  const _oldSwitch = window.switchHomeTab;
  window.switchHomeTab = function (t) {
    if (typeof _oldSwitch === 'function') _oldSwitch(t);
    const nt = document.getElementById('navTasks');
    if (nt) nt.classList.toggle('active', t === 'tasks');
    if (t === 'tasks') renderTasksScreen();
  };

  window.GhazlanTasks = {
    openModal: openTaskModal,
    saveTask,
    toggle: toggleTask,
    remove: deleteTask,
    runDueNow,
    syncScheduledMessages,
    render: renderTasksScreen,
  };

  // Sync any scheduled messages delivered while app was closed
  setTimeout(syncScheduledMessages, 1800);
})();
