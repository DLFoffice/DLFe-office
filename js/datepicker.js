/* ═══════════════════════════════════════════
   Smart-Office DLF · datepicker.js
   ตัวเลือกวันที่ พ.ศ. (ใช้ซ้ำได้หลายช่อง)
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   THAI DATE PICKER (พุทธศักราช)
═══════════════════════════════════════════ */
/* ใช้ร่วมกันได้หลายช่อง: registerDP({...}) แล้วเรียก dpSet(key, 'yyyy-mm-dd') */
const dp={open:false,view:'days',y:0,m:0,cfg:null};
const DP_CFG={};
let _dpGlobal=false;
function thaiDateLong(s){if(!validYmd(s))return '';const d=parseYmd(s);return 'วัน'+DOW[d.getDay()]+'ที่ '+d.getDate()+' '+MONTHS[d.getMonth()]+' '+(d.getFullYear()+543);}
function registerDP(cfg){
  /* cfg: key, hidden, btn, txt, box, placeholder, onChange(v), counts()->{ymd:n}, legend()->html, clearable, tomorrow */
  DP_CFG[cfg.key]=cfg;
  $(cfg.btn).addEventListener('click',e=>{e.stopPropagation();(dp.open&&dp.cfg===cfg)?closeDP():openDP(cfg);});
  $(cfg.box).addEventListener('click',e=>{
    e.stopPropagation();
    const t=e.target.closest('[data-dp]');if(!t||t.disabled)return;
    const a=t.dataset.dp;
    if(a==='prev'||a==='next'){
      const s=a==='prev'?-1:1;
      if(dp.view==='days'){dp.m+=s;if(dp.m<0){dp.m=11;dp.y--;}if(dp.m>11){dp.m=0;dp.y++;}}else dp.y+=s;
      renderDP();
    }else if(a==='title'){dp.view=dp.view==='days'?'months':'days';renderDP();}
    else if(a==='month'){dp.m=+t.dataset.m;dp.view='days';renderDP();}
    else if(a==='day'){dpSet(cfg.key,t.dataset.d);closeDP();}
    else if(a==='today'){dpSet(cfg.key,todayStr());closeDP();}
    else if(a==='tomorrow'){dpSet(cfg.key,addDays(todayStr(),1));closeDP();}
    else if(a==='clear'){dpSet(cfg.key,'');closeDP();}
    else if(a==='close')closeDP();
  });
  if(!_dpGlobal){
    _dpGlobal=true;
    document.addEventListener('click',()=>{if(dp.open)closeDP();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dp.open){e.stopImmediatePropagation();const b=dp.cfg&&$(dp.cfg.btn);closeDP();if(b)b.focus();}},true);
  }
}
function dpSet(key,v,silent){
  const cfg=DP_CFG[key];if(!cfg)return;
  $(cfg.hidden).value=v||'';
  const t=$(cfg.txt),dh=validYmd(v)?fmtDayHead(v):null,hn=validYmd(v)?holidayName(v):'';
  t.innerHTML=validYmd(v)?esc(thaiDateLong(v))+(dh.tag?`<small>(${dh.tag})</small>`:'')+(hn?`<small style="color:#E11D48">· ${esc(hn)}</small>`:'')
    :`<span style="color:var(--faint)">${esc(cfg.placeholder||'เลือกวันที่')}</span>`;
  const f=$(cfg.hidden).closest('.field');if(f)f.classList.remove('invalid');
  if(!silent&&cfg.onChange)cfg.onChange(v);
}
function setFormDate(v,silent){dpSet('book',v,silent);}
function initDatePicker(){
  registerDP({key:'book',hidden:'#f-date',btn:'#f-date-btn',txt:'#f-date-txt',box:'#dp',tomorrow:true,
    onChange:()=>onFormChange(),
    counts:()=>{const key=keyOf(state.bookKind),c={};listOf(state.bookKind).forEach(b=>{if(b.status!=='rejected'&&b[key]===state.sel[state.bookKind])c[b.date]=(c[b.date]||0)+1;});return c;},
    legend:()=>`<b></b>มีการจอง${esc(state.bookKind==='room'?shortRoom(state.sel.room):state.sel.car)}แล้ว<span class="dp-hk"></span>วันหยุดราชการ`});
}
function openDP(cfg){
  if(dp.open&&dp.cfg&&dp.cfg!==cfg)closeDP();
  const v=$(cfg.hidden).value,d=validYmd(v)?parseYmd(v):new Date();
  dp.cfg=cfg;dp.y=d.getFullYear();dp.m=d.getMonth();dp.view='days';dp.open=true;
  renderDP();$(cfg.box).classList.add('show');$(cfg.btn).classList.add('open');
}
function dpHolidayNote(){
  const hs=Object.keys(HOLIDAYS).filter(k=>{const d=parseYmd(k);return d.getFullYear()===dp.y&&d.getMonth()===dp.m;}).sort();
  return hs.length?`<div class="dp-hols">${hs.map(k=>`<span><b>${parseYmd(k).getDate()}</b> ${esc(HOLIDAYS[k])}</span>`).join('')}</div>`:'';
}
function closeDP(){
  if(!dp.cfg)return;
  dp.open=false;$(dp.cfg.box).classList.remove('show');$(dp.cfg.btn).classList.remove('open');
}
function renderDP(){
  const cfg=dp.cfg,box=$(cfg.box),sel=$(cfg.hidden).value,t=todayStr(),min=$(cfg.hidden).dataset.min||'';
  const be=dp.y+543;
  let body='';
  if(dp.view==='days'){
    const count=cfg.counts?cfg.counts():{};
    const first=new Date(dp.y,dp.m,1),start=new Date(dp.y,dp.m,1-first.getDay());
    body='<div class="dp-dow">'+['อา','จ','อ','พ','พฤ','ศ','ส'].map(x=>`<span>${x}</span>`).join('')+'</div><div class="dp-days">';
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);
      const ds=ymd(d),dow=d.getDay(),n=count[ds]||0;
      let cls='dp-d';
      const hn=holidayName(ds);
      if(d.getMonth()!==dp.m)cls+=' out';if(dow===0||dow===6)cls+=' wk';if(hn)cls+=' hol';if(ds===t)cls+=' today';if(ds===sel)cls+=' sel';
      const dots=n?`<i>${'<b></b>'.repeat(Math.min(n,3))}</i>`:'';
      body+=`<button type="button" class="${cls}" data-dp="day" data-d="${ds}"${min&&ds<min?' disabled':''} title="${esc(thaiDateLong(ds))}${hn?' · วันหยุด: '+esc(hn):''}${n?' · มีจอง '+n+' รายการ':''}">${d.getDate()}${dots}</button>`;
    }
    body+='</div>';
  }else{
    const nowY=new Date().getFullYear(),nowM=new Date().getMonth(),sd=validYmd(sel)?parseYmd(sel):null;
    body='<div class="dp-months">'+MONTHS.map((mn,i)=>{
      let cls='dp-m';if(sd&&sd.getFullYear()===dp.y&&sd.getMonth()===i)cls+=' sel';if(nowY===dp.y&&nowM===i)cls+=' now';
      return `<button type="button" class="${cls}" data-dp="month" data-m="${i}">${MONTHS_S[i]}</button>`;
    }).join('')+'</div>';
  }
  const legend=cfg.legend?cfg.legend():'<span class="dp-hk" style="margin-left:0"></span>วันหยุดราชการ';
  box.innerHTML=`
    <div class="dp-head">
      <button type="button" class="dp-nav" data-dp="prev" aria-label="ก่อนหน้า"><i data-lucide="chevron-left"></i></button>
      <button type="button" class="dp-title" data-dp="title">
        <small>${dp.view==='days'?'พุทธศักราช '+be:'เลือกเดือน'}</small>
        <b>${dp.view==='days'?MONTHS[dp.m]+' '+be:'พ.ศ. '+be}<i data-lucide="chevron-down"></i></b>
      </button>
      <button type="button" class="dp-nav" data-dp="next" aria-label="ถัดไป"><i data-lucide="chevron-right"></i></button>
    </div>
    <div class="dp-body">${body}</div>
    ${dp.view==='days'?`<div class="dp-legend">${legend}</div>${dpHolidayNote()}`:''}
    <div class="dp-foot">
      <button type="button" class="chip" data-dp="today">วันนี้</button>
      ${cfg.tomorrow?'<button type="button" class="chip" data-dp="tomorrow">พรุ่งนี้</button>':''}
      ${cfg.clearable?'<button type="button" class="chip" data-dp="clear">ล้าง</button>':''}
      <span class="spacer"></span>
      <button type="button" class="chip" data-dp="close">ปิด</button>
    </div>`;
  icons();
}
