/* ═══════════════════════════════════════════
   DLFOffice · app.js
   เริ่มต้นระบบ (โหลดเป็นไฟล์สุดท้าย)
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
let _lastDay=todayStr();
function tick(){
  const n=new Date();$('#clock').textContent=pad(n.getHours())+':'+pad(n.getMinutes())+':'+pad(n.getSeconds())+' น.';
  if(todayStr()!==_lastDay){_lastDay=todayStr();renderAll();}
}
async function autoRefresh(){
  if(!state.user||document.visibilityState!=='visible'||busy)return;
  if($$('.ov.show').length)return;
  if(await loadData())renderAll();
}
(async function init(){
  initForm();
  initDocs();
  setBookKind('room');
  tick();setInterval(tick,1000);
  const ses=loadSession();
  if(ses){
    document.body.classList.add('app-enter');setTimeout(()=>document.body.classList.remove('app-enter'),1400);
    setSession(ses,false);go('home');
    if(cacheLoad())renderAll();
    await loadData();renderAll();
  }else{
    setSession(null,false);showLogin();
  }
  setInterval(autoRefresh,AUTO_REFRESH_MS);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')autoRefresh();});
})();
