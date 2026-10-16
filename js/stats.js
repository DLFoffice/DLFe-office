/* ═══════════════════════════════════════════
   Smart-Office DLF · stats.js
   หน้าสถิติและรายงาน
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   STATS
═══════════════════════════════════════════ */
const charts={};
function mkChart(id,cfg,hasData){
  const cv=document.getElementById(id);cv.parentElement.classList.toggle('is-empty',!hasData);
  if(charts[id]){charts[id].destroy();delete charts[id];}
  if(hasData)charts[id]=new Chart(cv,cfg);
}
function renderStats(){
  if(!window.Chart)return;
  Chart.defaults.font.family="'IBM Plex Sans Thai','Inter',sans-serif";Chart.defaults.color='#64748B';
  const all=allBookings(),active=all.filter(b=>b.status!=='rejected'),t=todayStr(),ym=t.slice(0,7);
  const decided=all.filter(b=>b.status!=='pending');
  const rate=decided.length?Math.round(all.filter(b=>b.status==='approved').length/decided.length*100):0;
  const cnt=(arr,f)=>{const o={};arr.forEach(b=>{const k=f(b);if(k)o[k]=(o[k]||0)+1;});return Object.entries(o).sort((a,b)=>b[1]-a[1]);};
  const rooms=cnt(active.filter(b=>b.kind==='room'),b=>b.room),depts=cnt(active,b=>b.dept);
  $('#stat-kpis').innerHTML=[
    {tone:'t-room',icon:'building-2',v:ROOM_BOOKINGS.length,l:'จองห้องประชุมทั้งหมด',s:'เดือนนี้ '+active.filter(b=>b.kind==='room'&&(b.date||'').startsWith(ym)).length+' รายการ'},
    {tone:'t-car',icon:'car',v:CAR_BOOKINGS.length,l:'ขอใช้รถทั้งหมด',s:'เดือนนี้ '+active.filter(b=>b.kind==='car'&&(b.date||'').startsWith(ym)).length+' รายการ'},
    {tone:'t-ok',icon:'percent',v:rate+'%',l:'อัตราการอนุมัติ',s:'จาก '+decided.length+' รายการที่พิจารณาแล้ว'},
    {tone:'t-warn',icon:'users',v:depts.length,l:'กลุ่มงานที่ใช้บริการ',s:depts[0]?'มากสุด: '+depts[0][0]:'—'},
    {tone:'t-pink',icon:'star',v:rooms[0]?rooms[0][1]:0,l:'ห้องยอดนิยม (ครั้ง)',s:rooms[0]?shortRoom(rooms[0][0]):'—'}
  ].map(kpiHtml).join('');

  const labels=[],rd=[],cd=[],now=new Date();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1),k=d.getFullYear()+'-'+pad(d.getMonth()+1);
    labels.push(MONTHS_S[d.getMonth()]+' '+String(d.getFullYear()+543).slice(2));
    rd.push(active.filter(b=>b.kind==='room'&&(b.date||'').startsWith(k)).length);cd.push(active.filter(b=>b.kind==='car'&&(b.date||'').startsWith(k)).length);}
  mkChart('ch-monthly',{type:'bar',data:{labels,datasets:[{label:'ห้องประชุม',data:rd,backgroundColor:'#5B5CF6',borderRadius:6,maxBarThickness:28},{label:'รถยนต์',data:cd,backgroundColor:'#0EA5A0',borderRadius:6,maxBarThickness:28}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,boxHeight:10,usePointStyle:true}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0},grid:{color:'#EFF1F6'}}}}},rd.some(Boolean)||cd.some(Boolean));
  mkChart('ch-rooms',{type:'doughnut',data:{labels:rooms.map(r=>shortRoom(r[0])),datasets:[{data:rooms.map(r=>r[1]),backgroundColor:rooms.map(r=>ROOM_PALETTE[Math.max(0,ROOMS.indexOf(r[0]))%5].m),borderWidth:3,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'64%',plugins:{legend:{position:'bottom',labels:{boxWidth:9,font:{size:10},usePointStyle:true}}}}},rooms.length>0);
  const dt=depts.slice(0,8);
  mkChart('ch-depts',{type:'bar',data:{labels:dt.map(d=>d[0].replace(/^กลุ่ม(งาน)?/,'')),datasets:[{label:'จำนวนการจอง',data:dt.map(d=>d[1]),backgroundColor:'#8B5CF6',borderRadius:5,maxBarThickness:18}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{title:c=>dt[c[0].dataIndex][0]}}},scales:{x:{beginAtZero:true,ticks:{precision:0},grid:{color:'#EFF1F6'}},y:{grid:{display:false},ticks:{font:{size:10}}}}}},dt.length>0);

  const rowsAll=all.slice().sort((a,b)=>byTime(b,a));
  $('#tbl-count').textContent=rowsAll.length+' รายการ';
  $('#tbl-body').innerHTML=rowsAll.length?rowsAll.map(b=>`<tr>
    <td style="white-space:nowrap">${esc(b.docNo||'—')}</td>
    <td><span class="kb ${b.kind}">${b.kind==='room'?'ห้อง':'รถ'}</span></td>
    <td style="white-space:nowrap">${fmtThaiShort(b.date)}</td>
    <td style="white-space:nowrap" class="num">${fmtRange(b.timeStart,b.timeEnd)}</td>
    <td>${esc(b.kind==='room'?shortRoom(b.room):b.plate)}</td><td>${esc(b.requester||'—')}</td><td>${esc(b.dept||'—')}</td>
    <td class="clip" title="${esc(b.purpose)}">${esc(b.purpose||'—')}</td><td>${statusPill(b.status)}</td></tr>`).join('')
    :`<tr><td colspan="9">${emptyHtml('inbox','ยังไม่มีข้อมูล','')}</td></tr>`;
  icons();
}
