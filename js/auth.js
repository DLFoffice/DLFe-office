/* ═══════════════════════════════════════════
   DLFOffice · auth.js
   เข้าสู่ระบบ / ออกจากระบบ / สิทธิ์ผู้ใช้
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   AUTH
═══════════════════════════════════════════ */
const SESSION_KEY='dlf_session_v2';
function loadSession(){
  try{const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    if(s&&s.token&&s.exp>Date.now())return s;
    localStorage.removeItem(SESSION_KEY);}catch(e){}
  return null;
}
function clearLocalData(){
  ROOM_BOOKINGS=[];CAR_BOOKINGS=[];
  try{localStorage.removeItem('dlf_cache');localStorage.removeItem('dlf_person');}catch(e){}
}
function setSession(u,persist=true){
  state.user=u||null;AUTH_TOKEN=u?u.token:'';isAdmin=!!(u&&u.role==='admin');
  if(persist){try{u?localStorage.setItem(SESSION_KEY,JSON.stringify(u)):localStorage.removeItem(SESSION_KEY);}catch(e){}}
  document.body.classList.toggle('is-admin',isAdmin);
  document.body.classList.toggle('locked',!u);
  renderAcct();applyUserToForm();applyDateMin();
  if(!isAdmin&&state.view==='stats')go('home');
  renderAll();
}
function initialOf(n){return String(n||'?').replace(/^(ว่าที่ร้อยตรีหญิง|ว่าที่ร้อยตรี|นางสาว|นาย|นาง|ดร\.)\s*/,'').trim().slice(0,1)||'?';}
function renderAcct(){
  const u=state.user;if(!u){$('#acct').innerHTML='';return;}
  const sub=isAdmin?'ผู้ดูแลระบบ':[u.position||'ผู้ใช้งาน',u.dept].filter(Boolean).join(' · ');
  $('#acct').innerHTML=`
    <div class="acct-card${isAdmin?' admin':''}"><span class="acct-ava${isAdmin?'':' ini'}">${isAdmin?'<i data-lucide="shield-check"></i>':esc(initialOf(u.name))}</span><div><b title="${esc(u.name)}">${esc(u.name)}</b><small title="${esc(sub)}">${esc(sub)}</small></div></div>
    ${isAdmin?`<button class="side-btn" data-act="line-test"><i data-lucide="message-circle"></i>ทดสอบแจ้งเตือน LINE</button>
    <button class="side-btn" data-act="sync-all"><i data-lucide="upload-cloud"></i>ซิงค์ทั้งหมดไป Sheet</button>`
    :'<div class="acct-note">สิทธิ์ของคุณ: ดูรายการจอง และส่งคำขอจองในชื่อของตนเอง</div>'}
    <button class="side-btn danger" data-act="logout"><i data-lucide="log-out"></i>ออกจากระบบ</button>`;
  icons();
}
function applyUserToForm(){
  const r=$('#f-requester'),u=state.user,lock=!!(u&&!isAdmin);
  r.readOnly=lock;r.classList.toggle('locked',lock);
  if(lock){r.value=u.name;r.closest('.field').classList.remove('invalid');if(u.dept&&DEPTS.includes(u.dept))ensureOpt('#f-dept',u.dept);}
  else if(u&&isAdmin&&r.value===''){try{const p=JSON.parse(localStorage.getItem('dlf_person')||'null');if(p&&p.requester)r.value=p.requester;}catch(e){}}
  $('#requester-note').classList.toggle('hidden',!lock);
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const reducedMotion=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const LS_BTN_HTML='<span class="bl">เข้าสู่ระบบ</span><i data-lucide="arrow-right"></i>';
function resetLoginBtn(){const b=$('#ls-btn');b.disabled=false;b.classList.remove('loading','done');b.innerHTML=LS_BTN_HTML;icons();}
function showLogin(msg){
  closePreview();closeDrawer();
  const ls=$('#login-screen');
  ls.classList.remove('leaving','ls-in');
  document.body.classList.add('locked');
  void ls.offsetWidth;ls.classList.add('ls-in');            // เล่นแอนิเมชันเปิดหน้าใหม่ทุกครั้ง
  resetLoginBtn();
  const err=$('#ls-err');err.style.display=msg?'block':'none';if(msg)err.textContent=msg;
  $('#ls-pass').value='';updateIdCounter();
  setTimeout(()=>$('#ls-user').focus(),reducedMotion()?0:500);
}
/* เปลี่ยนจากหน้า login เข้าสู่ระบบ: ปุ่มเขียว → วงกลมขยายจากปุ่ม → เผยหน้าแรกพร้อมแอนิเมชัน */
async function enterApp(btn,ses){
  const p=$('#portal'),r=btn.getBoundingClientRect(),fast=reducedMotion();
  p.style.setProperty('--x',(r.left+r.width/2)+'px');p.style.setProperty('--y',(r.top+r.height/2)+'px');
  if(!fast){
    await wait(380);
    $('#login-screen').classList.add('leaving');
    p.classList.remove('fade');p.classList.add('grow');
    await wait(820);
  }
  clearLocalData();setSession(ses);
  $('#ls-user').value='';$('#ls-pass').value='';
  document.body.classList.add('app-enter');go('home');
  loadData().then(ok=>{renderAll();});
  if(!fast){await wait(250);p.classList.add('fade');await wait(520);}
  p.classList.remove('grow','fade');$('#login-screen').classList.remove('leaving');
  setTimeout(()=>document.body.classList.remove('app-enter'),1400);
  toast('ยินดีต้อนรับ '+(ses.name||''));
}
function sessionExpired(){
  if(!state.user)return;
  setSession(null);clearLocalData();renderAll();
  showLogin('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');
}
function updateIdCounter(){
  const v=$('#ls-user').value.trim(),c=$('#ls-count');
  if(/^\d+$/.test(v)){c.textContent=`เลขบัตรประชาชน ${v.length}/13 หลัก`;c.classList.toggle('ok',v.length===13);}
  else{c.textContent='';c.classList.remove('ok');}
}
async function doLogin(){
  const u=$('#ls-user').value.trim(),p=$('#ls-pass').value.trim(),err=$('#ls-err'),btn=$('#ls-btn'),card=$('#ls-card');
  if(btn.disabled)return;
  const fail=m=>{err.textContent=m;err.style.display='block';card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake');};
  if(!u||!p)return fail('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  if(/^\d+$/.test(u)&&u.length!==13)return fail('เลขบัตรประชาชนต้องมี 13 หลัก');
  btn.disabled=true;btn.classList.add('loading');btn.innerHTML='<span class="spin-i"></span><span class="bl">กำลังตรวจสอบ…</span>';err.style.display='none';
  const j=await gasPost({action:'login',username:u,password:p});
  if(j&&j.ok&&j.token){
    btn.classList.remove('loading');btn.classList.add('done');
    btn.innerHTML='<i data-lucide="check-circle"></i><span class="bl">เข้าสู่ระบบสำเร็จ</span>';icons();
    await enterApp(btn,{token:j.token,role:j.role||'admin',name:j.name||'ผู้ใช้งาน',dept:j.dept||'',position:j.position||'',exp:Date.now()+(j.expiresInHours||8)*3600e3});
    return;
  }
  resetLoginBtn();
  $('#ls-pass').value='';$('#ls-pass').focus();
  fail(j.opaque?'อ่านผลจากเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบการ Deploy (Who has access: Anyone)'
    :j.error==='locked'?'เข้าสู่ระบบผิดหลายครั้ง กรุณารอ 10 นาทีแล้วลองใหม่'
    :j.error==='hr-unavailable'?'ตรวจสอบกับระบบ HR ไม่สำเร็จ: '+(j.message||'')
    :j.error==='not-configured'?'ยังไม่ได้ตั้งค่า ADMIN_USER / ADMIN_PASS ใน Script Properties'
    :j.error==='network'?'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'
    :'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง ตรวจสอบแล้วลองอีกครั้ง');
}
function doLogout(){
  gasPost({action:'logout'});
  if(state.editing)exitEdit();
  setSession(null);clearLocalData();renderAll();showLogin();
}
