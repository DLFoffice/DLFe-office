/* ═══════════════════════════════════════════
   DLFOffice · print.js
   แบบฟอร์มพิมพ์ราชการ (ห้องประชุม / รถยนต์)
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   PRINT BOOKING DOCUMENT
═══════════════════════════════════════════ */
function printBookingDoc(kind,e){
  const th=v=>String(v==null?'':v); // ใช้เลขอารบิก
  const now=new Date();
  const dateLine=`<span style="white-space:nowrap">วันที่ <span class="f xs">${th(now.getDate())}</span> เดือน <span class="f s2">${MONTHS[now.getMonth()]}</span> พ.ศ. <span class="f xs">${th(now.getFullYear()+543)}</span></span>`;
  const f=(v,cls)=>`<span class="f ${cls||''}">${v?esc(th(v)):'&nbsp;'}</span>`;
  const cb=(on,label)=>`<span class="cbx${on?' on':''}"></span>${label}`;
  const bookDate=validYmd(e.date)?(()=>{const d=parseYmd(e.date);return 'วัน'+DOW[d.getDay()]+'ที่ '+th(d.getDate())+' '+MONTHS[d.getMonth()]+' พ.ศ. '+th(d.getFullYear()+543);})():'';
  const docNo=e.docNo?th(e.docNo):'';
  const approved=e.status==='approved',rejected=e.status==='rejected';
  const sign=(name,role,extra)=>`<div class="sign"><div>(ลงชื่อ) <span class="f sg">&nbsp;</span></div><div>(${name?esc(name):'<span class="f sg">&nbsp;</span>'})</div><div>${role}</div>${extra?`<div class="sm">${extra}</div>`:''}</div>`;
  const box=(title,body,signRole)=>`<td><div class="bx-t">${title}</div>${body}<div class="bx-s">(ลงชื่อ) <span class="f m">&nbsp;</span><br>(<span class="f m">&nbsp;</span>)<br>${signRole} <span style="white-space:nowrap">&nbsp;วันที่ <span class="f xs">&nbsp;</span>/<span class="f xs">&nbsp;</span>/<span class="f xs">&nbsp;</span></span></div></td>`;
  let title,form,body,bottom;

  if(kind==='room'){
    form='';title='แบบขออนุญาตใช้ห้องประชุม';
    body=`
      <p class="sub"><b>เรื่อง</b>&nbsp; ขออนุญาตใช้ห้องประชุม</p>
      <p class="sub"><b>เรียน</b>&nbsp; ${esc(FORM_TO)}</p>
      <p class="ind">ข้าพเจ้า ${f(e.requester,'l')} ตำแหน่ง ${f('','m')}</p>
      <p>สังกัด ${f(e.dept,'l')} มีความประสงค์ขออนุญาตใช้</p>
      <p>${f(e.room,'xl')}</p>
      <p>เพื่อ ${f(e.purpose,'xl')}</p>
      <p>จำนวนผู้เข้าร่วมประชุม ${f(e.attendees||1,'s')} คน</p>
      <p>ในวันที่ ${f(bookDate,'l')} เวลา ${f(e.timeStart,'s')} น. ถึง ${f(e.timeEnd,'s')} น.</p>
      <p>อุปกรณ์ / สิ่งที่ต้องการเพิ่มเติม</p>
      <div class="cbs">
        <span>${cb(false,'โปรเจกเตอร์')}</span><span>${cb(false,'ไมโครโฟน/เครื่องเสียง')}</span><span>${cb(false,'ประชุมออนไลน์')}</span>
        <span>${cb(false,'อาหารว่าง')}</span>
        <span style="grid-column:span 2">${cb(!!e.note,'อื่น ๆ')} ${f(e.note,'l')}</span>
      </div>
      <p class="ind">จึงเรียนมาเพื่อโปรดพิจารณาอนุญาต</p>
      <div class="signs">${sign(e.requester,'ผู้ขออนุญาต')}${sign('','หัวหน้ากลุ่มงาน',esc(e.dept||''))}</div>`;
    bottom=`<table class="bx"><tr>
      ${box('ความเห็นเจ้าหน้าที่ผู้ดูแลห้อง',`<p>${cb(false,'ห้องว่าง สามารถใช้งานได้')}</p><p>${cb(false,'ห้องไม่ว่าง')}</p>`,'เจ้าหน้าที่ผู้ดูแล')}
      ${box('คำสั่งผู้มีอำนาจ',`<p>${cb(approved,'อนุญาต')}</p><p>${cb(rejected,'ไม่อนุญาต')}</p>`,'ผู้มีอำนาจอนุมัติ')}
    </tr></table>`;
  }else{
    form='แบบ 3';title='ใบขออนุญาตใช้รถส่วนกลาง';
    const comp=(e.companions||[]).join(', ');
    body=`
      <p class="sub"><b>เรียน</b>&nbsp; ${esc(FORM_TO)}</p>
      <p class="ind">ข้าพเจ้า ${f(e.requester,'l')} ตำแหน่ง ${f('','m')}</p>
      <p>สังกัด ${f(e.dept,'l')} ขออนุญาตใช้รถตู้ทะเบียน ${f(e.plate,'s2')}</p>
      <p>ไปที่ ${f(e.destination,'xl')}</p>
      <p>เพื่อ ${f(e.purpose,'xl')}</p>
      <p>มีผู้เดินทางรวม ${f(e.numPeople||1,'s')} คน ${comp?`ได้แก่ ${f(comp,'l')}`:''}</p>
      <p>ในวันที่ ${f(bookDate,'l')} เวลา ${f(e.timeStart,'s')} น. ถึง ${f(e.timeEnd,'s')} น.</p>
      <div class="signs">${sign(e.requester,'ผู้ขออนุญาต')}${sign('','หัวหน้ากลุ่มงาน / ผู้บังคับบัญชา',esc(e.dept||''))}</div>`;
    bottom=`<table class="bx"><tr>
      ${box('ความเห็นผู้จัดรถ',`<p>ควรอนุญาตให้ใช้รถทะเบียน ${f(e.plate,'s')}</p><p>โดยมี ${f(e.driver,'m')} เป็นพนักงานขับรถ</p>`,'ผู้จัดรถ')}
      ${box('คำสั่งผู้มีอำนาจ',`<p>${cb(approved,'อนุญาต')}</p><p>${cb(rejected,'ไม่อนุญาต')}</p>`,'ผู้สั่งใช้รถ')}
    </tr></table>
    <div class="log">
      <div class="bx-t">บันทึกการใช้รถ (พนักงานขับรถ)</div>
      <p>ออกเวลา ${f('','s')} น. เลขไมล์ ${f('','s')} &nbsp; กลับเวลา ${f('','s')} น. เลขไมล์ ${f('','s')} &nbsp; รวม ${f('','s')} กม.</p>
      <p style="text-align:right">(ลงชื่อ) <span class="f m">&nbsp;</span> พนักงานขับรถ &nbsp;(${esc(e.driver||'………………')})</p>
    </div>`;
  }

  const html=`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>${title}${docNo?' '+docNo:''}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html{background:#E5E7EB}
body{font-family:'Sarabun','TH Sarabun New',sans-serif;font-size:14pt;line-height:1.72;color:#000}
.page{width:210mm;height:297mm;overflow:hidden;margin:12mm auto;background:#fff;padding:10mm 18mm 14mm 28mm;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.15)}
@page{size:A4;margin:0}
@media print{html{background:#fff}.page{margin:0;box-shadow:none}.tools{display:none!important}}
.tools{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:10px;padding:12px;background:#111827}
.tools button{font-family:'Sarabun';font-size:12.5pt;font-weight:700;border-radius:10px;padding:7px 22px;cursor:pointer;border:none;background:#374151;color:#fff}
.tools .p{background:#2563EB}
.form-no{position:absolute;right:18mm;top:10mm;font-size:13pt;font-weight:700}
.logo{position:absolute;left:28mm;top:9mm}.logo img{height:16mm}
h1{text-align:center;font-size:18pt;font-weight:700;line-height:1.25;margin-top:4mm}
.org{text-align:center;font-size:13.5pt;margin-bottom:3mm}
.meta{margin-left:40%;line-height:1.6;margin-bottom:1.5mm}
.docno{display:inline-block;border:1.2px solid #000;border-radius:4px;padding:0 10px;font-weight:700}
p{margin:0}
.sub{margin-top:2.5mm}
.ind{text-indent:25mm;margin-top:1mm}
.f{display:inline-block;border-bottom:1.2px dotted #000;min-width:30mm;padding:0 6px 1px;line-height:1.3;text-align:center;text-indent:0;vertical-align:baseline}
.f.xs{min-width:9mm;padding:0 3px}.f.s{min-width:16mm}.f.s2{min-width:26mm}.f.m{min-width:40mm}.f.l{min-width:56mm}.f.sg{min-width:48mm}.f.xl{min-width:calc(100% - 14mm);text-align:left}
.cbs{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:0 7mm;margin:0 0 1mm 10mm}
.cbs .w{grid-column:1/-1}
.cbx{display:inline-block;width:4.2mm;height:4.2mm;border:1.3px solid #000;margin-right:2.5mm;vertical-align:-0.4mm;position:relative}
.cbx.on::after{content:'';position:absolute;left:1.1mm;top:-.2mm;width:1.4mm;height:2.8mm;border:solid #000;border-width:0 .55mm .55mm 0;transform:rotate(45deg)}
.signs{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:5mm}
.sign{text-align:center;line-height:1.6}
.sign .sm{font-size:13pt}
.bx{width:100%;border-collapse:collapse;margin-top:4mm;table-layout:fixed}
.bx td{border:1.2px solid #000;padding:2mm 4mm;vertical-align:top;font-size:13.5pt;line-height:1.6}
.bx-t{font-weight:700;text-decoration:underline;margin-bottom:1mm}
.bx-s{text-align:center;margin-top:2mm}
.bx-s .f.m{min-width:42mm}
.log{border:1.2px solid #000;border-top:none;padding:2mm 4mm;font-size:13.5pt;line-height:1.6}
.foot{position:absolute;left:28mm;right:18mm;bottom:6mm;display:flex;justify-content:space-between;font-size:10pt;color:#6B7280;border-top:.5px solid #D1D5DB;padding-top:1.5mm}
</style></head><body>
<div class="tools"><button class="p" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button><button onclick="window.close()">✕ ปิด</button></div>
<div class="page">
  ${form?`<div class="form-no">${form}</div>`:''}
  <div class="logo"><img src="${LOGO_URL}" alt=""></div>
  <h1>${title}</h1>
  <div class="org">${esc(FORM_ORG)}</div>
  <div class="meta">
    <div>เลขที่ <span class="docno">${docNo||'<span class="f s2">&nbsp;</span>'}</span></div>
    <div>เขียนที่ ${esc(FORM_PLACE)}</div>
    <div>${dateLine}</div>
  </div>
  ${body}
  ${bottom}
  <div class="foot"><span>ออกโดยระบบ DLFOffice · รหัสอ้างอิง ${esc(e.id)}</span><span>สถานะในระบบ: ${STATUS[e.status]||'-'}</span></div>
</div>
</body></html>`;
  const w=window.open('','_blank','width=960,height=900');
  if(!w){showPopup({type:'warning',title:'เบราว์เซอร์บล็อกหน้าต่างใหม่',msg:'กรุณาอนุญาต Pop-up สำหรับเว็บไซต์นี้แล้วลองอีกครั้ง'});return;}
  w.document.open();w.document.write(html);w.document.close();
}
