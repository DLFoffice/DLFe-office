/* ═══════════════════════════════════════════
   Smart-Office DLF · booking.js
   ฟอร์มจองห้อง/รถ, ตารางว่าง, พนักงานขับรถ
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   BOOKING FORM
═══════════════════════════════════════════ */
const TIME_OPTS=(()=>{const a=[];for(let m=360;m<=1320;m+=30)a.push(hm(m));return a;})();
function resourcesOf(kind){
  return kind==='room'
    ?ROOMS.map((r,i)=>({key:r,label:shortRoom(r),sub:'',c:ROOM_PALETTE[i%5]}))
    :VEHICLES.map(v=>({key:v.plate,label:v.plate,sub:v.type||'รถตู้',c:CAR_COLOR,van:true}));
}
const isEditingItem=b=>state.editing&&b.id===state.editing.id;
function ensureOpt(sel,val){if(!val)return;const el=$(sel);if(![...el.options].some(o=>o.value===val))el.insertAdjacentHTML('beforeend',`<option value="${esc(val)}">${esc(val)}</option>`);el.value=val;}

function initForm(){
  const deptOpts=DEPTS.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');
  $('#f-dept').innerHTML=deptOpts;
  const tOpts=TIME_OPTS.map(t=>`<option value="${t}">${t} น.</option>`).join('');
  $('#f-start').innerHTML=tOpts;$('#f-end').innerHTML=tOpts;
  $('#f-start').value='09:00';$('#f-end').value='12:00';
  renderDriverOptions();
  initDatePicker();
  setFormDate(todayStr(),true);
  $('#f-driver').addEventListener('change',()=>{$('#f-driver').closest('.field').classList.remove('invalid');renderAvailability();});
  try{const p=JSON.parse(localStorage.getItem('dlf_person')||'null');if(p){$('#f-requester').value=p.requester||'';if(p.dept)ensureOpt('#f-dept',p.dept);}}catch(e){}

  ['#f-date','#f-end'].forEach(s=>$(s).addEventListener('change',onFormChange));
  $('#f-start').addEventListener('change',()=>{
    const s=toMin($('#f-start').value),e=toMin($('#f-end').value);
    if(e<=s)ensureOpt('#f-end',hm(Math.min(s+60,23*60+30)));
    onFormChange();
  });
  $('#time-chips').addEventListener('click',e=>{
    const c=e.target.closest('[data-range]');if(!c)return;
    const[a,b]=c.dataset.range.split('-');ensureOpt('#f-start',a);ensureOpt('#f-end',b);onFormChange();
  });
  $('#res-tiles').addEventListener('click',e=>{const t=e.target.closest('[data-res]');if(t)pickRes(t.dataset.res);});
  $('#avail-chart').addEventListener('click',e=>{const t=e.target.closest('[data-res]');if(t)pickRes(t.dataset.res);});
  $('#kind-seg').addEventListener('click',e=>{const b=e.target.closest('[data-kind]');if(b)setBookKind(b.dataset.kind);});
  $('#f-comp-add').addEventListener('click',()=>{addComp('');const ins=$$('#f-comp input');ins[ins.length-1].focus();});
  $('#f-reset').addEventListener('click',()=>{if(state.editing)exitEdit();else resetForm(false);});
  $('#edit-cancel').addEventListener('click',exitEdit);
  $('#book-form').addEventListener('submit',onSubmit);
  ['#f-requester','#f-purpose'].forEach(s=>$(s).addEventListener('input',()=>$(s).closest('.field').classList.remove('invalid')));
  applyDateMin();
}
function applyDateMin(){$('#f-date').dataset.min=(isAdmin||state.editing)?'':todayStr();}
function onFormChange(){renderResTiles();renderDriverOptions();renderAvailability();}
function pickRes(key){
  state.sel[state.bookKind]=key;
  renderResTiles();renderAvailability();
  if(state.bookKind==='car'&&!$('#f-driver').value)setTimeout(()=>$('#f-driver').focus(),60);
}

/* ─── พนักงานขับรถ: แสดงว่าใครว่าง/ติดภารกิจในช่วงเวลาที่เลือก ─── */
function driverBusy(driver,date,s,e,exceptId){
  const s1=toMin(s,0),e1=toMin(e,1440);
  return CAR_BOOKINGS.find(o=>o.id!==exceptId&&o.status!=='rejected'&&o.date===date&&o.driver===driver&&s1<toMin(o.timeEnd,1440)&&toMin(o.timeStart,0)<e1);
}
function renderDriverOptions(){
  const sel=$('#f-driver');if(!sel)return;
  const cur=sel.value,date=$('#f-date').value,s=$('#f-start').value,e=$('#f-end').value,ex=state.editing?state.editing.id:'';
  const list=[...DRIVERS];if(cur&&!list.includes(cur))list.push(cur);
  let free=0;
  sel.innerHTML='<option value="">— เลือกพนักงานขับรถ —</option>'+list.map(d=>{
    const b=validYmd(date)&&driverBusy(d,date,s,e,ex);if(!b)free++;
    return `<option value="${esc(d)}"${b?' disabled':''}>${esc(d)}${b?` — ติดภารกิจ ${b.timeStart||''}–${b.timeEnd||''} น.`:' — ว่าง'}</option>`;
  }).join('');
  const busyCur=cur&&validYmd(date)&&driverBusy(cur,date,s,e,ex);
  sel.value=busyCur?'':cur;
  $('#drv-hint').textContent=validYmd(date)?`ว่าง ${free} จาก ${list.length} คน ในช่วง ${fmtRange(s,e)}${busyCur?' · ผู้ขับที่เลือกไว้ไม่ว่างแล้ว กรุณาเลือกใหม่':''}`:'เลือกวันและเวลาก่อน ระบบจะแสดงว่าผู้ขับคนใดว่าง';
}

/* ─── ตรวจ / บันทึก / แก้ไขฟอร์ม ─── */
function setBookKind(kind){
  if(state.editing&&state.editing.kind!==kind)return;
  state.bookKind=kind;
  $$('#kind-seg [data-kind]').forEach(b=>b.classList.toggle('on',b.dataset.kind===kind));
  $('#book-form').dataset.kind=kind;
  document.body.classList.toggle('k-car',state.view==='book'&&kind==='car');
  $('#res-h').textContent=kind==='room'?'เลือกห้องประชุม':'เลือกรถยนต์';
  $('#purpose-label').innerHTML=(kind==='room'?'วัตถุประสงค์ / ประชุมเรื่อง':'ขออนุญาตใช้รถเพื่อ')+'<span class="req">*</span>';
  updateSubmitLabel();renderResTiles();renderAvailability();icons();
}
function updateSubmitLabel(){
  $('#f-submit-txt').textContent=state.editing?'บันทึกการแก้ไข':(state.bookKind==='room'?'ส่งคำขอจองห้องประชุม':'ส่งคำขอใช้รถยนต์');
}
function renderResTiles(){
  const kind=state.bookKind,date=$('#f-date').value,key=keyOf(kind);
  const day=listOf(kind).filter(b=>b.date===date&&b.status!=='rejected'&&!isEditingItem(b));
  $('#res-tiles').innerHTML=resourcesOf(kind).map(r=>{
    const n=day.filter(b=>b[key]===r.key).length,on=state.sel[kind]===r.key;
    return `<button type="button" class="tile${on?' on':''}" data-res="${esc(r.key)}" style="--c:${r.c.m};--cs:${r.c.s}">
      ${r.van?'<span class="tile-ico"><i data-lucide="bus"></i></span>':'<span class="tile-dot"></span>'}<span class="tile-txt"><b${r.van?' class="tile-plate"':''}>${esc(r.label)}</b>${r.sub?`<small>${esc(r.sub)}</small>`:''}</span>
      <span class="tile-cnt${n?' busy':''}">${n?'จองแล้ว '+n:'ว่าง'}</span><i class="tile-check" data-lucide="check"></i></button>`;
  }).join('');
  icons();
}
function renderAvailability(){
  const kind=state.bookKind,date=$('#f-date').value,key=keyOf(kind);
  const S=420,E=1200,P=m=>Math.max(0,Math.min(100,(m-S)/(E-S)*100));
  $('#avail-date').textContent=validYmd(date)?'วัน'+DOW[parseYmd(date).getDay()]+'ที่ '+fmtThaiDate(date):'เลือกวันที่';
  const day=listOf(kind).filter(b=>b.date===date&&b.status!=='rejected'&&!isEditingItem(b)).sort(byTime);
  const rs=toMin($('#f-start').value,S),re=toMin($('#f-end').value,E);
  let h='<div class="av-scale"><span></span><div class="av-ticks">';
  for(let hr=8;hr<=20;hr+=2)h+=`<span style="left:${P(hr*60)}%">${pad(hr)}</span>`;
  h+='</div></div>';
  resourcesOf(kind).forEach(r=>{
    const on=state.sel[kind]===r.key;
    const blocks=day.filter(b=>b[key]===r.key).map(b=>{
      const l=P(toMin(b.timeStart,0)),w=Math.max(P(toMin(b.timeEnd,1440))-l,1.5);
      return `<span class="av-blk${b.status==='pending'?' pend':''}" style="left:${l}%;width:${w}%" title="${esc(fmtRange(b.timeStart,b.timeEnd)+' · '+(b.requester||''))}"></span>`;
    }).join('');
    const req=on&&re>rs?`<span class="av-req" style="left:${P(rs)}%;width:${Math.max(P(re)-P(rs),1)}%"></span>`:'';
    h+=`<button type="button" class="av-row${on?' on':''}" data-res="${esc(r.key)}" style="--c:${r.c.m};--cs:${r.c.s}"><span class="av-lbl">${esc(r.label)}</span><span class="av-track">${blocks}${req}</span></button>`;
  });
  $('#avail-chart').innerHTML=h;
  $('#avail-list-h').textContent=(kind==='room'?'การจองห้องประชุม':'การใช้รถ')+'ในวันที่เลือก ('+day.length+')';
  $('#avail-list').innerHTML=day.length?day.map(b=>itemHtml(b)).join(''):emptyHtml('sparkles','ว่างทั้งวัน','ยังไม่มีการจองในวันนี้');
  // conflict hint
  const el=$('#f-conflict');
  if(!validYmd(date)){el.classList.add('hidden');icons();return;}
  const pc=preCheck(kind,{id:state.editing?state.editing.id:'',[key]:state.sel[kind],driver:kind==='car'?$('#f-driver').value:'',date,timeStart:$('#f-start').value,timeEnd:$('#f-end').value});
  el.classList.remove('hidden');el.className='conflict '+(pc?'bad':'ok');
  const hn=holidayName(date),we=isWeekendYmd(date);
  const dayNote=hn?`วันที่เลือกเป็นวันหยุดราชการ (${esc(hn)})`:we?'วันที่เลือกเป็นวันเสาร์-อาทิตย์':'';
  if(!pc&&dayNote)el.className='conflict warn';
  el.innerHTML=pc?`<i data-lucide="alert-triangle"></i><span><b>${pc.title}</b> — ${esc(pc.msg)}${dayNote?`<span class="sub-note">${dayNote}</span>`:''}</span>`
    :dayNote?`<i data-lucide="flag"></i><span><b>ช่วงเวลานี้ว่าง</b> — ${dayNote} กรุณาตรวจสอบความพร้อมของผู้ดูแลก่อนจอง</span>`
    :`<i data-lucide="check-circle"></i><span>ช่วงเวลานี้ว่าง สามารถจองได้</span>`;
  icons();
}

/* companions */
function addComp(v){
  const row=document.createElement('div');row.className='comp-row';
  row.innerHTML=`<input class="inp" placeholder="ชื่อ-นามสกุล" value="${esc(v||'')}"><button type="button" class="icon-btn" aria-label="ลบ"><i data-lucide="x"></i></button>`;
  row.querySelector('button').addEventListener('click',()=>row.remove());
  $('#f-comp').appendChild(row);icons();
}
function resetComp(vals){$('#f-comp').innerHTML='';(vals||[]).forEach(addComp);}
const getComp=()=>$$('#f-comp input').map(i=>i.value.trim()).filter(Boolean);

function validateForm(){
  let first=null;
  const chk=(sel,ok)=>{const f=$(sel).closest('.field');f.classList.toggle('invalid',!ok);if(!ok&&!first)first=$(sel);};
  chk('#f-date',validYmd(normDate($('#f-date').value)));
  chk('#f-requester',!!$('#f-requester').value.trim());
  chk('#f-purpose',!!$('#f-purpose').value.trim());
  if(state.bookKind==='car')chk('#f-driver',!!$('#f-driver').value);
  if(first&&first.id==='f-date')first=$('#f-date-btn');
  const err=$('#f-error');
  if(first){err.textContent='กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน';err.classList.remove('hidden');first.focus();first.scrollIntoView({behavior:'smooth',block:'center'});return false;}
  if(!state.sel[state.bookKind]){err.textContent=state.bookKind==='room'?'กรุณาเลือกห้องประชุม':'กรุณาเลือกรถ';err.classList.remove('hidden');return false;}
  err.classList.add('hidden');return true;
}
function buildItem(kind,id){
  const base={id,kind,date:normDate($('#f-date').value),timeStart:$('#f-start').value,timeEnd:$('#f-end').value,
    requester:$('#f-requester').value.trim(),dept:$('#f-dept').value,purpose:$('#f-purpose').value.trim()};
  if(kind==='room')return {...base,room:state.sel.room,attendees:parseInt($('#f-attendees').value,10)||1,note:$('#f-note').value.trim()};
  const comp=getComp();
  return {...base,plate:state.sel.car,driver:$('#f-driver').value,destination:$('#f-destination').value.trim(),companions:comp,numPeople:comp.length+1};
}
async function onSubmit(ev){
  ev.preventDefault();
  if(busy||!validateForm())return;
  const kind=state.bookKind,isEdit=!!state.editing;
  const item=buildItem(kind,isEdit?state.editing.id:uid());
  item.status=isEdit?(findB(kind,item.id)||{}).status||'pending':'pending';
  const pc=preCheck(kind,item);
  if(pc){await showPopup({type:'warning',title:pc.title,msg:pc.msg});return;}
  busy=true;const btn=$('#f-submit');btn.disabled=true;$('#f-submit-txt').textContent='กำลังบันทึก…';
  const j=await saveBooking(kind,item);
  busy=false;btn.disabled=false;updateSubmitLabel();
  if(!j)return;
  try{localStorage.setItem('dlf_person',JSON.stringify({requester:item.requester,dept:item.dept}));}catch(e){}
  const title=(kind==='room'?item.room:item.plate+' ('+item.driver+')')+(j.docNo?'\nเลขที่เอกสาร '+j.docNo:'');
  if(j.docNo){const it=findB(kind,item.id);if(it)it.docNo=j.docNo;}
  if(isEdit){
    exitEdit();renderAll();
    await showPopup({type:'success',title:'บันทึกการแก้ไขแล้ว',msg:title+'\n'+fmtThaiDate(item.date)+' · '+fmtRange(item.timeStart,item.timeEnd)});
  }else{
    resetForm(true);renderAll();
    await showPopup({type:'success',title:'ส่งคำขอจองเรียบร้อย',msg:title+'\n'+fmtThaiDate(item.date)+' · '+fmtRange(item.timeStart,item.timeEnd)+'\n\nสถานะ: รอการอนุมัติ\nระบบแจ้งเตือนผู้ดูแลทาง LINE แล้ว'});
  }
  silentRefresh();
}
function resetForm(keepPerson){
  $('#f-purpose').value='';$('#f-note').value='';$('#f-destination').value='';$('#f-attendees').value=1;resetComp([]);
  $('#f-driver').value='';
  if(!keepPerson){if(!state.user||isAdmin)$('#f-requester').value='';setFormDate(todayStr(),true);ensureOpt('#f-start','09:00');ensureOpt('#f-end','12:00');}
  $$('#book-form .field.invalid').forEach(f=>f.classList.remove('invalid'));$('#f-error').classList.add('hidden');
  onFormChange();
}
function openEdit(kind,id){
  const e=findB(kind,id);if(!e||!isAdmin)return;
  closePreview();
  state.editing=null;setBookKind(kind);state.editing={kind,id};
  setFormDate(e.date||todayStr(),true);
  ensureOpt('#f-start',e.timeStart||'09:00');ensureOpt('#f-end',e.timeEnd||'12:00');
  $('#f-requester').value=e.requester||'';if(e.dept)ensureOpt('#f-dept',e.dept);
  $('#f-purpose').value=e.purpose||'';
  if(kind==='room'){state.sel.room=e.room;$('#f-attendees').value=e.attendees||1;$('#f-note').value=e.note||'';}
  else{state.sel.car=e.plate;if(e.driver)ensureOpt('#f-driver',e.driver);renderDriverOptions();$('#f-destination').value=e.destination||'';resetComp(e.companions||[]);}
  $('#edit-ref').textContent=(e.docNo?'เลขที่ '+e.docNo+' · ':'')+titleOf(e)+' · '+fmtThaiDate(e.date)+' · โดย '+(e.requester||'-');
  $('#edit-banner').classList.remove('hidden');
  const del=$('#f-delete');del.classList.remove('hidden');del.dataset.kind=kind;del.dataset.id=id;
  $$('#kind-seg [data-kind]').forEach(b=>b.disabled=b.dataset.kind!==kind);
  applyDateMin();updateSubmitLabel();go('book');
}
function exitEdit(){
  state.editing=null;
  $('#edit-banner').classList.add('hidden');$('#f-delete').classList.add('hidden');
  $$('#kind-seg [data-kind]').forEach(b=>b.disabled=false);
  applyDateMin();updateSubmitLabel();resetForm(true);
}
