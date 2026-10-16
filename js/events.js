/* ═══════════════════════════════════════════
   DLFOffice · events.js
   ผูกเหตุการณ์คลิก/คีย์บอร์ดทั้งระบบ
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   EVENTS
═══════════════════════════════════════════ */
document.addEventListener('click',async ev=>{
  const a=ev.target.closest('[data-act]');
  if(a){
    const act=a.dataset.act,kind=a.dataset.kind||(state.pv&&state.pv.kind),id=a.dataset.id||(state.pv&&state.pv.id);
    switch(act){
      case 'approve': if(isAdmin)await changeStatus(kind,id,'approved');break;
      case 'reject':
        if(!isAdmin)break;
        if(await showPopup({type:'warning',title:'ไม่อนุมัติรายการนี้?',msg:'ระบบจะแจ้งผลไปยังกลุ่ม LINE',okLabel:'ไม่อนุมัติ',cancelLabel:'ยกเลิก'}))await changeStatus(kind,id,'rejected');
        break;
      case 'delete':
        if(!isAdmin)break;
        if(await showPopup({type:'warning',title:'ยืนยันการลบ',msg:'ต้องการลบรายการนี้ใช่ไหม?\nไม่สามารถกู้คืนได้ และระบบจะแจ้งยกเลิกทาง LINE',okLabel:'ลบรายการ',cancelLabel:'ยกเลิก'}))await removeBooking(kind,id);
        break;
      case 'edit': openEdit(kind,id);break;
      case 'print': {const e=findB(kind,id);if(e)printBookingDoc(kind,e);break;}
      case 'pv-close': closePreview();break;
      case 'logout':
        if(await showPopup({type:'info',title:'ออกจากระบบ?',msg:'ต้องการออกจากระบบใช่ไหม',okLabel:'ออกจากระบบ',cancelLabel:'ยกเลิก'}))doLogout();
        break;
      case 'kpi-pending':
        state.lf={...state.lf,status:'pending',period:'upcoming'};$('#lf-status').value='pending';$('#lf-period').value='upcoming';go('list');renderList();icons();break;
      case 'book-on':
        if(state.editing)exitEdit();
        setFormDate(a.dataset.date||todayStr(),true);go('book');onFormChange();break;
      case 'line-test': {
        a.disabled=true;const j=await gasPost({action:'test'});a.disabled=false;
        if(j.ok&&!j.opaque)showPopup({type:'success',title:'ส่งข้อความทดสอบแล้ว',msg:'ตรวจสอบข้อความในกลุ่ม LINE ('+(j.sent||1)+' กลุ่ม)'});
        else if(j.opaque)showPopup({type:'info',title:'ส่งคำขอแล้ว',msg:'แต่ไม่สามารถอ่านผลจากเซิร์ฟเวอร์ได้ กรุณาตรวจสอบในกลุ่ม LINE'});
        else showPopup({type:'error',title:'ส่งไม่สำเร็จ',msg:j.message||j.error||'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'});
        break;}
      case 'sync-all': {
        if(!await showPopup({type:'warning',title:'ซิงค์ทั้งหมดไป Google Sheet?',msg:'ข้อมูลในชีตจะถูกเขียนทับด้วยข้อมูลที่แสดงในหน้านี้ทั้งหมด\n(ปกติไม่จำเป็น เพราะระบบบันทึกทีละรายการอัตโนมัติ)',okLabel:'ซิงค์เลย',cancelLabel:'ยกเลิก'}))break;
        const j=await gasPost({action:'sync',rooms:ROOM_BOOKINGS,cars:CAR_BOOKINGS});
        if(j.ok)showPopup({type:'success',title:'ซิงค์สำเร็จ',msg:'ห้องประชุม '+(j.rooms??ROOM_BOOKINGS.length)+' รายการ\nรถยนต์ '+(j.cars??CAR_BOOKINGS.length)+' รายการ'});
        else await failAndReload(j);
        break;}
    }
    return;
  }
  const bk=ev.target.closest('.bk[data-id]');
  if(bk){openPreview(bk.dataset.kind,bk.dataset.id);return;}
  const g=ev.target.closest('[data-go]');
  if(g){
    if(g.dataset.kind&&!state.editing)setBookKind(g.dataset.kind);
    go(g.dataset.go);
    if(g.dataset.go==='book')onFormChange();
    return;
  }
  const jp=ev.target.closest('[data-jump]');
  if(jp){calJump(jp.dataset.jump);return;}
  const cc=ev.target.closest('.cc[data-date]');
  if(cc){calJump(cc.dataset.date);if(window.innerWidth<=1280)$('.agenda').scrollIntoView({behavior:'smooth',block:'start'});}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if($('#pop-ov').classList.contains('show'))return closePopup(false);
    if($('#pv-ov').classList.contains('show'))return closePreview();
    closeDrawer();
  }
  if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('bk'))openPreview(e.target.dataset.kind,e.target.dataset.id);
});
$('#pop-ok').addEventListener('click',()=>closePopup(true));
$('#pop-cancel').addEventListener('click',()=>closePopup(false));
$('#pop-ov').addEventListener('click',e=>{if(e.target.id==='pop-ov')closePopup(false);});
$('#pv-ov').addEventListener('click',e=>{if(e.target.id==='pv-ov')closePreview();});
$('#ls-btn').addEventListener('click',doLogin);
$('#ls-user').addEventListener('input',updateIdCounter);
$('#ls-user').addEventListener('keydown',e=>{if(e.key==='Enter')$('#ls-pass').focus();});
$('#ls-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
$('#ls-eye').addEventListener('click',()=>{const p=$('#ls-pass'),show=p.type==='password';p.type=show?'text':'password';$('#ls-eye').innerHTML=`<i data-lucide="${show?'eye-off':'eye'}"></i>`;$('#ls-eye').setAttribute('aria-label',show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน');icons();});
$('#lf-mine').addEventListener('click',()=>{state.lf.mine=!state.lf.mine;$('#lf-mine').classList.toggle('on',state.lf.mine);renderList();icons();});
$('#ls-org').textContent=FORM_ORG;
$('#menu-btn').addEventListener('click',openDrawer);
$('#scrim').addEventListener('click',closeDrawer);
$('#refresh-btn').addEventListener('click',async()=>{
  const b=$('#refresh-btn');b.classList.add('spin');
  if(state.view==='docs'){await loadDocs(docs.year);b.classList.remove('spin');toast('โหลดทะเบียนหนังสือล่าสุดแล้ว');return;}
  const ok=await loadData();b.classList.remove('spin');renderAll();
  toast(ok?'โหลดข้อมูลล่าสุดแล้ว — ห้อง '+ROOM_BOOKINGS.length+' / รถ '+CAR_BOOKINGS.length+' รายการ':'เชื่อมต่อไม่ได้ ใช้ข้อมูลในเครื่อง');
});
$('#cal-prev').addEventListener('click',()=>{state.calMonth=new Date(state.calMonth.getFullYear(),state.calMonth.getMonth()-1,1);renderCalendar();});
$('#cal-next').addEventListener('click',()=>{state.calMonth=new Date(state.calMonth.getFullYear(),state.calMonth.getMonth()+1,1);renderCalendar();});
$('#cal-today').addEventListener('click',()=>{const n=new Date();state.calMonth=new Date(n.getFullYear(),n.getMonth(),1);state.calSel=todayStr();renderCalendar();});
$('#cal-filter').addEventListener('click',e=>{const b=e.target.closest('[data-f]');if(!b)return;state.calFilter=b.dataset.f;$$('#cal-filter button').forEach(x=>x.classList.toggle('on',x===b));renderCalendar();});
$('#lf-kind').addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;state.lf.kind=b.dataset.k;$$('#lf-kind button').forEach(x=>x.classList.toggle('on',x===b));renderList();icons();});
$('#lf-status').addEventListener('change',e=>{state.lf.status=e.target.value;renderList();icons();});
$('#lf-period').addEventListener('change',e=>{state.lf.period=e.target.value;renderList();icons();});
let _qT;$('#q').addEventListener('input',e=>{clearTimeout(_qT);_qT=setTimeout(()=>{state.lf.q=e.target.value;renderList();icons();},180);});
$('#export-pdf').addEventListener('click',()=>{
  $('#print-date').textContent='พิมพ์เมื่อ '+new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
  window.print();
});
