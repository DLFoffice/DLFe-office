/* ═══════════════════════════════════════════
   Smart-Office DLF · dialogs.js
   popup ยืนยัน และ toast
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   POPUP / TOAST
═══════════════════════════════════════════ */
const POP_ICON={success:'check-circle',error:'x-circle',warning:'alert-triangle',info:'info'};
let _popResolve=null;
function showPopup({type='info',title='',msg='',okLabel='ตกลง',cancelLabel=null}){
  return new Promise(res=>{
    _popResolve=res;
    $('#pop-ico').className='pop-ico '+type;$('#pop-ico').innerHTML=`<i data-lucide="${POP_ICON[type]||'info'}"></i>`;
    $('#pop-title').textContent=title;$('#pop-msg').textContent=msg;
    const ok=$('#pop-ok');ok.textContent=okLabel;ok.className='btn btn-primary t-'+type;
    const cc=$('#pop-cancel');cc.textContent=cancelLabel||'';cc.classList.toggle('hidden',!cancelLabel);
    $('#pop-ov').classList.add('show');icons();setTimeout(()=>ok.focus(),50);
  });
}
function closePopup(r){$('#pop-ov').classList.remove('show');if(_popResolve){const f=_popResolve;_popResolve=null;f(r);}}
let _toastT;
function toast(msg){$('#toast-txt').textContent=msg;$('#toast').classList.add('show');clearTimeout(_toastT);_toastT=setTimeout(()=>$('#toast').classList.remove('show'),2800);}
