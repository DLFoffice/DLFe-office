/* ═══════════════════════════════════════════
   DLFOffice · api.js
   สถานะแอป, โหลด/บันทึกข้อมูลกับ Apps Script, การจอง/อนุมัติ/ลบ
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   STATE + DATA
═══════════════════════════════════════════ */
let ROOM_BOOKINGS=[], CAR_BOOKINGS=[];
let AUTH_TOKEN='', isAdmin=false, busy=false;
const myName=()=>state.user?state.user.name:'';
const state={
  view:'home', bookKind:'room', editing:null, pv:null,
  sel:{room:ROOMS[0], car:VEHICLES[0].plate},
  calMonth:new Date(new Date().getFullYear(),new Date().getMonth(),1), calSel:todayStr(), calFilter:'all',
  user:null,
  lf:{q:'',kind:'all',status:'all',period:'upcoming',mine:false}
};
const listOf = k => k==='room'?ROOM_BOOKINGS:CAR_BOOKINGS;
const allBookings = () => [...ROOM_BOOKINGS,...CAR_BOOKINGS];
const findB = (k,id) => listOf(k).find(x=>x.id===id);

function cacheSave(){try{localStorage.setItem('dlf_cache',JSON.stringify({rooms:ROOM_BOOKINGS,cars:CAR_BOOKINGS,ts:Date.now()}));}catch(e){}}
function cacheLoad(){
  try{const c=JSON.parse(localStorage.getItem('dlf_cache')||'null');if(!c)return false;
    ROOM_BOOKINGS=(c.rooms||[]).map(x=>normBooking({...x,kind:'room'}));
    CAR_BOOKINGS=(c.cars||[]).map(x=>normBooking({...x,kind:'car'}));return true;}catch(e){return false;}
}
function setConn(ok){
  const el=$('#conn');el.classList.toggle('on',ok);el.classList.toggle('off',!ok);
  const n=new Date();
  $('#conn-txt').textContent=ok?'อัปเดต '+pad(n.getHours())+':'+pad(n.getMinutes())+' น.':'ออฟไลน์ (ข้อมูลในเครื่อง)';
}

async function loadData(){
  try{
    if(!AUTH_TOKEN)return false;
    const r=await fetch(GAS_URL+'?action=data&token='+encodeURIComponent(AUTH_TOKEN)+'&t='+Date.now(),{cache:'no-store'});
    const j=await r.json();
    if(j.error==='unauthorized'){sessionExpired();return false;}
    if(!j.ok)throw new Error(j.message||j.error||'load failed');
    ROOM_BOOKINGS=(j.rooms||[]).map(x=>normBooking({...x,kind:'room'}));
    CAR_BOOKINGS=(j.cars||[]).map(x=>normBooking({...x,kind:'car'}));
    setHolidays(j.holidays);
    cacheSave();setConn(true);return true;
  }catch(err){
    console.warn('load fail',err);setConn(false);return false;
  }
}

async function gasPost(obj,opts={}){
  const body='payload='+encodeURIComponent(JSON.stringify({...obj,token:AUTH_TOKEN}));
  const opt={method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body};
  let j;
  try{const r=await fetch(GAS_URL,opt);j=await r.json();}
  catch(e){
    if(opts.noRetry)return {ok:false,error:'network',message:String(e)};
    // อ่านผลไม่ได้ (CORS) → ส่งซ้ำแบบ no-cors; ฝั่งเซิร์ฟเวอร์ idempotent จึงไม่บันทึก/แจ้งเตือนซ้ำ
    try{await fetch(GAS_URL,{...opt,mode:'no-cors'});j={ok:true,opaque:true};}
    catch(e2){j={ok:false,error:'network',message:String(e2)};}
  }
  if(j&&j.error==='unauthorized'&&state.user&&obj.action!=='login'){sessionExpired();return {...j,handled:true};}
  return j||{ok:false,error:'network'};
}

const ERR_TITLE={forbidden:'ไม่มีสิทธิ์ดำเนินการ',conflict:'ช่วงเวลานี้ถูกจองแล้ว',invalid:'ข้อมูลไม่ถูกต้อง',unauthorized:'ต้องเข้าสู่ระบบผู้ดูแล',busy:'ระบบกำลังทำงานอีกรายการ',network:'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้','not-found':'ไม่พบรายการ',server:'เซิร์ฟเวอร์ขัดข้อง'};
async function failAndReload(j){
  if(j.handled)return;
  await showPopup({type:j.error==='conflict'?'warning':'error',title:ERR_TITLE[j.error]||'เกิดข้อผิดพลาด',msg:(j.message||'ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง')+'\nระบบจะโหลดข้อมูลล่าสุดให้'});
  await loadData();renderAll();
}
function silentRefresh(){setTimeout(async()=>{if(await loadData())renderAll();},1200);}

/* ═══════════════════════════════════════════
   MUTATIONS
═══════════════════════════════════════════ */
function preCheck(kind,c){
  if(c.timeStart&&c.timeEnd&&toMin(c.timeEnd)<=toMin(c.timeStart))return {title:'เวลาไม่ถูกต้อง',msg:'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น'};
  const key=keyOf(kind),s1=toMin(c.timeStart,0),e1=toMin(c.timeEnd,1440);
  const hit=listOf(kind).find(o=>o.id!==c.id&&o.status!=='rejected'&&o.date===c.date&&o[key]===c[key]&&s1<toMin(o.timeEnd,1440)&&toMin(o.timeStart,0)<e1);
  if(hit)return {title:'ช่วงเวลานี้ถูกจองแล้ว',msg:`${kind==='room'?'ห้อง':'รถ'}นี้มีการจองช่วง ${fmtRange(hit.timeStart,hit.timeEnd)} โดย ${hit.requester||'-'}${hit.status==='pending'?' (รออนุมัติ)':''}`};
  if(kind==='car'&&c.driver){
    const dh=driverBusy(c.driver,c.date,c.timeStart,c.timeEnd,c.id);
    if(dh)return {title:'พนักงานขับรถไม่ว่าง',msg:`${c.driver} ติดภารกิจช่วง ${fmtRange(dh.timeStart,dh.timeEnd)} (รถ ${dh.plate||'-'})`};
  }
  return null;
}
async function saveBooking(kind,item){
  const arr=listOf(kind),idx=arr.findIndex(x=>x.id===item.id);
  if(idx>-1)arr[idx]={...arr[idx],...item};else arr.push(item);
  cacheSave();
  const j=await gasPost({action:'upsert',kind,item});
  if(!j.ok){await failAndReload(j);return null;}
  return j;
}
async function changeStatus(kind,id,status){
  const e=findB(kind,id);if(!e)return;
  const prev=e.status;e.status=status;cacheSave();
  closePreview();renderAll();
  const j=await gasPost({action:'status',kind,id,status});
  if(!j.ok){e.status=prev;await failAndReload(j);return;}
  toast(status==='approved'?'อนุมัติแล้ว — แจ้งผลทาง LINE เรียบร้อย':'บันทึกไม่อนุมัติแล้ว — แจ้งผลทาง LINE เรียบร้อย');
  silentRefresh();
}
async function removeBooking(kind,id){
  if(kind==='room')ROOM_BOOKINGS=ROOM_BOOKINGS.filter(x=>x.id!==id);else CAR_BOOKINGS=CAR_BOOKINGS.filter(x=>x.id!==id);
  cacheSave();closePreview();
  if(state.editing&&state.editing.id===id)exitEdit();
  renderAll();
  const j=await gasPost({action:'delete',kind,id});
  if(!j.ok){await failAndReload(j);return;}
  toast('ลบรายการแล้ว');silentRefresh();
}
