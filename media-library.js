/* media-library.js — مكتبة GIF + ملصقات + إيموجي: بحث، تمرير لا نهائي، مفضلة، أخيرة */
(()=>{
const $=id=>document.getElementById(id),API=()=>window.GhazlanAPI;
const jg=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return[]}},js=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const RK='rp_ml_recent',FK='rp_ml_fav';
const S={},mk=(q)=>({q,page:1,items:[],more:true,busy:false,err:'',prov:''});S.gif=mk('');S.sticker=mk('');
const kind=()=>mediaTab==='stickers'?'sticker':'gif';
let mode='net',timer,io;
const CH=[['😂 ضحك','laugh'],['❤️ حب','love'],['😢 حزن','sad'],['😱 صدمة','shocked'],['💃 رقص','dance'],['⚽ كرة','football'],['🎌 أنمي','anime'],['☀️ صباح الخير','good morning'],['🌙 تصبحون','good night'],['👏 برافو','applause'],['🙏 شكراً','thank you'],['🤣 ميمز','meme'],['😡 غضب','angry'],['🥱 ملل','bored'],['🎉 مبروك','congratulations'],['🐱 قطط','cat'],['👋 سلام','hello'],['🔥 تيك توك','tiktok'],['😏 غمزة','wink'],['🥺 وحشتني','miss you']];
const st=document.createElement('style');st.textContent='.ml-t{cursor:pointer;-webkit-touch-callout:none;user-select:none}.ml-t img{width:100%;display:block;border-radius:10px}.gif-bubble:has(img[src$="#stk"]){background:transparent!important;box-shadow:none!important;padding:0!important}.gif-bubble img[src$="#stk"]{max-width:170px;background:none}';document.head.appendChild(st);
const msg=t=>`<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted);font-size:13px">${t}</div>`;
const ERR={auth:'سجّل الدخول إلى حساب الخادم من الإعدادات لتفعيل المكتبة',not_configured:'اربط مشروع Supabase من الإعدادات أولاً',no_provider:'أضف GIPHY_API_KEY أو KLIPY_API_KEY في أسرار Supabase',http_404:'دالة gif-proxy غير منشورة بعد',rate:'طلبات كثيرة، انتظر قليلاً',net:'تعذّر الاتصال بالخادم'};
const errTxt=e=>e?(ERR[e]||('تعذّر التحميل ('+e+')')):'لا نتائج';
async function load(k,fresh){const q=(mediaSearch||'').trim();if(fresh||S[k].q!==q)S[k]=mk(q);const t=S[k];if(t.busy||!t.more)return;t.busy=true;paint();
 const r=(await API()?.searchMedia?.({q,type:k,page:t.page}))||{items:[],error:'not_configured'};
 const seen=new Set(t.items.map(x=>x.url));r.items.forEach(x=>{if(!seen.has(x.url)){x.k=k;t.items.push(x)}});
 t.more=!!r.more&&r.items.length>0;t.page++;t.err=t.items.length?'':(r.error||'');t.prov=r.provider||t.prov;t.busy=false;paint()}
function paint(){const g=$('trayGrid');if(!g||(mediaTab!=='gifs'&&mediaTab!=='stickers')||mode==='builtin')return;const k=kind(),t=S[k];
 const items=mode==='recent'?jg(RK).filter(x=>x.k===k):mode==='fav'?jg(FK).filter(x=>x.k===k):t.items;
 g.className='tray-grid gifs';let h=items.map((x,i)=>`<div class="gif-tile ml-t" data-i="${i}"><img src="${esc(x.preview||x.url)}" loading="lazy" alt=""></div>`).join('');
 if(mode==='net'){if(t.busy)h+=msg('⏳ جاري التحميل...');else if(!items.length)h+=msg(errTxt(t.err));else if(t.more)h+='<div id="mlSent" style="grid-column:1/-1;height:40px"></div>';
  if(items.length&&t.prov)h+=`<div style="grid-column:1/-1;text-align:center;font-size:10px;color:var(--muted)">Powered by ${t.prov==='klipy'?'KLIPY':'GIPHY'}</div>`}
 else if(!items.length)h=msg(mode==='fav'?'لا مفضلة بعد — اضغط مطولاً على أي عنصر لإضافته ⭐':'لا شيء مؤخراً');
 g.innerHTML=h;g._items=items;io?.disconnect();const s=$('mlSent');if(s){io=new IntersectionObserver(e=>{if(e[0].isIntersecting)load(kind())},{rootMargin:'300px'});io.observe(s)}}
function chips(){const c=$('trayCats'),a=(m,x)=>mode===m&&x?' active':'';
 c.innerHTML=`<button class="cat-btn${a('net',!mediaSearch)}" data-m="net" data-mq="">🔥 رائج</button><button class="cat-btn${a('fav',1)}" data-m="fav">⭐ مفضلتي</button><button class="cat-btn${a('recent',1)}" data-m="recent">🕘 الأخيرة</button>`+(mediaTab==='stickers'?`<button class="cat-btn${a('builtin',1)}" data-m="builtin">🎭 رموز ونصوص</button>`:'')+CH.map(([l,q])=>`<button class="cat-btn" data-m="net" data-mq="${q}">${l}</button>`).join('')}
$('trayCats').addEventListener('click',e=>{const b=e.target.closest('[data-m]');if(!b)return;mode=b.dataset.m;if(mode==='net'){mediaSearch=b.dataset.mq||'';$('traySearchInp').value=mediaSearch}renderMediaTray()},true);
const pushRecent=x=>js(RK,[{url:x.url,preview:x.preview,title:x.title,k:x.k},...jg(RK).filter(y=>y.url!==x.url)].slice(0,60));
$('trayGrid').addEventListener('click',e=>{const t=e.target.closest('.ml-t');if(!t)return;const x=$('trayGrid')._items?.[t.dataset.i];if(!x)return;pushRecent(x);sendGif(x.url+(x.k==='sticker'?'#stk':''),x.title||'GIF')});
$('trayGrid').addEventListener('contextmenu',e=>{const t=e.target.closest('.ml-t');if(!t)return;e.preventDefault();const x=$('trayGrid')._items?.[t.dataset.i];if(!x)return;const f=jg(FK),i=f.findIndex(y=>y.url===x.url);if(i>=0)f.splice(i,1);else f.unshift({url:x.url,preview:x.preview,title:x.title,k:x.k});js(FK,f.slice(0,200));showToast(i>=0?'أُزيل من المفضلة':'⭐ أُضيف إلى المفضلة');if(mode==='fav')paint()});
/* بحث الإيموجي بالأسماء العربية (قاموس emojibase من jsDelivr، يُخزَّن محلياً) */
let EMO=null;async function emo(){if(EMO)return EMO;try{let t=localStorage.getItem('rp_emo_ar');if(!t){const r=await fetch('https://cdn.jsdelivr.net/npm/emojibase-data@15/ar/compact.json');if(!r.ok)throw 0;t=await r.text();try{localStorage.setItem('rp_emo_ar',t)}catch{}}EMO=JSON.parse(t)}catch{EMO=[]}return EMO}
async function emojiSearch(){const q=mediaSearch.trim().toLowerCase();if(!q)return;const d=await emo();if(mediaTab!=='emojis'||mediaSearch.trim().toLowerCase()!==q)return;const g=$('trayGrid');
 const r=d.filter(e=>((e.label||e.annotation||'')+' '+(e.tags||[]).join(' ')).toLowerCase().includes(q)).slice(0,160);g.className='tray-grid emojis';
 g.innerHTML=r.length?r.map(e=>`<button class="em-tile" title="${esc(e.label||'')}" onclick="insertEmoji('${e.emoji}')">${e.emoji}</button>`).join(''):msg(d.length?'لا نتائج':'تعذّر تحميل قاموس الإيموجي (يحتاج إنترنت أول مرة)')}
const _ots=onTraySearch;onTraySearch=function(v){mediaSearch=v.trim();clearTimeout(timer);
 if(mediaTab==='gifs'||mediaTab==='stickers'){mode='net';timer=setTimeout(()=>{chips();load(kind(),true)},400)}else if(mediaTab==='emojis'){timer=setTimeout(()=>mediaSearch?emojiSearch():renderMediaTray(),250)}else _ots(v)};
const _rmt=renderMediaTray;renderMediaTray=function(){
 if(mediaTab==='gifs'||mediaTab==='stickers'){if(mode==='builtin'&&mediaTab!=='stickers')mode='net';
  if(mode==='builtin'){_rmt();chips();return}
  chips();const t=S[kind()];if(mode==='net'&&!t.items.length&&!t.busy)load(kind(),!mediaSearch||t.q!==mediaSearch.trim());else paint()}
 else{_rmt();if(mediaTab==='emojis'&&mediaSearch)emojiSearch()}};
})();
