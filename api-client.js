/* ============================================================================
 * Ghazlan Phase 1 — Secure Backend Client, Auth, Sync & Safe Migration/Rollback
 * Stores ONLY public Supabase URL + public anon key + user session token.
 * ZERO AI/GIF secret keys are ever stored in localStorage or the client.
 * ============================================================================ */
(() => {
  const LEGACY_SECRET_KEYS = [
    'rp_gemini_key', 'rp_groq_key', 'rp_or_key', 'rp_giphy_key',
    'sg_gemini_key', 'sg_groq_key', 'sg_or_key', 'sara_api_key', 'sara_gemini_key'
  ];

  // Immediately scrub any legacy secret API keys from localStorage on load
  try {
    LEGACY_SECRET_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {}

  const lsGet = (k, fb = '') => { try { const v = localStorage.getItem(k); return v !== null ? v : fb; } catch { return fb; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch {} };

  function getConfig() {
    return {
      url: lsGet('rp_sb_url', '').replace(/\/+$/, ''),
      anonKey: lsGet('rp_sb_anon', '').trim(),
    };
  }

  function saveConfig(url, anonKey) {
    lsSet('rp_sb_url', String(url || '').trim().replace(/\/+$/, ''));
    lsSet('rp_sb_anon', String(anonKey || '').trim());
  }

  function getSession() {
    try {
      const raw = lsGet('rp_sb_session', '');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveSession(sess) {
    if (!sess) lsDel('rp_sb_session');
    else lsSet('rp_sb_session', JSON.stringify(sess));
  }

  function isConfigured() {
    const c = getConfig();
    return Boolean(c.url && c.anonKey);
  }

  function isSignedIn() {
    const s = getSession();
    return Boolean(s && s.access_token && s.user?.id);
  }

  async function refreshSessionIfNeeded() {
    const cfg = getConfig();
    const sess = getSession();
    if (!cfg.url || !cfg.anonKey || !sess?.refresh_token) return sess;
    const nowSec = Math.floor(Date.now() / 1000);
    if (sess.expires_at && sess.expires_at > nowSec + 60) return sess;

    try {
      const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey },
        body: JSON.stringify({ refresh_token: sess.refresh_token }),
      });
      if (!r.ok) return sess;
      const d = await r.json();
      if (d.access_token) {
        const updated = {
          access_token: d.access_token,
          refresh_token: d.refresh_token || sess.refresh_token,
          expires_at: d.expires_at || (nowSec + (d.expires_in || 3600)),
          user: d.user || sess.user,
        };
        saveSession(updated);
        return updated;
      }
    } catch {}
    return sess;
  }

  async function authHeaders() {
    const cfg = getConfig();
    const sess = await refreshSessionIfNeeded();
    const h = { 'Content-Type': 'application/json', apikey: cfg.anonKey };
    if (sess?.access_token) h.Authorization = `Bearer ${sess.access_token}`;
    return h;
  }

  async function signUp(email, password) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) throw new Error('أدخل رابط Supabase ومفتاح anon أولاً.');
    const r = await fetch(`${cfg.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.msg || d.error_description || d.message || `HTTP ${r.status}`);
    if (d.access_token) {
      saveSession({
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600)),
        user: d.user,
      });
    }
    return d;
  }

  async function signIn(email, password) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) throw new Error('أدخل رابط Supabase ومفتاح anon أولاً.');
    const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error_description || d.msg || d.message || `HTTP ${r.status}`);
    saveSession({
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + (d.expires_in || 3600)),
      user: d.user,
    });
    return d;
  }

  async function signOut() {
    const cfg = getConfig();
    const sess = getSession();
    if (cfg.url && cfg.anonKey && sess?.access_token) {
      try {
        await fetch(`${cfg.url}/auth/v1/logout`, {
          method: 'POST',
          headers: { apikey: cfg.anonKey, Authorization: `Bearer ${sess.access_token}` },
        });
      } catch {}
    }
    saveSession(null);
  }

  // =========================================================================
  // SECURE AI PROXY (SSE Streaming + Non-Streaming)
  // =========================================================================
  async function streamChatCompletion(payload, onToken, signal) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) {
      throw new Error('اربط خادم Supabase من الإعدادات ⚙️ ثم سجّل الدخول لاستخدام الذكاء الاصطناعي بأمان.');
    }
    if (!isSignedIn()) {
      throw new Error('سجّل الدخول بحسابك من الإعدادات ⚙️ للاتصال بالخادم الآمن.');
    }
    const headers = await authHeaders();
    const res = await fetch(`${cfg.url}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errObj = await res.json().catch(() => ({}));
      throw new Error(errObj.error || `خطأ من الخادم (HTTP ${res.status})`);
    }

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/event-stream') && res.body && typeof onToken === 'function') {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let full = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const raw = t.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const obj = JSON.parse(raw);
            if (obj.delta) {
              full += obj.delta;
              onToken(full);
            }
          } catch {}
        }
      }
      if (!full.trim()) throw new Error('رد فارغ من الخادم');
      return { text: full.trim() };
    }

    const data = await res.json().catch(() => ({}));
    if (!data.text) throw new Error(data.error || 'رد فارغ من الخادم');
    return { text: data.text };
  }

  async function listModels() {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey || !isSignedIn()) return [];
    const headers = await authHeaders();
    const r = await fetch(`${cfg.url}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'list_models' }),
    });
    if (!r.ok) return [];
    const d = await r.json().catch(() => ({}));
    return Array.isArray(d.models) ? d.models : [];
  }

  async function searchGifs(query) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) return [];
    try {
      const headers = await authHeaders();
      const r = await fetch(`${cfg.url}/functions/v1/gif-proxy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ q: query || '' }),
      });
      if (!r.ok) return [];
      const d = await r.json().catch(() => ({}));
      return Array.isArray(d.urls) ? d.urls : [];
    } catch {
      return [];
    }
  }

  // =========================================================================
  // SAFE MIGRATION & ROLLBACK (localStorage -> Supabase PostgreSQL)
  // Never deletes localStorage cache; saves pre-migration snapshot first.
  // =========================================================================
  function createRollbackSnapshot(state) {
    const snap = {
      createdAt: new Date().toISOString(),
      characters: state.characters || [],
      chats: state.chats || [],
      memoriesByChar: state.memoriesByChar || {},
    };
    lsSet('rp_migration_backup_v1', JSON.stringify(snap));
    return snap;
  }

  function getRollbackSnapshot() {
    try {
      const raw = lsGet('rp_migration_backup_v1', '');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async function restUpsert(table, rows, onConflict = 'id') {
    if (!rows.length) return;
    const cfg = getConfig();
    const headers = { ...(await authHeaders()), Prefer: 'resolution=merge-duplicates' };
    const r = await fetch(`${cfg.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rows),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(`فشل ترحيل ${table}: ${e.message || r.status}`);
    }
  }

  async function migrateLocalToCloud(state) {
    if (!isConfigured() || !isSignedIn()) {
      throw new Error('سجّل الدخول إلى Supabase أولاً قبل الترحيل.');
    }
    const sess = await refreshSessionIfNeeded();
    const uid = sess.user.id;

    // Step 1: Always save local rollback snapshot before touching cloud
    createRollbackSnapshot(state);

    // Step 2: Upsert user profile
    await restUpsert('users', [{
      id: uid,
      display_name: state.userName || 'أسعد',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Algiers',
      locale: 'ar-DZ',
    }]);

    // Step 3: Upsert characters
    const charRows = (state.characters || []).map((c) => ({
      id: `${uid}_${c.id}`,
      owner_id: uid,
      name: c.name || 'شخصية',
      nickname: c.nickname || '',
      tagline: c.tagline || '',
      emoji: c.emoji || '🌙',
      avatar: c.avatar || '',
      mode: c.mode || 'companion',
      traits: c.traits || '',
      prompt_config: { localId: c.id, prompt: c.prompt || '' },
      greeting: c.greeting || '',
      status: c.status || {},
      builtin: Boolean(c.builtin),
      visibility: 'private',
    }));
    await restUpsert('characters', charRows);

    // Step 4: Upsert chats
    const chatRows = (state.chats || []).map((c) => ({
      id: `${uid}_${c.id}`,
      owner_id: uid,
      type: c.type === 'group' ? 'group' : 'direct',
      char_id: c.charId || null,
      title: c.title || '',
      group_config: {
        localId: c.id,
        memberIds: c.memberIds || [],
        mutedIds: c.mutedIds || [],
        speakerMode: c.speakerMode || 'smart',
        scene: c.scene || '',
      },
    }));
    await restUpsert('chats', chatRows);

    // Step 5: Upsert memories (deduplicated per character)
    const memEntries = [];
    for (const [charId, list] of Object.entries(state.memoriesByChar || {})) {
      for (const content of (list || [])) {
        if (content && String(content).trim()) {
          memEntries.push({
            owner_id: uid,
            character_id: charId,
            category: 'migrated',
            content: String(content).trim(),
            confidence: 0.9,
            user_approved: true,
          });
        }
      }
    }
    if (memEntries.length) {
      const cfg = getConfig();
      const headers = await authHeaders();
      await fetch(`${cfg.url}/rest/v1/memories`, {
        method: 'POST',
        headers,
        body: JSON.stringify(memEntries),
      });
    }

    lsSet('rp_last_migration_at', new Date().toISOString());
    return {
      characters: charRows.length,
      chats: chatRows.length,
      memories: memEntries.length,
    };
  }

  window.GhazlanAPI = {
    getConfig,
    saveConfig,
    getSession,
    isConfigured,
    isSignedIn,
    signUp,
    signIn,
    signOut,
    streamChatCompletion,
    listModels,
    searchGifs,
    createRollbackSnapshot,
    getRollbackSnapshot,
    migrateLocalToCloud,
  };
})();
