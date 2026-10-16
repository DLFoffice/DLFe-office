/* ═══════════════════════════════════════════
   DLFOffice · calendar.js
   ปฏิทินการจอง + วันหยุดราชการ
═══════════════════════════════════════════ */
/* ─── CALENDAR ─── */
function calSource(){const f=state.calFilter;return allBookings().filter(b=>b.status!=='rejected'&&(f==='all'||b.kind===f));}
function renderCalendar(){
  const y=state.calMonth.getFullYear(),m=state.calMonth.getMonth(),t=todayStr();
  $('#cal-month').textContent=MONTHS[m];$('#cal-year').textContent='พ.ศ. '+(y+543);
  const map={};calSource().forEach(b=>{(map[b.date]=map[b.date]||[]).push(b);});
  Object.values(map).forEach(a=>a.sort(byTime));
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),cells=Math.ceil((first+days)/7)*7;
  const start=new Date(y,m,1-first);
  let h='',work=0,monthEv=0,rooms=0,cars=0;const hols=[];
  for(let i=0;i<cells;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const ds=ymd(d),inM=d.getMonth()===m,dow=d.getDay(),we=dow===0||dow===6,hol=holidayName(ds);
    const evs=inM?(map[ds]||[]):[];
    if(inM){
      if(!we&&!hol)work++;
      if(hol)hols.push({ds,name:hol,d:d.getDate()});
      monthEv+=evs.length;evs.forEach(b=>b.kind==='room'?rooms++:cars++);
    }
    let cls='cc';
    if(!inM)cls+=' out';if(ds===t)cls+=' today';if(ds===state.calSel&&inM)cls+=' sel';if(ds<t)cls+=' past';
    if(we)cls+=' wknd';if(hol)cls+=' hol';
    const maxP=hol?2:3;
    const pills=evs.slice(0,maxP).map(b=>{const c=colorOf(b);return `<span class="evp${b.status==='pending'?' pend':''}" style="--c:${c.m};--cs:${c.s};--cd:${c.d}"><b>${b.timeStart||'—'}</b><span>${esc(b.kind==='room'?shortRoom(b.room):b.plate)}</span></span>`;}).join('');
    const more=evs.length>maxP?`<span class="evm">+${evs.length-maxP} รายการ</span>`:'';
    const dots=evs.slice(0,4).map(b=>`<i style="background:${colorOf(b).m}"></i>`).join('');
    const tip=[fmtDayHead(ds).main,hol?'วันหยุดราชการ: '+hol:(we?'วันหยุดเสาร์-อาทิตย์':''),evs.length?'การจอง '+evs.length+' รายการ':''].filter(Boolean).join(' · ');
    h+=`<button type="button" class="${cls}" data-date="${ds}" title="${esc(tip)}">
      <span class="cc-top"><span class="cn">${d.getDate()}</span>${evs.length?`<span class="cnt">${evs.length}</span>`:''}</span>
      ${hol&&inM?`<span class="hol-tag">${esc(hol)}</span>`:''}
      <span class="evs">${pills}${more}</span><span class="dots">${dots}</span></button>`;
  }
  $('#cal-grid').innerHTML=h;
  const f=state.calFilter;
  $('#cal-sum').innerHTML=
    `<span class="cal-stat">การจองเดือนนี้ <b>${monthEv}</b> รายการ</span>`+
    (f!=='car'?`<span class="cal-stat"><i style="background:var(--room)"></i>ห้องประชุม <b>${rooms}</b></span>`:'')+
    (f!=='room'?`<span class="cal-stat"><i style="background:var(--car)"></i>รถยนต์ <b>${cars}</b></span>`:'')+
    `<span class="cal-stat">วันทำการ <b>${work}</b> วัน</span>`+
    hols.map(x=>`<button type="button" class="hol-chip" data-jump="${x.ds}" title="${esc(fmtDayHead(x.ds).main)}"><b>${x.d}</b>${esc(x.name)}</button>`).join('');
  const leg=f==='car'?[]:ROOMS.map((r,i)=>`<span><i style="background:${ROOM_PALETTE[i%5].m}"></i>${esc(shortRoom(r))}</span>`);
  if(f!=='room')leg.push(`<span><i style="background:${CAR_COLOR.m}"></i>รถยนต์</span>`);
  leg.push('<span class="sep"></span>',
    '<span><i style="background:#FFF1F2;border:1px solid #FB7185"></i>วันหยุดราชการ</span>',
    '<span><i style="background:#FFF8F9;border:1px solid #FECDD3"></i>เสาร์ – อาทิตย์</span>',
    '<span><i style="background:#fff;box-shadow:inset 0 0 0 1px var(--room)"></i>รออนุมัติ</span>');
  $('#cal-legend').innerHTML=leg.join('');
  renderAgenda();
}
function calJump(ds){
  const d=parseYmd(ds);state.calSel=ds;state.calMonth=new Date(d.getFullYear(),d.getMonth(),1);renderCalendar();
}
function renderAgenda(){
  const d=state.calSel,dh=fmtDayHead(d),t=todayStr(),dt=parseYmd(d),we=dt.getDay()===0||dt.getDay()===6,hol=holidayName(d);
  $('#ag-title').textContent=dh.tag?dh.tag+' · '+fmtThaiDate(d):fmtThaiDate(d);
  const list=calSource().filter(b=>b.date===d).sort(byTime);
  $('#ag-sub').textContent='วัน'+DOW[dt.getDay()]+' · '+list.length+' รายการ';
  $('#ag-book').dataset.date=d;$('#ag-book').classList.toggle('hidden',d<t);
  let h='';
  if(hol)h+=`<div class="ag-banner hol"><i data-lucide="flag"></i><div><b>วันหยุดราชการ</b><small>${esc(hol)}</small></div></div>`;
  else if(we)h+=`<div class="ag-banner we"><i data-lucide="sun"></i><div><b>วันหยุดเสาร์ – อาทิตย์</b><small>ตรวจสอบความพร้อมของผู้ดูแลก่อนจอง</small></div></div>`;
  h+=list.length?list.map(b=>itemHtml(b,{actions:true})).join(''):emptyHtml('calendar-plus','ไม่มีการจองในวันนี้',d>=t?'กด "จองวันนี้" เพื่อเริ่มจอง':'');
  const next=Object.keys(HOLIDAYS).filter(k=>k>=t).sort().slice(0,4);
  if(next.length)h+=`<div class="ag-next"><h5><i data-lucide="flag"></i>วันหยุดราชการที่จะถึง</h5>`+next.map(k=>{const x=parseYmd(k);
    return `<button type="button" class="ag-hol" data-jump="${k}"><span class="d"><b>${x.getDate()}</b><small>${MONTHS_S[x.getMonth()]}</small></span><span class="t">${esc(HOLIDAYS[k])}<small>วัน${DOW[x.getDay()]} · ${k===t?'วันนี้':'อีก '+Math.round((x-parseYmd(t))/864e5)+' วัน'}</small></span></button>`;}).join('')+'</div>';
  $('#ag-list').innerHTML=h;
  icons();
}

/* ─── วันหยุดราชการ (แหล่งเดียวกับระบบ HR) ───
   ข้อมูลหลักมาจาก Google Calendar ผ่าน Apps Script — ถ้ายังดึงไม่ได้ใช้รายการสำรองนี้ */
const FALLBACK_HOLIDAYS={
  '2026-01-01':'วันขึ้นปีใหม่','2026-01-02':'วันหยุดพิเศษ (ครม.)','2026-03-03':'วันมาฆบูชา','2026-04-06':'วันจักรี',
  '2026-04-13':'วันสงกรานต์','2026-04-14':'วันสงกรานต์','2026-04-15':'วันสงกรานต์','2026-05-01':'วันแรงงานแห่งชาติ',
  '2026-05-04':'วันฉัตรมงคล','2026-05-13':'วันพืชมงคล','2026-05-31':'วันวิสาขบูชา','2026-06-01':'ชดเชยวันวิสาขบูชา',
  '2026-06-03':'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี','2026-07-28':'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
  '2026-07-29':'วันอาสาฬหบูชา','2026-07-30':'วันเข้าพรรษา','2026-08-12':'วันแม่แห่งชาติ','2026-10-13':'วันนวมินทรมหาราช',
  '2026-10-16':'วันหยุดพิเศษ (ครม.)','2026-10-23':'วันปิยมหาราช','2026-12-05':'วันพ่อแห่งชาติ','2026-12-07':'ชดเชยวันพ่อแห่งชาติ',
  '2026-12-10':'วันรัฐธรรมนูญ','2026-12-31':'วันสิ้นปี',
  '2027-01-01':'วันขึ้นปีใหม่','2027-02-21':'วันมาฆบูชา','2027-02-22':'ชดเชยวันมาฆบูชา','2027-04-06':'วันจักรี',
  '2027-04-13':'วันสงกรานต์','2027-04-14':'วันสงกรานต์','2027-04-15':'วันสงกรานต์','2027-05-01':'วันแรงงานแห่งชาติ',
  '2027-05-03':'ชดเชยวันแรงงานแห่งชาติ','2027-05-04':'วันฉัตรมงคล','2027-05-20':'วันวิสาขบูชา',
  '2027-06-03':'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี','2027-07-18':'วันอาสาฬหบูชา','2027-07-19':'ชดเชยวันอาสาฬหบูชา',
  '2027-07-28':'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว','2027-08-12':'วันแม่แห่งชาติ','2027-10-13':'วันนวมินทรมหาราช',
  '2027-10-23':'วันปิยมหาราช','2027-10-25':'ชดเชยวันปิยมหาราช','2027-12-05':'วันพ่อแห่งชาติ','2027-12-06':'ชดเชยวันพ่อแห่งชาติ',
  '2027-12-10':'วันรัฐธรรมนูญ','2027-12-31':'วันสิ้นปี'
};
/* วันหยุดเฉพาะของหน่วยงาน เช่น '2026-11-15':'วันสถาปนามูลนิธิ' */
const ORG_EXTRA_HOLIDAYS={};
let HOLIDAYS=Object.assign({},FALLBACK_HOLIDAYS,ORG_EXTRA_HOLIDAYS);
try{const c=JSON.parse(localStorage.getItem('dlf_holidays')||'null');if(c&&Object.keys(c).length)HOLIDAYS=Object.assign({},c,ORG_EXTRA_HOLIDAYS);}catch(e){}
function setHolidays(map){
  if(!map||!Object.keys(map).length)return;
  HOLIDAYS=Object.assign({},map,ORG_EXTRA_HOLIDAYS);
  try{localStorage.setItem('dlf_holidays',JSON.stringify(map));}catch(e){}
}
function holidayName(ds){return HOLIDAYS[ds]||'';}
function isWeekendYmd(ds){const w=parseYmd(ds).getDay();return w===0||w===6;}
