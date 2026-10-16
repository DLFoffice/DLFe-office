/* ═══════════════════════════════════════════
   Smart-Office DLF · views.js
   เปลี่ยนหน้า, การ์ดรายการ, หน้าแรก, หน้ารายการจอง
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════ */
function go(view){
  if(view==='stats'&&!isAdmin)view='home';
  state.view=view;
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===view));
  $$('[data-go]').forEach(b=>{if(b.classList.contains('nav-item')||b.classList.contains('bn-item'))b.classList.toggle('active',b.dataset.go===view);});
  $('#pg-title').textContent=VIEW_META[view].t;$('#pg-sub').textContent=VIEW_META[view].s;
  const tt=$('.tb-title');tt.style.animation='none';void tt.offsetWidth;tt.style.animation='';
  document.body.classList.toggle('k-car',view==='book'&&state.bookKind==='car');
  closeDrawer();window.scrollTo({top:0,behavior:'instant'});
  if(view==='book'){renderResTiles();renderAvailability();}
  if(view==='stats')renderStats();
  if(view==='calendar')renderCalendar();
  if(view==='docs')openDocsView();
  icons();
}
function openDrawer(){$('#sidebar').classList.add('open');$('#scrim').classList.add('show');}
function closeDrawer(){$('#sidebar').classList.remove('open');$('#scrim').classList.remove('show');}

/* ═══════════════════════════════════════════
   COMMON RENDER
═══════════════════════════════════════════ */
function itemHtml(e,o={}){
  const c=colorOf(e);
  const meta=[];
  meta.push(`<span><i data-lucide="user"></i>${esc(e.requester||'-')}${e.dept?' · '+esc(e.dept):''}</span>`);
  if(e.kind==='car'&&e.destination)meta.push(`<span><i data-lucide="map-pin"></i>${esc(e.destination)}</span>`);
  if(e.kind==='room')meta.push(`<span><i data-lucide="users"></i>${e.attendees||1} คน</span>`);
  const act=(o.actions&&isAdmin&&e.status==='pending')?`<div class="bk-act">
      <button class="btn btn-ok btn-xs" data-act="approve" data-kind="${e.kind}" data-id="${esc(e.id)}"><i data-lucide="check"></i>อนุมัติ</button>
      <button class="btn btn-bad-soft btn-xs" data-act="reject" data-kind="${e.kind}" data-id="${esc(e.id)}"><i data-lucide="x"></i>ไม่อนุมัติ</button></div>`:'';
  return `<article class="bk${e.status==='rejected'?' is-rej':''}" tabindex="0" data-kind="${e.kind}" data-id="${esc(e.id)}" style="--c:${c.m};--cs:${c.s};--cd:${c.d}">
    <div class="bk-time">${o.showDate?`<small>${fmtThaiShort(e.date)}</small>`:''}<b>${e.timeStart||'—'}</b>${e.timeEnd?`<span>${e.timeEnd}</span>`:''}</div>
    <div class="bk-main">
      <div class="bk-top"><span class="bk-title"><i data-lucide="${e.kind==='room'?'building-2':'car'}"></i>${esc(titleOf(e))}</span>${statusPill(e.status)}</div>
      <div class="bk-purpose">${esc(e.purpose||'-')}</div>
      <div class="bk-meta">${meta.join('')}</div>${act}
    </div></article>`;
}
function groupHtml(arr,o){
  let h='',cur=null;
  arr.forEach(b=>{
    if(b.date!==cur){
      if(cur!==null)h+='</div>';
      cur=b.date;const dh=fmtDayHead(b.date);
      h+=`<div class="dgrp"><div class="dhead"><span>${dh.main}</span>${dh.tag?`<em>${dh.tag}</em>`:''}</div>`;
    }
    h+=itemHtml(b,o);
  });
  if(cur!==null)h+='</div>';
  return h;
}
function kpiHtml(k){
  return `<div class="kpi${k.act?' click':''}"${k.act?` data-act="${k.act}"`:''}>
    <div class="kpi-ico ${k.tone}"><i data-lucide="${k.icon}"></i></div>
    <div style="min-width:0"><div class="kpi-v">${k.v}</div><div class="kpi-l">${k.l}</div>${k.s?`<div class="kpi-s" title="${esc(k.s)}">${esc(k.s)}</div>`:''}</div></div>`;
}

function renderAll(){
  renderHome();renderList();renderCalendar();renderResTiles();renderAvailability();
  if(state.view==='stats')renderStats();
  const pend=allBookings().filter(b=>b.status==='pending'&&b.date>=todayStr()).length;
  $$('[data-badge="pending"]').forEach(el=>{el.textContent=pend;el.classList.toggle('hidden',!isAdmin||!pend);});
  icons();
}

/* ─── HOME ─── */
function renderHome(){
  const now=new Date(),t=todayStr(),h=now.getHours();
  $('#hero-hi').textContent=h<12?'สวัสดีตอนเช้า ☀️':h<17?'สวัสดีตอนบ่าย 🌤️':'สวัสดีตอนเย็น 🌙';
  $('#hero-date').textContent='วัน'+DOW[now.getDay()]+'ที่ '+fmtThaiDate(t)+' · ต้องการจองอะไรวันนี้?';
  $('#hero-room-sub').textContent=ROOMS.length+' ห้องประชุม';
  $('#hero-car-sub').textContent=VEHICLES.length+' คัน พร้อมพนักงานขับ';
  const all=allBookings(),active=all.filter(b=>b.status!=='rejected');
  const pending=all.filter(b=>b.status==='pending'&&b.date>=t).sort(byTime);
  const month=t.slice(0,7);
  $('#home-kpis').innerHTML=[
    {tone:'t-room',icon:'building-2',v:active.filter(b=>b.kind==='room'&&b.date===t).length,l:'ห้องประชุมวันนี้'},
    {tone:'t-car',icon:'car',v:active.filter(b=>b.kind==='car'&&b.date===t).length,l:'การใช้รถวันนี้'},
    {tone:'t-warn',icon:'hourglass',v:pending.length,l:'รอการอนุมัติ',act:'kpi-pending'},
    {tone:'t-ok',icon:'calendar-check',v:active.filter(b=>(b.date||'').startsWith(month)).length,l:'การจองเดือนนี้'}
  ].map(kpiHtml).join('');

  const mine=state.user&&!isAdmin?all.filter(b=>b.requester===myName()&&b.date>=t).sort(byTime):[];
  $('#mine-card').classList.toggle('hidden',!state.user||isAdmin);
  $('#mine-count').textContent=mine.length;
  $('#mine-list').innerHTML=mine.length?mine.map(b=>itemHtml(b,{showDate:true})).join(''):emptyHtml('calendar-plus','ยังไม่มีคำขอที่กำลังจะถึง','กด "จองใหม่" เพื่อส่งคำขอ — ติดตามสถานะการอนุมัติได้ที่นี่');
  $('#pending-card').classList.toggle('hidden',!isAdmin||!pending.length);
  $('#pending-count').textContent=pending.length;
  $('#pending-list').innerHTML=pending.map(b=>itemHtml(b,{showDate:true,actions:true})).join('');

  const today=active.filter(b=>b.date===t).sort(byTime);
  $('#today-count').textContent=today.length;
  $('#today-list').innerHTML=today.length?today.map(b=>itemHtml(b)).join(''):emptyHtml('coffee','วันนี้ยังไม่มีการจอง','ห้องประชุมและรถว่างทั้งวัน');
  const upTo=addDays(t,7);
  const up=active.filter(b=>b.date>t&&b.date<=upTo).sort(byTime);
  $('#upcoming-count').textContent=up.length;
  $('#upcoming-list').innerHTML=up.length?groupHtml(up,{}):emptyHtml('calendar','ไม่มีรายการใน 7 วันข้างหน้า','');
}

/* ─── LIST ─── */
function renderList(){
  const {q,kind,status,period}=state.lf,t=todayStr(),qq=q.trim().toLowerCase();
  let arr=allBookings().filter(b=>(!state.lf.mine||b.requester===myName())&&(kind==='all'||b.kind===kind)&&(status==='all'||b.status===status)&&(period==='all'||(period==='upcoming'?b.date>=t:b.date<t)));
  if(qq)arr=arr.filter(b=>[b.docNo,b.requester,b.dept,b.purpose,b.room,b.plate,b.driver,b.destination,b.note,(b.companions||[]).join(' ')].join(' ').toLowerCase().includes(qq));
  arr.sort(period==='upcoming'?byTime:(a,b)=>byTime(b,a));
  $('#list-meta').textContent='พบ '+arr.length+' รายการ'+(period==='upcoming'?' (เรียงจากใกล้ที่สุด)':' (เรียงจากล่าสุด)');
  $('#list-body').innerHTML=arr.length?groupHtml(arr,{actions:true}):emptyHtml('inbox','ไม่พบรายการ','ลองเปลี่ยนคำค้นหาหรือตัวกรอง');
}
