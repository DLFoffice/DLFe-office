/* ═══════════════════════════════════════════
   DLFOffice · preview.js
   หน้าต่างรายละเอียดการจอง
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   PREVIEW
═══════════════════════════════════════════ */
function openPreview(kind,id){
  const e=findB(kind,id);if(!e)return;
  state.pv={kind,id};
  const c=colorOf(e),dh=fmtDayHead(e.date);
  const rows=kind==='room'
    ?[['building-2','ห้องประชุม',e.room],['user','ผู้จอง',e.requester],['briefcase','กลุ่มงาน',e.dept],['users','ผู้เข้าร่วม',(e.attendees||1)+' คน'],['file-text','วัตถุประสงค์',e.purpose]].concat(e.note?[['message-square','หมายเหตุ',e.note]]:[])
    :[['car','ทะเบียนรถ',e.plate],['user-check','พนักงานขับรถ',e.driver],['user','ผู้ขอใช้รถ',e.requester],['briefcase','กลุ่มงาน',e.dept],['map-pin','สถานที่',e.destination],['file-text','วัตถุประสงค์',e.purpose],
      ['users','ผู้เดินทาง',(e.numPeople||1)+' คน'+((e.companions||[]).length?' — '+e.companions.join(', '):'')]];
  $('#pv').innerHTML=`
    <div class="pv-head" style="--c:${c.m};--cs:${c.s};--cd:${c.d}">
      <div class="pv-kind"><i data-lucide="${kind==='room'?'building-2':'car'}"></i>${kind==='room'?'ห้องประชุม':'รถยนต์'}</div>
      <h2>${esc(kind==='room'?e.room:e.plate+' — '+(e.driver||''))}</h2>
      <div class="pv-when"><span><i data-lucide="calendar"></i>${dh.main}${dh.tag?' ('+dh.tag+')':''}</span><span><i data-lucide="clock"></i>${fmtRange(e.timeStart,e.timeEnd)}</span></div>
      <button class="icon-btn pv-x" data-act="pv-close" aria-label="ปิด"><i data-lucide="x"></i></button>
    </div>
    <div class="pv-body">
      <div class="pv-status"><span>สถานะการอนุมัติ</span>${statusPill(e.status)}</div>
      <dl class="pv-dl">${rows.map(r=>`<dt><i data-lucide="${r[0]}"></i>${r[1]}</dt><dd>${esc(r[2]||'–')}</dd>`).join('')}</dl>
      <div class="pv-id">เลขที่เอกสาร <code>${esc(e.docNo||'รอออกเลข')}</code> · รหัสการจอง <code>${esc(e.id)}</code></div>
    </div>
    <div class="pv-foot">
      ${isAdmin&&e.status!=='approved'||isAdmin&&e.status!=='rejected'?`<div class="pv-approve">
        ${e.status!=='approved'?'<button class="btn btn-ok" data-act="approve"><i data-lucide="check-circle"></i>อนุมัติ</button>':''}
        ${e.status!=='rejected'?'<button class="btn btn-bad-soft" data-act="reject"><i data-lucide="x-circle"></i>ไม่อนุมัติ</button>':''}</div>`:''}
      <div class="pv-actions">
        ${isAdmin?'<button class="btn btn-danger btn-sm" data-act="delete"><i data-lucide="trash-2"></i>ลบ</button>':''}
        <span class="spacer"></span>
        <button class="btn btn-ghost btn-sm" data-act="print"><i data-lucide="printer"></i>พิมพ์ใบจอง</button>
        ${isAdmin?'<button class="btn btn-primary btn-sm" data-act="edit" style="background:'+c.m+'"><i data-lucide="pencil"></i>แก้ไข</button>':''}
      </div>
    </div>`;
  icons();
  $('#pv-ov').classList.add('show');$('#pv-ov').setAttribute('aria-hidden','false');
}
function closePreview(){$('#pv-ov').classList.remove('show');$('#pv-ov').setAttribute('aria-hidden','true');state.pv=null;}
