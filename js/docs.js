/* ═══════════════════════════════════════════
   DLFOffice · docs.js
   ระบบออกเลขหนังสือ (ภายใน / ภายนอก / ประกาศ / คำสั่ง) + แนบไฟล์ลง Google Drive
   - ออกเลขที่เซิร์ฟเวอร์ (Documents.gs) ภายใต้ล็อก → ไม่มีเลขซ้ำ
   - ไฟล์ถูกเปลี่ยนชื่อเป็นเลขที่หนังสือ และเก็บในโฟลเดอร์ตามประเภท/ปี
═══════════════════════════════════════════ */
const DOC_TYPES_UI = {
  internal:{name:'หนังสือภายใน', short:'ภายใน', icon:'file-text', c:'#4F46E5', s:'#EEF0FF', d:'#3730A3'},
  external:{name:'หนังสือภายนอก', short:'ภายนอก', icon:'send', c:'#0D9488', s:'#DDF5F3', d:'#0F766E'},
  announce:{name:'ประกาศ', short:'ประกาศ', icon:'megaphone', c:'#D97706', s:'#FEF3E2', d:'#B45309'},
  order:{name:'คำสั่ง', short:'คำสั่ง', icon:'scroll', c:'#DB2777', s:'#FCE7F3', d:'#BE185D'}
};
const DOC_MAX_MB = 20;
const docs = {loaded:false, loading:false, year:0, data:null, type:'internal', q:'', dept:'all', status:'all', mine:false,
  form:{mode:'new', type:'internal', id:null, files:[], busy:false}, pv:null};

/* ── โหลดข้อมูล ── */
async function loadDocs(year){
  if(!AUTH_TOKEN)return false;
  docs.loading=true;renderDocs();
  try{
    const r=await fetch(GAS_URL+'?action=docs&token='+encodeURIComponent(AUTH_TOKEN)+'&year='+(year||'')+'&t='+Date.now(),{cache:'no-store'});
    const j=await r.json();
    if(j.error==='unauthorized'){sessionExpired();return false;}
    if(!j.ok)throw new Error(j.message||j.error||'load failed');
    docs.data=j;docs.year=j.year;docs.loaded=true;docs.tok=AUTH_TOKEN;
    return true;
  }catch(err){
    console.warn('docs load',err);toast('โหลดทะเบียนหนังสือไม่สำเร็จ');return false;
  }finally{docs.loading=false;renderDocs();}
}
function openDocsView(){if((!docs.loaded||docs.tok!==AUTH_TOKEN)&&!docs.loading){docs.data=null;docs.loaded=false;loadDocs();}else renderDocs();}
const docTypeData=t=>(docs.data&&docs.data.types&&docs.data.types[t])||{items:[],lastNo:'',nextNo:'',count:0};
const findDoc=(t,id)=>docTypeData(t).items.find(x=>x.id===id);
/* เทียบชื่อโดยไม่สนคำนำหน้า (นาย/นาง/นางสาว/ว่าที่ร้อยตรี/ดร.) และช่องว่าง — ชื่อจากระบบ HR มีคำนำหน้า แต่ทะเบียนเดิมไม่มี */
const normPerson=v=>String(v||'').replace(/\s*\(ผู้ดูแล\)\s*$/,'').replace(/^(ว่าที่\s*ร้อย\s*(ตรี|โท|เอก)\s*(หญิง)?|นางสาว|นาง|นาย|น\.ส\.|ดร\.|ผศ\.|รศ\.|ศ\.)\s*/,'').replace(/\s+/g,'').trim();
const isMineDoc=x=>{const me=normPerson(myName());return !!me&&(normPerson(x.requester)===me||normPerson(x.recorder)===me);};
const canEditDoc=x=>isAdmin||isMineDoc(x);
/* แนบไฟล์: ค่าเริ่มต้นทุกคนที่เข้าสู่ระบบแนบได้ (ตั้ง DOC_UPLOAD_POLICY=owner เพื่อจำกัดเฉพาะผู้ขอ/ผู้บันทึก) */
const canAttachDoc=x=>isAdmin||(docs.data&&docs.data.uploadPolicy!=='owner')||isMineDoc(x);
const docLabel=(t,no)=>(t==='announce'||t==='order'?DOC_TYPES_UI[t].name+' ที่ ':'ที่ ')+no;

/* ── แสดงผล ── */
function renderDocs(){
  if(!$('#dtypes'))return;
  const d=docs.data;
  // การ์ดประเภท
  $('#dtypes').innerHTML=Object.keys(DOC_TYPES_UI).map(t=>{
    const U=DOC_TYPES_UI[t],T=docTypeData(t),on=docs.type===t;
    return `<button type="button" class="dtype${on?' on':''}" data-dtype="${t}" style="--c:${U.c};--cs:${U.s};--cd:${U.d}">
      <span class="dtype-ico"><i data-lucide="${U.icon}"></i></span>
      <span class="dtype-txt"><small>${U.name}</small><b>${esc(T.nextNo||'—')}</b><em>เลขถัดไป</em></span>
      <span class="dtype-meta"><span>ปี ${docs.year||'—'}: <b>${T.count||0}</b> ฉบับ</span>${T.lastNo?`<span>ล่าสุด ${esc(T.lastNo)}</span>`:''}</span>
    </button>`;}).join('');
  // ตัวกรอง
  const ys=(d&&d.years)||[];
  $('#dyear').innerHTML=(ys.length?ys:[new Date().getFullYear()+543]).map(y=>`<option value="${y}"${y===docs.year?' selected':''}>ปี พ.ศ. ${y}</option>`).join('');
  const depts=[...new Set([...DEPTS,...docTypeData(docs.type).items.map(x=>x.dept).filter(Boolean)])];
  $('#ddept').innerHTML='<option value="all">ทุกกลุ่มงาน</option>'+depts.map(x=>`<option${x===docs.dept?' selected':''}>${esc(x)}</option>`).join('');
  $('#dmine').classList.toggle('on',docs.mine);
  $('#dfolder').classList.toggle('hidden',!(d&&d.folderUrl));if(d&&d.folderUrl)$('#dfolder').href=d.folderUrl;
  $('#dsheet').classList.toggle('hidden',!(d&&d.sheetUrl));if(d&&d.sheetUrl)$('#dsheet').href=d.sheetUrl;
  const U=DOC_TYPES_UI[docs.type];
  $('#dnew').innerHTML=`<i data-lucide="plus"></i>ออกเลข${U.name}`;
  // รายการ
  if(docs.loading&&!docs.loaded){$('#dmeta').textContent='';$('#dlist').innerHTML=`<div class="empty"><div class="e-ico"><span class="spin-i dark"></span></div><b>กำลังโหลดทะเบียนหนังสือ…</b></div>`;icons();return;}
  const qq=docs.q.trim().toLowerCase();
  let arr=docTypeData(docs.type).items.slice();
  if(docs.dept!=='all')arr=arr.filter(x=>x.dept===docs.dept);
  if(docs.status==='active')arr=arr.filter(x=>x.status!=='cancelled');
  if(docs.status==='cancelled')arr=arr.filter(x=>x.status==='cancelled');
  if(docs.status==='nofile')arr=arr.filter(x=>x.status!=='cancelled'&&!(x.files||[]).length);
  if(docs.mine)arr=arr.filter(isMineDoc);
  if(qq)arr=arr.filter(x=>[x.docNo,x.subject,x.to,x.requester,x.dept,x.recorder,x.note].join(' ').toLowerCase().includes(qq));
  arr.sort((a,b)=>b.seq-a.seq||String(b.createdAt).localeCompare(String(a.createdAt)));
  const total=docTypeData(docs.type).items.length;
  $('#dmeta').textContent=`${U.name} ปี ${docs.year} · แสดง ${arr.length} จาก ${total} รายการ`;
  $('#dlist').innerHTML=arr.length?arr.slice(0,400).map(x=>docRowHtml(docs.type,x)).join('')+(arr.length>400?`<p class="list-meta" style="text-align:center">แสดง 400 รายการล่าสุด — ใช้ช่องค้นหาเพื่อดูรายการอื่น</p>`:'')
    :emptyHtml('inbox','ไม่พบรายการ',total?'ลองเปลี่ยนคำค้นหาหรือตัวกรอง':'กด "ออกเลข'+U.name+'" เพื่อเริ่มออกเลข');
  icons();
}
function docRowHtml(t,x){
  const U=DOC_TYPES_UI[t],cancelled=x.status==='cancelled',files=x.files||[];
  const meta=[x.to?`<span><i data-lucide="mail"></i>${esc(x.to)}</span>`:'',
    `<span><i data-lucide="user"></i>${esc(x.requester||'-')}${x.dept?' · '+esc(x.dept):''}</span>`,
    x.signDate?`<span><i data-lucide="pen-line"></i>ลงนาม ${fmtThaiShort(x.signDate)}</span>`:''].join('');
  const fl=files.length?files.slice(0,3).map(f=>`<a class="fchip" href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(f.name)}" data-stop="1"><i data-lucide="${fileIcon(f.name)}"></i><span>${esc(f.name)}</span></a>`).join('')+(files.length>3?`<span class="fchip more">+${files.length-3}</span>`:'')
    :(cancelled?'':`<span class="fnone">ยังไม่แนบไฟล์</span>`);
  return `<article class="drow${cancelled?' is-cancel':''}" tabindex="0" data-doc="${t}:${esc(x.id)}" style="--c:${U.c};--cs:${U.s};--cd:${U.d}">
    <div class="dno"><b>${esc(x.docNo)}</b><small>${fmtThaiShort(x.date)}</small></div>
    <div class="dmain"><div class="dsub">${esc(x.subject)}</div><div class="dmeta">${meta}</div></div>
    <div class="dfiles">${fl}</div>
    <div class="dst">${cancelled?'<span class="st st-rejected">ยกเลิก</span>':(files.length?'<span class="st st-approved">มีไฟล์</span>':'<span class="st st-pending">รอไฟล์</span>')}</div>
  </article>`;
}
function fileIcon(n){const e=String(n).split('.').pop().toLowerCase();return ['jpg','jpeg','png','gif','webp'].includes(e)?'image':['xls','xlsx','csv'].includes(e)?'sheet':'file-text';}
const fmtSize=b=>b>1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB';

/* ── รายละเอียด ── */
function openDocDetail(t,id){
  const x=findDoc(t,id);if(!x)return;
  docs.pv={t,id};
  const U=DOC_TYPES_UI[t],cancelled=x.status==='cancelled',edit=canEditDoc(x)&&!cancelled,attach=canAttachDoc(x)&&!cancelled;
  const rows=[['hash','เลขที่หนังสือ',docLabel(t,x.docNo)],['calendar','วันที่ออกเลข',fmtThaiDate(x.date)],['mail','เรียน / ถึง',x.to],
    ['user','เจ้าหน้าที่ผู้ขอ',x.requester],['briefcase','กลุ่มงาน',x.dept],['pen-line','วันที่ลงนาม',x.signDate?fmtThaiDate(x.signDate):'ยังไม่ระบุ'],
    ['user-check','ผู้บันทึก',x.recorder],['message-square','หมายเหตุ',x.note]];
  const files=x.files||[];
  $('#doc-pv').innerHTML=`
    <div class="pv-head" style="--c:${U.c};--cs:${U.s};--cd:${U.d}">
      <div class="pv-kind"><i data-lucide="${U.icon}"></i>${U.name} · ปี ${x.year}</div>
      <div class="dbig"><b>${esc(x.docNo)}</b><button class="icon-btn" data-dact="copy" data-no="${esc(x.docNo)}" title="คัดลอกเลขที่" aria-label="คัดลอกเลขที่"><i data-lucide="copy"></i></button></div>
      <h2 style="padding-right:0;margin-top:6px;font-size:1.05rem">${esc(x.subject)}</h2>
      <button class="icon-btn pv-x" data-dact="close-pv" aria-label="ปิด"><i data-lucide="x"></i></button>
    </div>
    <div class="pv-body">
      <div class="pv-status"><span>สถานะ</span>${cancelled?'<span class="st st-rejected">ยกเลิกเลขแล้ว</span>':'<span class="st st-approved">ใช้งาน</span>'}</div>
      <dl class="pv-dl">${rows.map(r=>`<dt><i data-lucide="${r[0]}"></i>${r[1]}</dt><dd>${esc(r[2]||'–')}</dd>`).join('')}</dl>
      <h4 class="dfh">ไฟล์หนังสือ (${files.length})</h4>
      <div class="dflist">${files.length?files.map(f=>`<div class="dfi"><i data-lucide="${fileIcon(f.name)}"></i><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.name)}</a>
        ${isAdmin?`<button class="icon-btn sm" data-dact="rmfile" data-url="${esc(f.url)}" title="ลบไฟล์" aria-label="ลบไฟล์"><i data-lucide="trash-2"></i></button>`:''}</div>`).join(''):'<p class="fnone">ยังไม่มีไฟล์แนบ</p>'}</div>
      ${attach?`<label class="dropzone sm" id="pv-drop"><input type="file" id="pv-files" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"><i data-lucide="upload-cloud"></i><b>แนบไฟล์เพิ่ม</b><small>ไฟล์จะถูกตั้งชื่อเป็น "${esc(x.docNo)}" อัตโนมัติ</small></label><div class="fq" id="pv-queue"></div>`:(cancelled?'':'<p class="fnone">แนบไฟล์ได้เฉพาะผู้ขอ ผู้บันทึก หรือผู้ดูแลระบบ</p>')}
    </div>
    <div class="pv-foot"><div class="pv-actions">
      ${isAdmin&&!cancelled?'<button class="btn btn-danger btn-sm" data-dact="cancel"><i data-lucide="ban"></i>ยกเลิกเลข</button>':''}
      <span class="spacer"></span>
      ${edit?'<button class="btn btn-ghost btn-sm" data-dact="edit"><i data-lucide="pencil"></i>แก้ไขรายละเอียด</button>':''}
      <button class="btn btn-primary btn-sm" data-dact="close-pv" style="background:${U.c}">ปิด</button>
    </div></div>`;
  icons();
  const inp=$('#pv-files');
  if(inp){
    inp.addEventListener('change',()=>{uploadFiles(t,x.id,[...inp.files],'#pv-queue');inp.value='';});
    bindDrop($('#pv-drop'),fl=>uploadFiles(t,x.id,fl,'#pv-queue'));
  }
  $('#doc-ov').classList.add('show');$('#doc-ov').setAttribute('aria-hidden','false');
}
function closeDocDetail(){$('#doc-ov').classList.remove('show');$('#doc-ov').setAttribute('aria-hidden','true');docs.pv=null;}

/* ── ฟอร์มออกเลข / แก้ไข ── */
function openDocForm(mode,t,id){
  const f=docs.form;f.mode=mode;f.type=t||docs.type;f.id=id||null;f.files=[];f.busy=false;
  const x=mode==='edit'?findDoc(f.type,id):null;
  $('#docf-body').classList.remove('done');
  $('#df-subject').value=x?x.subject:'';$('#df-to').value=x?x.to:'';
  $('#df-req').value=x?x.requester:myName();
  const dept=x?x.dept:(state.user&&state.user.dept&&DEPTS.includes(state.user.dept)?state.user.dept:'');
  $('#df-dept').innerHTML='<option value="">— เลือกกลุ่มงาน —</option>'+[...new Set([...DEPTS,dept].filter(Boolean))].map(d=>`<option${d===dept?' selected':''}>${esc(d)}</option>`).join('');
  $('#df-note').value=x?x.note:'';
  dpSet('doc',x?x.signDate:'',true);
  $('#df-files-field').classList.toggle('hidden',mode==='edit');
  $('#df-error').classList.add('hidden');$$('#docf-form .field.invalid').forEach(e=>e.classList.remove('invalid'));
  renderDocForm();
  $('#docf-ov').classList.add('show');$('#docf-ov').setAttribute('aria-hidden','false');
  setTimeout(()=>$('#df-subject').focus(),120);
}
function renderDocForm(){
  const f=docs.form,U=DOC_TYPES_UI[f.type],x=f.mode==='edit'?findDoc(f.type,f.id):null;
  $('#docf-head').style.cssText=`--c:${U.c};--cs:${U.s};--cd:${U.d}`;
  $('#docf-kicker').textContent=f.mode==='edit'?'แก้ไขรายละเอียด':'ออกเลขหนังสือ';
  $('#docf-title').textContent=f.mode==='edit'?(x?x.docNo:''):`ออกเลข${U.name}`;
  $('#docf-types').innerHTML=f.mode==='edit'?'':Object.keys(DOC_TYPES_UI).map(t=>{const u=DOC_TYPES_UI[t];
    return `<button type="button" class="dtab${t===f.type?' on':''}" data-dtab="${t}" style="--c:${u.c};--cs:${u.s};--cd:${u.d}"><i data-lucide="${u.icon}"></i>${u.short}</button>`;}).join('');
  const nx=docTypeData(f.type).nextNo;
  $('#docf-next').innerHTML=f.mode==='edit'?`<i data-lucide="lock"></i><span>เลขที่หนังสือแก้ไขไม่ได้ · แก้ได้เฉพาะรายละเอียด</span>`
    :`<i data-lucide="hash"></i><span>เลขถัดไปโดยประมาณ <b>${esc(nx||'—')}</b> · เลขจริงออกโดยระบบตอนกดยืนยัน (ไม่ซ้ำแน่นอน)</span>`;
  $('#docf-next').style.cssText=`--c:${U.c};--cs:${U.s};--cd:${U.d}`;
  $('#df-submit-txt').textContent=f.mode==='edit'?'บันทึกการแก้ไข':'ออกเลขหนังสือ';
  $('#df-submit').style.background=U.c;
  renderQueue('#df-queue',f.files);
  icons();
}
function closeDocForm(){
  if(docs.form.busy)return;
  $('#docf-ov').classList.remove('show');$('#docf-ov').setAttribute('aria-hidden','true');closeDP();
}
function addFormFiles(list){
  const f=docs.form;
  [...list].forEach(file=>{
    if(file.size>DOC_MAX_MB*1048576){toast(`${file.name} ใหญ่เกิน ${DOC_MAX_MB} MB`);return;}
    f.files.push({file,name:file.name,size:file.size,state:'wait'});
  });
  renderQueue('#df-queue',f.files);
}
function renderQueue(sel,items){
  const el=$(sel);if(!el)return;
  el.innerHTML=items.map((q,i)=>`<div class="fqi ${q.state}"><i data-lucide="${q.state==='ok'?'check-circle':q.state==='err'?'alert-triangle':fileIcon(q.name)}"></i>
    <div><b>${esc(q.newName||q.name)}</b><small>${q.state==='up'?'กำลังอัปโหลด…':q.state==='ok'?'อัปโหลดแล้ว · เปลี่ยนชื่อจาก '+esc(q.name):q.state==='err'?esc(q.err||'อัปโหลดไม่สำเร็จ'):fmtSize(q.size)}</small></div>
    ${q.state==='up'?'<span class="spin-i dark"></span>':q.state==='wait'&&sel==='#df-queue'&&!docs.form.busy?`<button type="button" class="icon-btn sm" data-dact="rmq" data-i="${i}" aria-label="เอาออก"><i data-lucide="x"></i></button>`:''}</div>`).join('');
  icons();
}
async function submitDocForm(){
  const f=docs.form;if(f.busy)return;
  const subject=$('#df-subject').value.trim();
  if(!subject){$('#df-subject').closest('.field').classList.add('invalid');$('#df-subject').focus();return;}
  const item={subject,to:$('#df-to').value.trim(),requester:$('#df-req').value.trim()||myName(),dept:$('#df-dept').value,signDate:$('#df-sign').value,note:$('#df-note').value.trim()};
  f.busy=true;const btn=$('#df-submit');btn.disabled=true;$('#df-submit-txt').textContent=f.mode==='edit'?'กำลังบันทึก…':'กำลังออกเลข…';
  let j;
  if(f.mode==='edit')j=await gasPost({action:'doc.update',type:f.type,id:f.id,item});
  else{item.id=uid();j=await gasPost({action:'doc.issue',type:f.type,item});}
  btn.disabled=false;f.busy=false;
  if(!j||!j.ok||j.opaque&&!j.item){
    if(j&&j.handled)return;
    $('#df-error').textContent=(j&&j.message)||(j&&j.opaque?'ส่งคำขอแล้ว แต่อ่านผลไม่ได้ — กรุณากดโหลดใหม่เพื่อตรวจสอบเลข':'ออกเลขไม่สำเร็จ กรุณาลองใหม่');
    $('#df-error').classList.remove('hidden');renderDocForm();return;
  }
  upsertLocalDoc(f.type,j.item);
  if(f.mode==='edit'){closeDocForm();toast('บันทึกการแก้ไขแล้ว');renderDocs();if(docs.pv)openDocDetail(f.type,f.id);return;}
  // ออกเลขสำเร็จ → แสดงเลข แล้วอัปโหลดไฟล์ต่อ
  showIssued(f.type,j.item);
  if(f.files.length)await uploadFiles(f.type,j.item.id,f.files.map(q=>q.file),'#df-queue',f.files);
  refreshDocsSoon();
}
function showIssued(t,x){
  const U=DOC_TYPES_UI[t],f=docs.form;
  $('#docf-body').classList.add('done');
  $('#docf-types').innerHTML='';$('#docf-next').innerHTML='';
  $('#docf-kicker').textContent='ออกเลขสำเร็จ';$('#docf-title').textContent=U.name;
  const box=document.createElement('div');box.className='issued';box.style.cssText=`--c:${U.c};--cs:${U.s};--cd:${U.d}`;
  box.innerHTML=`<span class="issued-ico"><i data-lucide="check"></i></span>
    <small>${t==='announce'||t==='order'?U.name+' ที่':'เลขที่หนังสือ'}</small>
    <div class="issued-no"><b>${esc(x.docNo)}</b><button class="btn btn-soft btn-sm" data-dact="copy" data-no="${esc(x.docNo)}"><i data-lucide="copy"></i>คัดลอก</button></div>
    <p>${esc(x.subject)}</p>
    <span class="issued-meta">ออกเลขเมื่อ ${fmtThaiDate(x.date)} · โดย ${esc(x.recorder)}</span>`;
  $('#docf-form').before(box);
  $('#docf-foot').innerHTML=`<button type="button" class="btn btn-ghost" data-dact="again"><i data-lucide="plus"></i>ออกเลขอีกฉบับ</button>
    <button type="button" class="btn btn-primary" data-dact="close-form" style="background:${U.c}">เสร็จสิ้น</button>`;
  if(!f.files.length)$('#df-queue').innerHTML='';
  icons();
}
function resetDocFormFooter(){
  const old=$('.issued');if(old)old.remove();
  $('#docf-foot').innerHTML=`<button type="button" class="btn btn-ghost" data-dact="close-form">ยกเลิก</button>
    <button type="button" class="btn btn-primary" id="df-submit"><i data-lucide="hash"></i><span id="df-submit-txt">ออกเลขหนังสือ</span></button>`;
  $('#df-submit').addEventListener('click',submitDocForm);
}
/* อัปโหลดทีละไฟล์ (base64) → เซิร์ฟเวอร์เปลี่ยนชื่อเป็นเลขหนังสือ */
async function uploadFiles(t,id,fileList,queueSel,queue){
  queue=queue||[...fileList].filter(f=>f.size<=DOC_MAX_MB*1048576).map(file=>({file,name:file.name,size:file.size,state:'wait'}));
  if([...fileList].some(f=>f.size>DOC_MAX_MB*1048576))toast(`มีไฟล์ที่ใหญ่เกิน ${DOC_MAX_MB} MB ถูกข้าม`);
  if(!queue.length)return;
  for(const q of queue){
    q.state='up';renderQueue(queueSel,queue);
    try{
      const data=await fileToBase64(q.file);
      const j=await gasPost({action:'doc.upload',type:t,id,file:{name:q.name,mime:q.file.type||'application/octet-stream',data}},{noRetry:true});
      if(j&&j.ok){q.state='ok';q.newName=j.file.name;upsertLocalDoc(t,j.item);}
      else{q.state='err';q.err=(j&&j.message)||'อัปโหลดไม่สำเร็จ';}
    }catch(e){q.state='err';q.err='อ่านไฟล์ไม่ได้';}
    renderQueue(queueSel,queue);
  }
  const okN=queue.filter(q=>q.state==='ok').length;
  toast(okN===queue.length?`อัปโหลด ${okN} ไฟล์เรียบร้อย`:`อัปโหลดสำเร็จ ${okN}/${queue.length} ไฟล์`);
  renderDocs();
  if(docs.pv&&docs.pv.id===id&&$('#doc-ov').classList.contains('show')){const keep=queue.slice();openDocDetail(t,id);renderQueue('#pv-queue',keep);}
}
function fileToBase64(file){
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=rej;r.readAsDataURL(file);});
}
function bindDrop(zone,onFiles){
  if(!zone)return;
  ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('over');}));
  ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.remove('over');}));
  zone.addEventListener('drop',e=>{if(e.dataTransfer&&e.dataTransfer.files.length)onFiles([...e.dataTransfer.files]);});
}
function upsertLocalDoc(t,item){
  if(!docs.data||!item)return;
  const T=docs.data.types[t];if(!T)return;
  const i=T.items.findIndex(x=>x.id===item.id);
  if(i>-1)T.items[i]=item;else if(item.year===docs.year){T.items.push(item);T.count=T.items.length;}
  if(item.seq&&item.year===new Date().getFullYear()+543){T.lastNo=item.docNo;}
}
let _docsRefreshT;
function refreshDocsSoon(){clearTimeout(_docsRefreshT);_docsRefreshT=setTimeout(()=>loadDocs(docs.year),1500);}

/* ── เหตุการณ์ ── */
function initDocs(){
  registerDP({key:'doc',hidden:'#df-sign',btn:'#df-sign-btn',txt:'#df-sign-txt',box:'#df-dp',placeholder:'ยังไม่ระบุ',clearable:true});
  $('#df-submit').addEventListener('click',submitDocForm);
  $('#dnew').addEventListener('click',()=>{resetDocFormFooter();openDocForm('new',docs.type);});
  $('#df-files').addEventListener('change',e=>{addFormFiles(e.target.files);e.target.value='';});
  bindDrop($('#df-drop'),addFormFiles);
  let qt;$('#dq').addEventListener('input',e=>{clearTimeout(qt);qt=setTimeout(()=>{docs.q=e.target.value;renderDocs();},180);});
  $('#dyear').addEventListener('change',e=>loadDocs(+e.target.value));
  $('#ddept').addEventListener('change',e=>{docs.dept=e.target.value;renderDocs();});
  $('#dstatus').addEventListener('change',e=>{docs.status=e.target.value;renderDocs();});
  $('#dmine').addEventListener('click',()=>{docs.mine=!docs.mine;renderDocs();});
  $('#docf-ov').addEventListener('click',e=>{if(e.target.id==='docf-ov')closeDocForm();});
  $('#doc-ov').addEventListener('click',e=>{if(e.target.id==='doc-ov')closeDocDetail();});
  document.addEventListener('click',async e=>{
    const tp=e.target.closest('[data-dtype]');
    if(tp){docs.type=tp.dataset.dtype;docs.dept='all';renderDocs();return;}
    const tab=e.target.closest('[data-dtab]');
    if(tab){docs.form.type=tab.dataset.dtab;renderDocForm();return;}
    const a=e.target.closest('[data-dact]');
    if(a){
      e.preventDefault();
      const act=a.dataset.dact,pv=docs.pv;
      if(act==='close-form')closeDocForm();
      else if(act==='close-pv')closeDocDetail();
      else if(act==='copy'){try{await navigator.clipboard.writeText(a.dataset.no);toast('คัดลอก '+a.dataset.no+' แล้ว');}catch(err){toast(a.dataset.no);}}
      else if(act==='rmq'){docs.form.files.splice(+a.dataset.i,1);renderQueue('#df-queue',docs.form.files);}
      else if(act==='again'){resetDocFormFooter();openDocForm('new',docs.form.type);}
      else if(act==='edit'&&pv){resetDocFormFooter();openDocForm('edit',pv.t,pv.id);}
      else if(act==='cancel'&&pv){
        const x=findDoc(pv.t,pv.id);
        if(!await showPopup({type:'warning',title:'ยกเลิกเลข '+x.docNo+' ?',msg:'เลขนี้จะถูกบันทึกว่า "ยกเลิก" และจะไม่ถูกนำกลับมาใช้อีก',okLabel:'ยกเลิกเลข',cancelLabel:'ไม่ใช่'}))return;
        const j=await gasPost({action:'doc.cancel',type:pv.t,id:pv.id});
        if(j.ok){upsertLocalDoc(pv.t,j.item);openDocDetail(pv.t,pv.id);renderDocs();toast('ยกเลิกเลขแล้ว');}else if(!j.handled)showPopup({type:'error',title:'ไม่สำเร็จ',msg:j.message||'กรุณาลองใหม่'});
      }
      else if(act==='rmfile'&&pv){
        if(!await showPopup({type:'warning',title:'ลบไฟล์นี้?',msg:'ไฟล์จะถูกย้ายไปถังขยะของ Google Drive (กู้คืนได้ภายใน 30 วัน)',okLabel:'ลบไฟล์',cancelLabel:'ยกเลิก'}))return;
        const j=await gasPost({action:'doc.removeFile',type:pv.t,id:pv.id,url:a.dataset.url});
        if(j.ok){upsertLocalDoc(pv.t,j.item);openDocDetail(pv.t,pv.id);renderDocs();toast('ลบไฟล์แล้ว');}else if(!j.handled)showPopup({type:'error',title:'ไม่สำเร็จ',msg:j.message||'กรุณาลองใหม่'});
      }
      return;
    }
    if(e.target.closest('[data-stop]'))return;
    const row=e.target.closest('.drow[data-doc]');
    if(row){const [t,id]=row.dataset.doc.split(':');openDocDetail(t,id);}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('drow')){const [t,id]=e.target.dataset.doc.split(':');openDocDetail(t,id);}
    if(e.key==='Escape'&&!$('#pop-ov').classList.contains('show')&&!dp.open){
      if($('#docf-ov').classList.contains('show'))closeDocForm();
      else if($('#doc-ov').classList.contains('show'))closeDocDetail();
    }
  });
}
