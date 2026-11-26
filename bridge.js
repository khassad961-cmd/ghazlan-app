/* جسر الفقاعة العائمة — يعمل فقط داخل تطبيق أندرويد */
(()=>{const C=window.Capacitor;if(!C||!C.isNativePlatform||!C.isNativePlatform())return;
const B=C.registerPlugin('Bubble'),A=C.registerPlugin('App');
const on=()=>store.get('rp_ovl','0')==='1';let bg=false,unread=0,lastTs=0;
A.addListener('appStateChange',async s=>{bg=!s.isActive;if(bg){if(on()&&(await B.hasPermission()).granted)B.show({count:unread,text:''}).catch(()=>{})}else{unread=0;B.hide().catch(()=>{})}});
const row=document.createElement('div');row.className='switch-row';row.innerHTML='<span>🫧 فقاعة فوق التطبيقات الأخرى (أندرويد)</span><input id="v9ovl" type="checkbox" style="width:18px;height:18px">';
const anchor=document.getElementById('v8ss');if(anchor)anchor.closest('.sec-box').appendChild(row);
const chk=document.getElementById('v9ovl');if(chk){chk.checked=on();chk.onchange=async()=>{store.set('rp_ovl',chk.checked?'1':'0');if(chk.checked&&!(await B.hasPermission()).granted){showToast('اسمح بالعرض فوق التطبيقات ثم ارجع');B.requestPermission()}}}
const _r=renderCurrentChat;renderCurrentChat=function(){_r();if(!bg||!on())return;const lm=getChat()?.messages?.at(-1);if(lm&&lm.role==='model'&&lm.ts!==lastTs){lastTs=lm.ts;unread++;B.show({count:unread,text:(lm.raw||'📎 ملصق').slice(0,70)}).catch(()=>{})}};
})();
