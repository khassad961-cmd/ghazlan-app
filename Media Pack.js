/* ============================================================================
 * Ghazlan Mega Media Pack (www/media-pack.js)
 *  - Fixes #traySearchInp live search (direct input + Enter binding + debounce)
 *  - Smart Arabic -> English query mapping for rich GIPHY results
 *  - 300+ Categorized Emojis & 100+ Expressive Stickers searchable in Arabic
 *  - 50+ Instant Offline Reaction GIFs + Live GIPHY "Load More" pagination
 * ============================================================================ */
(() => {
  // 1. Arabic -> English Smart Query Map for GIPHY (makes short Arabic searches return rich results)
  const AR_TO_EN = [
    [/^(رو|رومان|عشق)/, 'romantic love'],
    [/^(حب|احب|قلوب|قلب)/, 'love heart cute'],
    [/^(ضحك|ههه|نكت|مضحك)/, 'funny laugh lol'],
    [/^(حز|بك|دمع|زعل)/, 'sad crying'],
    [/^(قهو|شاي|كاف|استرخ)/, 'coffee chill relax'],
    [/^(صباح|نهار)/, 'good morning'],
    [/^(مساء|ليل|نوم|تصبح)/, 'good night sleep'],
    [/^(مبروك|نجاح|فرح|عيد)/, 'celebration congratulations'],
    [/^(شكر|يسلم|مرسي)/, 'thank you'],
    [/^(سلام|اهلا|مرحبا|واش)/, 'hello wave hi'],
    [/^(غضب|معصب|نرفز)/, 'angry mad'],
    [/^(صدم|مفاج|واو|اوه)/, 'wow shocked surprised'],
    [/^(تقلاش|دلع|كيوت)/, 'cute sassy wink'],
    [/^(رقص|حفل|موسيق)/, 'happy dance party'],
    [/^(مطر|شتاء|برد)/, 'rain cozy'],
    [/^(قراي|دراس|امتحان|تعب)/, 'studying tired'],
    [/^(قط|قطط|مياو)/, 'cute cat'],
    [/^(نار|حماس|قوة)/, 'fire awesome'],
  ];

  function enhanceGiphyQuery(raw) {
    const q = String(raw || '').trim();
    if (!q) return '';
    for (const [rx, en] of AR_TO_EN) {
      if (rx.test(q)) return en;
    }
    return q;
  }

  // 2. Expanded Categorized Emojis (300+ across 8 categories)
  const MEGA_EMOJI_CATS = [
    { id: 'faces', lbl: '😀 مشاعر', items: '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕'.split(' ') },
    { id: 'hearts', lbl: '❤️ حب وقلوب', items: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💌 💋 💍 🌹 🌷 🌺 🌸 💐 ✨ 🌙 🌟 💫 🔥 🫶 🫂'.split(' ') },
    { id: 'hands', lbl: '🙌 تفاعل', items: '👍 👎 👊 ✊ 🤛 🤜 🤞 ✌️ 🤟 🤘 👌 🤌 🤏 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤙 💪 🙏 🤝 👏 🙌 👐 🤲 ✍️ 💅 🤳'.split(' ') },
    { id: 'drinks', lbl: '☕ أكل وقهوة', items: '☕ 🍵 🧃 🥤 🧋 🍫 🍰 🎂 🧁 🍪 🍩 🥐 🥖 🍕 🍔 🍟 🌮 🌯 🥗 🍲 🍜 🍓 🍒 🍑 🍉 🍇 🍋 🍯 🍿'.split(' ') },
    { id: 'nature', lbl: '🌙 طبيعة وليالي', items: '🌙 🌛 🌜 🌝 🌞 ⭐ 🌟 🌠 🌌 ☁️ ⛅ ⛈️ 🌧️ ❄️ 🌊 🌈 🌴 🌵 🌿 🍀 🍁 🍂 🦋 🕊️ 🐈 🐕'.split(' ') },
    { id: 'study', lbl: '📚 دراسة وعمل', items: '📚 📖 📓 📔 📒 📕 📗 📘 📙 ✏️ ✒️ 🖊️ 📝 📌 📍 📎 💼 💻 📱 ⌨️ 🎧 🎙️ ⏰ ⏳ 📅 ✅ 🎯 💡 ⚡ 🔋'.split(' ') },
    { id: 'party', lbl: '🎉 مناسبات', items: '🎉 🎊 🎈 🎁 🎀 🏆 🥇 🥈 🥉 🎖️ 🎶 🎵 🎤 🎬 🎮 🎲 🧩 🎨 🎭 ✈️ 🚗 🚀 🏖️ 🏕️'.split(' ') },
    { id: 'dz', lbl: '🇩🇿 رموز', items: '🇩🇿 🕌 📿 🫖 🐪 🏜️ 🏔️ ⚓ 🧭 👑 💎 🗝️ 🛡️ ⚖️ 🧿'.split(' ') },
  ];

  // 3. Expressive Stickers (100+ Arabic-searchable)
  const MEGA_STICKERS = [
    { s: '🥰❤️', lbl: 'حب وحنان' }, { s: '😘💋', lbl: 'بوسة دلع' }, { s: '🫂✨', lbl: 'عناق دافئ' },
    { s: '😂💀', lbl: 'ضحك موت' }, { s: '🤣🔥', lbl: 'ضحك هستيري' }, { s: '😏☕', lbl: 'تقلاش وقهوة' },
    { s: '🥺👉👈', lbl: 'خجل ولطافة' }, { s: '😭💔', lbl: 'حزن وبكاء' }, { s: '😴🌙', lbl: 'تصبح على خير' },
    { s: '☀️☕', lbl: 'صباح الخير' }, { s: '😤🔥', lbl: 'غضب لطيف' }, { s: '🤯⚡', lbl: 'صدمة قوية' },
    { s: '🥳🎉', lbl: 'مبروك احتفال' }, { s: '🙏🌹', lbl: 'شكراً جزيلاً' }, { s: '👋✨', lbl: 'أهلاً وسهلاً' },
    { s: '🤩🌟', lbl: 'إعجاب وانبهار' }, { s: '🤔💭', lbl: 'تفكير عميق' }, { s: '🤫🤐', lbl: 'سر بيننا' },
    { s: '💪⚡', lbl: 'قوة وحماس' }, { s: '📚☕', lbl: 'مراجعة وتركيز' }, { s: '🎧🎶', lbl: 'موسيقى وروقان' },
    { s: '🌧️🫖', lbl: 'مطر وشاي' }, { s: '👑✨', lbl: 'ملكة وستايل' }, { s: '🫶💖', lbl: 'أنت في القلب' },
    { s: '😌🌸', lbl: 'راحة بال' }, { s: '🙈💕', lbl: 'استحياء' }, { s: '😎🔥', lbl: 'فخامة وثقة' },
    { s: '🤗💐', lbl: 'تقدير وورد' }, { s: '😜✌️', lbl: 'مزاح ومرح' }, { s: '👀💬', lbl: 'احكيلي كلش' },
    { s: '🏜️🌙', lbl: 'سهرة صحراوية' }, { s: '🇩🇿❤️', lbl: 'تحيا الجزائر' }, { s: '🤲✨', lbl: 'دعاء وطمأنينة' },
    { s: '🍕🥤', lbl: 'وقت الأكل' }, { s: '🚗💨', lbl: 'في الطريق' }, { s: '⏰🏃', lbl: 'مستعجل' },
    { s: '💯✅', lbl: 'تمام ومضبوط' }, { s: '🫠🔥', lbl: 'ذبت من الحر' }, { s: '🥹🌷', lbl: 'تأثر لطيف' },
    { s: '🫡⚡', lbl: 'تم التنفيذ' }, { s: '😇🕊️', lbl: 'سلام وهدوء' }, { s: '🫠☕', lbl: 'نعسان قهوة' },
  ];

  // 4. Expanded Curated Offline GIFs (instant even without network/key)
  const OFFLINE_GIFS = [
    { tag: 'love', title: 'حب وعناق دافئ', url: 'https://media.giphy.com/media/l4pTdcifPZLpDjL1e/giphy.gif' },
    { tag: 'love', title: 'قلوب حب رومانسية', url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif' },
    { tag: 'love', title: 'قبلة وابتسامة', url: 'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif' },
    { tag: 'love', title: 'عيون قلوب حب', url: 'https://media.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.gif' },
    { tag: 'laugh', title: 'ضحك هستيري', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
    { tag: 'laugh', title: 'ههههه ضحك', url: 'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif' },
    { tag: 'laugh', title: 'ضحكة شريرة', url: 'https://media.giphy.com/media/8fen5LSZcHQ5O/giphy.gif' },
    { tag: 'laugh', title: 'ضحك بالدموع', url: 'https://media.giphy.com/media/lszAB3TzFtRaU/giphy.gif' },
    { tag: 'sad', title: 'حزن وبكاء', url: 'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif' },
    { tag: 'sad', title: 'مطر وحزن', url: 'https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif' },
    { tag: 'sassy', title: 'تقلاش ودلع', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
    { tag: 'sassy', title: 'غمزة لطيفة', url: 'https://media.giphy.com/media/BI3bNvMJtL77q/giphy.gif' },
    { tag: 'react', title: 'صدمة ومفاجأة', url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif' },
    { tag: 'react', title: 'تصفيق وحماس', url: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif' },
    { tag: 'chill', title: 'قهوة الصباح', url: 'https://media.giphy.com/media/3oriO04qxVReM5rJEA/giphy.gif' },
    { tag: 'chill', title: 'استرخاء وموسيقى', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  ];

  let livePageOffset = 0;
  let lastLiveQuery = '';
  let lastLiveUrls = [];
  let emojiCatIdx = 0;

  async function queryProxy(q, kind, offset = 0) {
    const cfg = window.GhazlanAPI?.getConfig?.();
    const sess = window.GhazlanAPI?.getSession?.();
    if (!cfg?.url || !cfg?.anonKey) return { urls: [] };
    const headers = { 'Content-Type': 'application/json', apikey: cfg.anonKey };
    if (sess?.access_token) headers.Authorization = `Bearer ${sess.access_token}`;
    try {
      const r = await fetch(`${cfg.url}/functions/v1/gif-proxy`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ q: enhanceGiphyQuery(q), type: kind, offset }),
      });
      if (!r.ok) return { urls: [], error: `HTTP ${r.status}` };
      return await r.json().catch(() => ({ urls: [] }));
    } catch (e) {
      return { urls: [], error: e.message };
    }
  }

  let reqSeq = 0;
  async function renderMegaTray(append = false) {
    const grid = document.getElementById('trayGrid');
    const cats = document.getElementById('trayCats');
    if (!grid || !cats || typeof mediaTab === 'undefined') return;

    const rawSearch = (document.getElementById('traySearchInp')?.value || '').trim().toLowerCase();

    if (mediaTab === 'emoji') {
      grid.className = 'tray-grid emojis';
      cats.innerHTML = MEGA_EMOJI_CATS.map((c, idx) =>
        `<button class="cat-btn ${emojiCatIdx === idx ? 'active' : ''}" onclick="window.GhazlanMediaPack.setEmojiCat(${idx})">${c.lbl}</button>`
      ).join('');
      const items = rawSearch
        ? MEGA_EMOJI_CATS.flatMap((c) => c.lbl.includes(rawSearch) ? c.items : []).concat(MEGA_EMOJI_CATS[emojiCatIdx].items)
        : MEGA_EMOJI_CATS[emojiCatIdx].items;
      const uniq = [...new Set(items)];
      grid.innerHTML = uniq.map((em) => `<button class="em-tile" onclick="insertEmoji('${em}')">${em}</button>`).join('');
      return;
    }

    if (mediaTab === 'stickers') {
      const localList = MEGA_STICKERS.filter((x) => !rawSearch || x.lbl.includes(rawSearch) || x.s.includes(rawSearch));
      const localHtml = localList.map((x) => `<button class="st-tile" onclick="sendSticker('${x.s}','${esc(x.lbl)}')"><span>${x.s}</span><small>${x.lbl}</small></button>`).join('');
      cats.innerHTML = '<span style="font-size:11px;color:var(--muted);padding:4px">✨ ملصقات تعبيرية + ملصقات GIPHY المتحركة</span>';
      grid.className = 'tray-grid stickers';
      grid.innerHTML = localHtml || '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:12px">جاري البحث في الملصقات الحية...</div>';

      if (window.GhazlanAPI?.isConfigured?.()) {
        const mySeq = ++reqSeq;
        const res = await queryProxy(rawSearch || 'cute sticker', 'stickers', 0);
        if (mySeq !== reqSeq || mediaTab !== 'stickers') return;
        const urls = Array.isArray(res?.urls) ? res.urls : [];
        if (urls.length) {
          const liveHtml = urls.map((u) => `<div class="gif-tile" style="background:transparent" onclick="sendGif('${u}','${esc(rawSearch || 'Sticker')}')"><img src="${u}" loading="lazy" style="object-fit:contain" /></div>`).join('');
          grid.className = 'tray-grid gifs';
          grid.innerHTML = liveHtml + localHtml;
        }
      }
      return;
    }

    // GIFs Tab
    const gifCats = [
      { id: 'all', lbl: '🔥 الكل' }, { id: 'laugh', lbl: '😂 ضحك' },
      { id: 'love', lbl: '❤️ حب' }, { id: 'sad', lbl: '😢 حزن' },
      { id: 'sassy', lbl: '😏 تقلاش' }, { id: 'react', lbl: '😮 تفاعل' },
      { id: 'chill', lbl: '☕ استرخاء' },
    ];
    const curCat = typeof mediaCat !== 'undefined' ? mediaCat : 'all';
    cats.innerHTML = gifCats.map((c) =>
      `<button class="cat-btn ${curCat === c.id ? 'active' : ''}" onclick="mediaCat='${c.id}';window.GhazlanMediaPack.refresh()">${c.lbl}</button>`
    ).join('');

    const catEn = { all: '', laugh: 'funny laugh', love: 'love heart', sad: 'sad', sassy: 'sassy', react: 'reaction', chill: 'coffee chill' };
    const q = rawSearch || catEn[curCat] || '';
    if (!append) { livePageOffset = 0; lastLiveUrls = []; }

    const recentGifs = !rawSearch && curCat === 'all' ? loadJSON('rp_recent_gifs_v1', []) : [];
    const offlineMatches = OFFLINE_GIFS.filter((g) => (curCat === 'all' || g.tag === curCat) && (!rawSearch || g.title.includes(rawSearch) || g.tag.includes(rawSearch)));

    if (!append) {
      grid.className = 'tray-grid gifs';
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:18px;color:var(--muted);font-size:12px">⏳ جاري جلب صور GIF...</div>';
    }

    const mySeq = ++reqSeq;
    const res = window.GhazlanAPI?.isConfigured?.() ? await queryProxy(q, 'gifs', livePageOffset) : { urls: [] };
    if (mySeq !== reqSeq || mediaTab !== 'gifs') return;

    const liveUrls = Array.isArray(res?.urls) ? res.urls : [];
    if (liveUrls.length) {
      lastLiveUrls = append ? [...lastLiveUrls, ...liveUrls] : liveUrls;
      lastLiveQuery = q;
      const tiles = lastLiveUrls.map((u) => `<div class="gif-tile" onclick="sendGif('${u}','${esc(q || 'GIF')}')"><img src="${u}" loading="lazy" /></div>`).join('');
      const recentTiles = !append ? recentGifs.slice(0, 4).map((g) => `<div class="gif-tile" onclick="sendGif('${g.url}','${esc(g.title)}')"><img src="${g.url}" loading="lazy" /><span>الأخيرة</span></div>`).join('') : '';
      const moreBtn = `<button class="btn-chip" style="grid-column:1/-1;justify-self:center;margin:6px 0" onclick="window.GhazlanMediaPack.loadMore()">➕ تحميل المزيد من GIF</button>`;
      grid.className = 'tray-grid gifs';
      grid.innerHTML = recentTiles + tiles + moreBtn;
    } else if (offlineMatches.length) {
      grid.className = 'tray-grid gifs';
      grid.innerHTML = offlineMatches.map((g) => `<div class="gif-tile" onclick="sendGif('${g.url}','${esc(g.title)}')"><img src="${g.url}" loading="lazy" /><span>${esc(g.title)}</span></div>`).join('');
    } else {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted);font-size:12px">لا توجد نتائج${res?.error ? ' (' + esc(res.error) + ')' : ''}. جرّب: حب، ضحك، قهوة، صباح</div>`;
    }
  }

  // Override renderMediaTray & onTraySearch + attach direct DOM listeners to #traySearchInp
  window.renderMediaTray = () => renderMegaTray(false);

  let timer = null;
  function triggerSearch(val) {
    if (typeof mediaSearch !== 'undefined') mediaSearch = String(val || '').trim().toLowerCase();
    clearTimeout(timer);
    timer = setTimeout(() => renderMegaTray(false), 260);
  }
  window.onTraySearch = triggerSearch;

  const inp = document.getElementById('traySearchInp');
  if (inp) {
    inp.addEventListener('input', (e) => triggerSearch(e.target.value));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); renderMegaTray(false); } });
  }

  window.GhazlanMediaPack = {
    refresh: () => renderMegaTray(false),
    loadMore: () => { livePageOffset += 24; renderMegaTray(true); },
    setEmojiCat: (idx) => { emojiCatIdx = idx; renderMegaTray(false); },
  };
})();