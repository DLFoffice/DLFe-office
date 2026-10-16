/* ═══════════════════════════════════════════
   DLFOffice · utils.js
   ฟังก์ชันช่วยทั่วไป: วันที่ไทย, เวลา, escape, สี
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function pad(n){return String(n).padStart(2,'0');}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function todayStr(){return ymd(new Date());}
function parseYmd(s){const p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1);}
function addDays(s,n){const d=parseYmd(s);d.setDate(d.getDate()+n);return ymd(d);}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function hm(m){return pad(Math.floor(m/60))+':'+pad(m%60);}
function toMin(t,def){if(!t)return def;const p=String(t).split(':');return (+p[0])*60+(+p[1]||0);}
function esc(s){if(s===undefined||s===null)return '';return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function validYmd(s){return /^\d{4}-\d{2}-\d{2}$/.test(s||'');}
function fmtThaiDate(s){if(!validYmd(s))return '-';const d=parseYmd(s);return d.getDate()+' '+MONTHS[d.getMonth()]+' '+(d.getFullYear()+543);}
function fmtThaiShort(s){if(!validYmd(s))return '-';const d=parseYmd(s);return d.getDate()+' '+MONTHS_S[d.getMonth()]+' '+String(d.getFullYear()+543).slice(2);}
function fmtDayHead(s){
  if(!validYmd(s))return {main:'ไม่ระบุวันที่',tag:''};
  const d=parseYmd(s),t=todayStr();
  const tag=s===t?'วันนี้':s===addDays(t,1)?'พรุ่งนี้':s===addDays(t,-1)?'เมื่อวาน':'';
  return {main:'วัน'+DOW[d.getDay()]+'ที่ '+fmtThaiDate(s),tag};
}
function fmtRange(s,e){if(!s&&!e)return 'ไม่ระบุเวลา';if(!e)return s+' น.';if(!s)return 'ถึง '+e+' น.';return s+' – '+e+' น.';}
function normDate(v){if(!v)return '';const p=String(v).split('-');if(p.length===3&&+p[0]>2400){p[0]=String(+p[0]-543);return p.join('-');}return v;}
function normalizeTime(t){
  if(!t)return '';
  const s=String(t).trim();
  if(/^\d{1,2}:\d{2}$/.test(s)){const[h,m]=s.split(':');return pad(+h)+':'+m;}
  const n=parseFloat(s);
  if(!isNaN(n)&&n>0&&n<1){const tot=Math.round(n*1440);return pad(Math.floor(tot/60)%24)+':'+pad(tot%60);}
  const d=new Date(s);
  if(!isNaN(d.getTime())&&(d.getHours()||d.getMinutes()))return pad(d.getHours())+':'+pad(d.getMinutes());
  return '';
}
function normBooking(x){
  const b={...x,id:String(x.id||uid()),date:normDate(x.date||''),timeStart:normalizeTime(x.timeStart),timeEnd:normalizeTime(x.timeEnd),status:STATUS[x.status]?x.status:'pending'};
  if(b.kind==='room')b.attendees=+b.attendees||1;
  else{b.companions=Array.isArray(b.companions)?b.companions:String(b.companions||'').split(',').map(s=>s.trim()).filter(Boolean);b.numPeople=+b.numPeople||(b.companions.length+1);}
  return b;
}
function shortRoom(n){return String(n||'').replace(/^ห้องประชุม\s*/,'');}
function colorOf(e){if(e.kind==='car')return CAR_COLOR;const i=ROOMS.indexOf(e.room);return ROOM_PALETTE[(i<0?0:i)%ROOM_PALETTE.length];}
function titleOf(e){return e.kind==='room'?shortRoom(e.room)||'-':(e.plate||'-')+' · '+(e.driver||'-');}
function keyOf(kind){return kind==='room'?'room':'plate';}
function statusPill(s){const k=STATUS[s]?s:'pending';return `<span class="st st-${k}">${STATUS[k]}</span>`;}
function byTime(a,b){return (a.date||'').localeCompare(b.date||'')||(a.timeStart||'').localeCompare(b.timeStart||'');}
function emptyHtml(icon,title,sub){return `<div class="empty"><div class="e-ico"><i data-lucide="${icon}"></i></div><b>${title}</b>${sub?`<small>${sub}</small>`:''}</div>`;}
function icons(){if(window.lucide)lucide.createIcons();}
