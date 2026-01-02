const ADMIN_USER = "Starkocer";
const ADMIN_PASS = "Star1996@";
'use strict';
/* iOS-grade Accounts (GitHub Pages friendly) */

const USER='admin', PASS='admin';
const LS_DATA='ga_ios_data_v1';
const LS_THEME='ga_theme';
const LS_ACCENT='ga_accent';
const LS_INTRO='ga_intro_done';

let data = loadData();
let lastSnapshot = null;

let invQuery='', expQuery='';
let invoiceFilter = { from:'', to:'', clientId:'' };

function $(id){ return document.getElementById(id); }
function uid(){ return Math.random().toString(16).slice(2)+Date.now().toString(16); }
function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function money(n){ return (Number(n)||0).toLocaleString('ar-IQ',{maximumFractionDigits:2}); }
function escapeHtml(s){
  return String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function toast(msg){
  const t=$('toast'); if(!t) return;
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}
function tapFeedback(){
  document.body.style.transform='scale(0.998)';
  setTimeout(()=>document.body.style.transform='', 90);
}

/* Boot */
document.addEventListener('DOMContentLoaded', ()=>{
  // Splash out
  setTimeout(()=>{ const s=$('splash'); if(s) s.remove(); }, 1200);

  // Theme: saved > system
  const savedTheme = localStorage.getItem(LS_THEME);
  if(savedTheme === 'dark') document.body.classList.add('dark');
  else if(savedTheme === 'light') document.body.classList.remove('dark');
  else if(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) document.body.classList.add('dark');
  syncThemeIcon();

  // Accent
  const savedAccent = localStorage.getItem(LS_ACCENT);
  if(savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);

  // Intro (first run)
  setupIntro();

  // App hidden until login
  $('topbar').classList.add('hidden');
  $('app').classList.add('hidden');
  $('tabbar').classList.add('hidden');

  // Login
  $('loginBtn').addEventListener('click', login);
  $('lg_pass').addEventListener('keydown', (e)=>{ if(e.key==='Enter') login(); });

  // Top actions
  $('logoutBtn').addEventListener('click', ()=>location.reload());
  $('themeToggle').addEventListener('click', toggleTheme);

  // Tabs (bottom)
  document.querySelectorAll('.tab-item').forEach(btn=>{
    btn.addEventListener('click', ()=>openTab(btn.dataset.tab));
  });

  // Clients
  $('addClientBtn').addEventListener('click', addClient);
  $('clearAllBtn').addEventListener('click', clearAll);

  // Invoices
  $('addInvoiceBtn').addEventListener('click', addInvoice);
  $('invTodayBtn').addEventListener('click', ()=>$('i_date').value=todayISO());
  $('invSearch').addEventListener('input', e=>{ invQuery=e.target.value.trim().toLowerCase(); renderInvoices(); });
  $('applyFilterBtn').addEventListener('click', applyInvFilter);
  $('clearFilterBtn').addEventListener('click', clearInvFilter);

  // Expenses
  $('addExpenseBtn').addEventListener('click', addExpense);
  $('expTodayBtn').addEventListener('click', ()=>$('e_date').value=todayISO());
  $('expSearch').addEventListener('input', e=>{ expQuery=e.target.value.trim().toLowerCase(); renderExpenses(); });

  // Export/Backup/Restore/PDF
  $('exportAllBtn').addEventListener('click', exportAllCSV);
  $('printSummaryBtn').addEventListener('click', printSummaryPDF);
  $('printFullBtn').addEventListener('click', printFullReportPDF);
  $('backupBtn').addEventListener('click', backupJSON);
  $('restoreBtn').addEventListener('click', restoreJSON);

  // Accent picker
  const picker=$('accentPicker');
  if(picker){
    picker.value = savedAccent || '#0A84FF';
    picker.addEventListener('input', e=>{
      document.documentElement.style.setProperty('--accent', e.target.value);
      localStorage.setItem(LS_ACCENT, e.target.value);
      tapFeedback();
      toast('تم تغيير اللون ✨');
    });
  }

  renderAll();

  // SW
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
});

/* Intro */
function setupIntro(){
  const intro=$('intro'); if(!intro) return;
  if(localStorage.getItem(LS_INTRO)){ intro.remove(); return; }

  intro.classList.remove('hidden');
  const slides=[...intro.querySelectorAll('.intro-slide')];
  let i=0;

  function show(n){
    slides.forEach((s,idx)=>s.classList.toggle('active', idx===n));
  }
  show(0);

  $('introNext').addEventListener('click', ()=>{
    tapFeedback();
    i++;
    if(i < slides.length) show(i);
    else finish();
  });
  $('introSkip').addEventListener('click', ()=>finish());

  function finish(){
    localStorage.setItem(LS_INTRO, '1');
    intro.remove();
  }
}

/* Theme */
function syncThemeIcon(){
  const icon=$('themeIcon'); if(!icon) return;
  icon.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}
function toggleTheme(){
  tapFeedback();
  document.body.classList.toggle('dark');
  localStorage.setItem(LS_THEME, document.body.classList.contains('dark') ? 'dark' : 'light');
  syncThemeIcon();
}

/* Login */
function login(){
  const u=$('lg_user').value.trim();
  const p=$('lg_pass').value;
  if(u===USER && p===PASS){
    $('lg_error').classList.add('hidden');
    $('loginGate').classList.add('hidden');
    $('topbar').classList.remove('hidden');
    $('app').classList.remove('hidden');
    $('tabbar').classList.remove('hidden');
    openTab('clients');
    toast('تم الدخول ✅');
  }else{
    $('lg_error').classList.remove('hidden');
  }
}

/* Tabs */
function openTab(id){
  document.querySelectorAll('.tab-item').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('hidden', p.id!==id));
  if(id==='summary' && window.renderMonthlyYearlyCharts) window.renderMonthlyYearlyCharts(data);
}

/* Storage */
function loadData(){
  const raw=localStorage.getItem(LS_DATA);
  if(!raw) return {clients:[], invoices:[], expenses:[]};
  try{
    const d=JSON.parse(raw);
    if(!d || !Array.isArray(d.clients)||!Array.isArray(d.invoices)||!Array.isArray(d.expenses))
      return {clients:[], invoices:[], expenses:[]};
    return d;
  }catch{ return {clients:[], invoices:[], expenses:[]}; }
}
function saveData(){ localStorage.setItem(LS_DATA, JSON.stringify(data)); }
function takeSnapshot(){ lastSnapshot = JSON.stringify(data); }

/* Clients CRUD */
function addClient(){
  const name=$('c_name').value.trim();
  const phone=$('c_phone').value.trim();
  const city=$('c_city').value.trim();
  if(!name) return toast('اكتب اسم العميل');
  takeSnapshot();
  data.clients.push({id:uid(), name, phone, city});
  saveData();
  $('c_name').value=''; $('c_phone').value=''; $('c_city').value='';
  renderAll();
  toast('تمت إضافة العميل ✅');
}
function editClient(id){
  const c=data.clients.find(x=>x.id===id); if(!c) return;
  const name=prompt('تعديل اسم العميل:', c.name);
  if(name===null) return;
  const v=name.trim(); if(!v) return toast('الاسم فارغ');
  takeSnapshot();
  c.name=v;
  saveData(); renderAll(); toast('تم التعديل ✏️');
}
function deleteClient(id){
  const c=data.clients.find(x=>x.id===id); if(!c) return;
  if(!confirm(`حذف العميل: ${c.name} ؟`)) return;
  takeSnapshot();
  data.clients=data.clients.filter(x=>x.id!==id);
  data.invoices=data.invoices.filter(i=>i.clientId!==id);
  saveData(); renderAll(); toast('تم الحذف 🗑');
}
function clearAll(){
  if(!confirm('أكيد تريد مسح كل البيانات؟')) return;
  takeSnapshot();
  data={clients:[], invoices:[], expenses:[]};
  saveData(); renderAll(); toast('تم المسح');
}

/* Invoices CRUD */
function addInvoice(){
  if(data.clients.length===0) return toast('أضف عميل أولاً');
  const clientId=$('i_client').value;
  const desc=$('i_desc').value.trim();
  const amount=Number($('i_amount').value);
  const date=$('i_date').value || todayISO();
  if(!clientId) return toast('اختر عميل');
  if(!desc) return toast('اكتب وصف');
  if(!Number.isFinite(amount)||amount<=0) return toast('المبلغ لازم موجب');
  takeSnapshot();
  data.invoices.push({id:uid(), clientId, desc, amount, date});
  saveData();
  $('i_desc').value=''; $('i_amount').value=''; $('i_date').value='';
  renderAll(); toast('تمت إضافة فاتورة ✅');
}
function editInvoice(id){
  const inv=data.invoices.find(x=>x.id===id); if(!inv) return;
  const desc=prompt('تعديل الوصف:', inv.desc);
  if(desc===null) return;
  const d=desc.trim(); if(!d) return toast('الوصف فارغ');
  const aStr=prompt('تعديل المبلغ:', String(inv.amount));
  if(aStr===null) return;
  const a=Number(aStr); if(!Number.isFinite(a)||a<=0) return toast('المبلغ لازم موجب');
  const dt=prompt('تعديل التاريخ (YYYY-MM-DD):', inv.date || todayISO());
  if(dt===null) return;
  const date=dt.trim(); if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast('صيغة التاريخ غلط');
  takeSnapshot();
  inv.desc=d; inv.amount=a; inv.date=date;
  saveData(); renderAll(); toast('تم تعديل الفاتورة ✏️');
}
function deleteInvoice(id){
  if(!confirm('حذف الفاتورة؟')) return;
  takeSnapshot();
  data.invoices=data.invoices.filter(x=>x.id!==id);
  saveData(); renderAll(); toast('تم حذف الفاتورة 🗑');
}
function applyInvFilter(){
  invoiceFilter={
    clientId:$('f_client').value || '',
    from:$('f_from').value || '',
    to:$('f_to').value || ''
  };
  renderInvoices();
}
function clearInvFilter(){
  invoiceFilter={from:'',to:'',clientId:''};
  $('f_client').value=''; $('f_from').value=''; $('f_to').value='';
  invQuery=''; $('invSearch').value='';
  renderInvoices();
}

/* Expenses CRUD */
function addExpense(){
  const desc=$('e_desc').value.trim();
  const amount=Number($('e_amount').value);
  const date=$('e_date').value || todayISO();
  if(!desc) return toast('اكتب وصف المصروف');
  if(!Number.isFinite(amount)||amount<=0) return toast('المبلغ لازم موجب');
  takeSnapshot();
  data.expenses.push({id:uid(), desc, amount, date});
  saveData();
  $('e_desc').value=''; $('e_amount').value=''; $('e_date').value='';
  renderAll(); toast('تمت إضافة مصروف ✅');
}
function editExpense(id){
  const ex=data.expenses.find(x=>x.id===id); if(!ex) return;
  const desc=prompt('تعديل الوصف:', ex.desc);
  if(desc===null) return;
  const d=desc.trim(); if(!d) return toast('الوصف فارغ');
  const aStr=prompt('تعديل المبلغ:', String(ex.amount));
  if(aStr===null) return;
  const a=Number(aStr); if(!Number.isFinite(a)||a<=0) return toast('المبلغ لازم موجب');
  const dt=prompt('تعديل التاريخ (YYYY-MM-DD):', ex.date || todayISO());
  if(dt===null) return;
  const date=dt.trim(); if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast('صيغة التاريخ غلط');
  takeSnapshot();
  ex.desc=d; ex.amount=a; ex.date=date;
  saveData(); renderAll(); toast('تم تعديل المصروف ✏️');
}
function deleteExpense(id){
  if(!confirm('حذف المصروف؟')) return;
  takeSnapshot();
  data.expenses=data.expenses.filter(x=>x.id!==id);
  saveData(); renderAll(); toast('تم حذف المصروف 🗑');
}

/* Render */
function renderAll(){
  renderClients();
  renderClientSelects();
  renderInvoices();
  renderExpenses();
  renderSummary();
}
function renderClients(){
  const tbody=$('clientRows');
  if(data.clients.length===0){
    tbody.innerHTML = `<tr><td colspan="4" class="muted">لا يوجد عملاء بعد.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.clients.map(c=>`
    <tr>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.phone||'—')}</td>
      <td>${escapeHtml(c.city||'—')}</td>
      <td>
        <div class="actions-cell">
          <button class="btn small ghost" data-ec="${c.id}">✏️</button>
          <button class="btn small ghost" style="border-color: rgba(255,59,48,.35); color: var(--danger);" data-dc="${c.id}">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-ec]').forEach(b=>b.addEventListener('click', ()=>editClient(b.dataset.ec)));
  tbody.querySelectorAll('[data-dc]').forEach(b=>b.addEventListener('click', ()=>deleteClient(b.dataset.dc)));
}
function renderClientSelects(){
  const sel=$('i_client');
  const fsel=$('f_client');
  if(data.clients.length===0){
    sel.innerHTML = `<option value="">لا يوجد عملاء</option>`;
    fsel.innerHTML = `<option value="">كل العملاء</option>`;
    return;
  }
  sel.innerHTML = `<option value="">اختر عميل...</option>` + data.clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  fsel.innerHTML = `<option value="">كل العملاء</option>` + data.clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}
function renderInvoices(){
  const tbody=$('invoiceRows');
  if(data.invoices.length===0){
    tbody.innerHTML = `<tr><td colspan="5" class="muted">لا توجد فواتير.</td></tr>`;
    if(window.renderMonthlyYearlyCharts) window.renderMonthlyYearlyCharts(data);
    return;
  }
  let list=[...data.invoices];
  if(invoiceFilter.clientId) list=list.filter(i=>i.clientId===invoiceFilter.clientId);
  if(invoiceFilter.from) list=list.filter(i=>(i.date||'')>=invoiceFilter.from);
  if(invoiceFilter.to) list=list.filter(i=>(i.date||'')<=invoiceFilter.to);
  if(invQuery) list=list.filter(i=>(i.desc||'').toLowerCase().includes(invQuery));
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const cmap=new Map(data.clients.map(c=>[c.id,c.name]));
  if(list.length===0){
    tbody.innerHTML = `<tr><td colspan="5" class="muted">لا توجد نتائج.</td></tr>`;
    if(window.renderMonthlyYearlyCharts) window.renderMonthlyYearlyCharts(data);
    return;
  }
  tbody.innerHTML = list.map(i=>`
    <tr>
      <td>${escapeHtml(cmap.get(i.clientId)||'—')}</td>
      <td>${escapeHtml(i.desc)}</td>
      <td>${money(i.amount)}</td>
      <td>${escapeHtml(i.date||'')}</td>
      <td>
        <div class="actions-cell">
          <button class="btn small ghost" data-ei="${i.id}">✏️</button>
          <button class="btn small ghost" style="border-color: rgba(255,59,48,.35); color: var(--danger);" data-di="${i.id}">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-ei]').forEach(b=>b.addEventListener('click', ()=>editInvoice(b.dataset.ei)));
  tbody.querySelectorAll('[data-di]').forEach(b=>b.addEventListener('click', ()=>deleteInvoice(b.dataset.di)));
  if(window.renderMonthlyYearlyCharts) window.renderMonthlyYearlyCharts(data);
}
function renderExpenses(){
  const tbody=$('expenseRows');
  if(data.expenses.length===0){
    tbody.innerHTML = `<tr><td colspan="4" class="muted">لا توجد مصروفات.</td></tr>`;
    if(window.renderMonthlyYearlyCharts) window.renderMonthlyYearlyCharts(data);
    return;
  }
  let list=[...data.expenses];
  if(expQuery) list=list.filter(e=>(e.desc||'').toLowerCase().includes(expQuery));
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(list.length===0){
    tbody.innerHTML = `<tr><td colspan="4" class="muted">لا توجد نتائج.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(e=>`
    <tr>
      <td>${escapeHtml(e.desc)}</td>
      <td>${money(e.amount)}</td>
      <td>${escapeHtml(e.date||'')}</td>
      <td>
        <div class="actions-cell">
          <button class="btn small ghost" data-ee="${e.id}">✏️</button>
          <button class="btn small ghost" style="border-color: rgba(255,59,48,.35); color: var(--danger);" data-de="${e.id}">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-ee]').forEach(b=>b.addEventListener('click', ()=>editExpense(b.dataset.ee)));
  tbody.querySelectorAll('[data-de]').forEach(b=>b.addEventListener('click', ()=>deleteExpense(b.dataset.de)));
  if(window.renderMonthlyYearlyCharts) window.renderMonthlyYearlyCharts(data);
}
function renderSummary(){
  const tin=data.invoices.reduce((s,x)=>s+(+x.amount||0),0);
  const tex=data.expenses.reduce((s,x)=>s+(+x.amount||0),0);
  const net=tin-tex;
  $('s_in').textContent=money(tin);
  $('s_ex').textContent=money(tex);
  $('s_net').textContent=money(net);
  $('s_net').style.color = net>0 ? '#34C759' : net<0 ? 'var(--danger)' : 'var(--text)';
}

/* CSV */
function exportAllCSV(){
  const cmap=new Map(data.clients.map(c=>[c.id,c.name]));
  const rows=[
    ['النوع','العميل','الوصف','المبلغ','التاريخ'],
    ...data.invoices.map(i=>['فاتورة',cmap.get(i.clientId)||'',i.desc,i.amount,i.date]),
    ...data.expenses.map(e=>['مصروف','',e.desc,e.amount,e.date])
  ];
  const line=(r)=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',');
  const csv=rows.map(line).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='accounts.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('تم التصدير CSV ✅');
}

/* Backup/Restore */
function backupJSON(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='ghadeer-accounts-backup.json'; a.click();
  URL.revokeObjectURL(url);
  toast('تم النسخ الاحتياطي ✅');
}
async function restoreJSON(){
  const file=$('restoreFile').files?.[0];
  if(!file) return toast('اختر ملف JSON أولاً');
  try{
    const txt=await file.text();
    const imported=JSON.parse(txt);
    if(!imported || !Array.isArray(imported.clients) || !Array.isArray(imported.invoices) || !Array.isArray(imported.expenses)){
      return toast('الملف مو بصيغة صحيحة');
    }
    takeSnapshot();
    data=imported;
    saveData(); renderAll();
    toast('تم الاسترجاع ✅');
  }catch{ toast('فشل قراءة الملف'); }
}

/* PDF (summary) */
function printSummaryPDF(){
  const tin=data.invoices.reduce((s,x)=>s+(+x.amount||0),0);
  const tex=data.expenses.reduce((s,x)=>s+(+x.amount||0),0);
  const net=tin-tex;
  const w=window.open('','_blank');
  w.document.write(`
  <html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير مالي</title>
  <style>
  body{font-family:-apple-system,Arial;background:#f5f5f7;margin:40px}
  .card{background:#fff;border-radius:22px;padding:24px}
  table{width:100%;border-collapse:collapse;margin-top:14px}
  th,td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:right}
  th{color:#6b7280}
  .net{font-weight:900;color:${net>=0?'#34C759':'#FF3B30'}}
  </style></head><body>
  <div class="card">
    <h1>📊 التقرير المالي</h1>
    <table>
      <tr><th>إجمالي الفواتير</th><td>${tin}</td></tr>
      <tr><th>إجمالي المصروفات</th><td>${tex}</td></tr>
      <tr><th>الصافي</th><td class="net">${net}</td></tr>
    </table>
  </div>
  <script>window.print()</script>
  </body></html>`);
  w.document.close();
}

/* PDF (full multi-section) */
function printFullReportPDF(){
  const w=window.open('','_blank');
  const tin=data.invoices.reduce((s,x)=>s+(+x.amount||0),0);
  const tex=data.expenses.reduce((s,x)=>s+(+x.amount||0),0);
  const net=tin-tex;

  const invRows = data.invoices.map(i=>`<tr><td>${escapeHtml(i.desc)}</td><td>${i.amount}</td><td>${escapeHtml(i.date||'')}</td></tr>`).join('');
  const expRows = data.expenses.map(e=>`<tr><td>${escapeHtml(e.desc)}</td><td>${e.amount}</td><td>${escapeHtml(e.date||'')}</td></tr>`).join('');

  w.document.write(`
  <html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير كامل</title>
  <style>
  body{font-family:-apple-system,Arial;background:#f5f5f7;margin:40px}
  .page{page-break-after:always}
  .card{background:#fff;border-radius:22px;padding:24px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-top:14px}
  th,td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:right}
  th{color:#6b7280}
  .net{font-weight:900;color:${net>=0?'#34C759':'#FF3B30'}}
  </style></head><body>
    <div class="page">
      <div class="card">
        <h1>📊 التقرير المالي</h1>
        <table>
          <tr><th>الدخل</th><td>${tin}</td></tr>
          <tr><th>المصروفات</th><td>${tex}</td></tr>
          <tr><th>الصافي</th><td class="net">${net}</td></tr>
        </table>
      </div>
    </div>

    <div class="page">
      <div class="card">
        <h2>🧾 الفواتير</h2>
        <table>
          <tr><th>الوصف</th><th>المبلغ</th><th>التاريخ</th></tr>
          ${invRows || '<tr><td colspan="3">لا توجد فواتير</td></tr>'}
        </table>
      </div>
    </div>

    <div class="page">
      <div class="card">
        <h2>💸 المصروفات</h2>
        <table>
          <tr><th>الوصف</th><th>المبلغ</th><th>التاريخ</th></tr>
          ${expRows || '<tr><td colspan="3">لا توجد مصروفات</td></tr>'}
        </table>
      </div>
    </div>

    <script>window.print()</script>
  </body></html>`);
  w.document.close();
}


/* Wallet-style card rendering (mobile) */
function renderClientCards(){
  const box=document.getElementById('clientCards'); if(!box) return;
  if(data.clients.length===0){
    box.innerHTML = `<div class="item-card"><div class="item-title">لا يوجد عملاء</div><div class="item-sub">ابدأ بإضافة عميل جديد.</div></div>`;
    return;
  }
  box.innerHTML = data.clients.map(c=>`
    <div class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(c.name)}</div>
          <div class="item-sub">${escapeHtml(c.phone||'—')} • ${escapeHtml(c.city||'—')}</div>
        </div>
        <div class="item-actions">
          <button class="btn small ghost" data-ec="${c.id}">✏️</button>
          <button class="btn small ghost" style="border-color: rgba(255,59,48,.35); color: var(--danger);" data-dc="${c.id}">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
  box.querySelectorAll('[data-ec]').forEach(b=>b.addEventListener('click', ()=>editClient(b.dataset.ec)));
  box.querySelectorAll('[data-dc]').forEach(b=>b.addEventListener('click', ()=>deleteClient(b.dataset.dc)));
}

function renderInvoiceCards(list){
  const box=document.getElementById('invoiceCards'); if(!box) return;
  const cmap=new Map(data.clients.map(c=>[c.id,c.name]));
  if(!list || list.length===0){
    box.innerHTML = `<div class="item-card"><div class="item-title">لا توجد فواتير</div><div class="item-sub">أضف فاتورة من الأعلى.</div></div>`;
    return;
  }
  box.innerHTML = list.map(i=>`
    <div class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(cmap.get(i.clientId)||'—')}</div>
          <div class="item-sub">${escapeHtml(i.desc)}</div>
          <div class="item-meta">
            <span class="pill">${money(i.amount)}</span>
            <span class="pill" style="background:rgba(107,114,128,.10);border-color:rgba(107,114,128,.18);color:var(--muted)">${escapeHtml(i.date||'')}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn small ghost" data-ei="${i.id}">✏️</button>
          <button class="btn small ghost" style="border-color: rgba(255,59,48,.35); color: var(--danger);" data-di="${i.id}">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
  box.querySelectorAll('[data-ei]').forEach(b=>b.addEventListener('click', ()=>editInvoice(b.dataset.ei)));
  box.querySelectorAll('[data-di]').forEach(b=>b.addEventListener('click', ()=>deleteInvoice(b.dataset.di)));
}

function renderExpenseCards(list){
  const box=document.getElementById('expenseCards'); if(!box) return;
  if(!list || list.length===0){
    box.innerHTML = `<div class="item-card"><div class="item-title">لا توجد مصروفات</div><div class="item-sub">أضف مصروف من الأعلى.</div></div>`;
    return;
  }
  box.innerHTML = list.map(e=>`
    <div class="item-card">
      <div class="item-head">
        <div>
          <div class="item-title">${escapeHtml(e.desc)}</div>
          <div class="item-meta">
            <span class="pill danger">${money(e.amount)}</span>
            <span class="pill" style="background:rgba(107,114,128,.10);border-color:rgba(107,114,128,.18);color:var(--muted)">${escapeHtml(e.date||'')}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn small ghost" data-ee="${e.id}">✏️</button>
          <button class="btn small ghost" style="border-color: rgba(255,59,48,.35); color: var(--danger);" data-de="${e.id}">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
  box.querySelectorAll('[data-ee]').forEach(b=>b.addEventListener('click', ()=>editExpense(b.dataset.ee)));
  box.querySelectorAll('[data-de]').forEach(b=>b.addEventListener('click', ()=>deleteExpense(b.dataset.de)));
}

/* Patch renderAll to include cards */
const _renderAll = renderAll;
renderAll = function(){
  _renderAll();
  renderClientCards();
};

/* Patch invoice/expense render to update cards too */
const _renderInvoices = renderInvoices;
renderInvoices = function(){
  const tbody=document.getElementById('invoiceRows');
  // run original which also updates charts
  _renderInvoices();
  // rebuild same filtered list for cards
  let list=[...data.invoices];
  if(invoiceFilter.clientId) list=list.filter(i=>i.clientId===invoiceFilter.clientId);
  if(invoiceFilter.from) list=list.filter(i=>(i.date||'')>=invoiceFilter.from);
  if(invoiceFilter.to) list=list.filter(i=>(i.date||'')<=invoiceFilter.to);
  if(invQuery) list=list.filter(i=>(i.desc||'').toLowerCase().includes(invQuery));
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  renderInvoiceCards(list);
};

const _renderExpenses = renderExpenses;
renderExpenses = function(){
  _renderExpenses();
  let list=[...data.expenses];
  if(expQuery) list=list.filter(e=>(e.desc||'').toLowerCase().includes(expQuery));
  list.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  renderExpenseCards(list);
};

/* Smooth tab open (force layout for transition) */
const _openTab = openTab;
openTab = function(id){
  _openTab(id);
  // force reflow so the transition starts nicely
  document.body.offsetHeight;
  window.scrollTo({top:0, behavior:'smooth'});
};


/* ===== Large Title shrink on scroll ===== */
document.addEventListener('scroll', ()=>{
  if(window.scrollY>20) document.body.classList.add('shrink');
  else document.body.classList.remove('shrink');
});

/* ===== Swipe Actions (basic) ===== */
function enableSwipe(){
  document.querySelectorAll('.item-card').forEach(card=>{
    let startX=0, dx=0;
    const content=card;
    card.addEventListener('touchstart', e=>{ startX=e.touches[0].clientX; }, {passive:true});
    card.addEventListener('touchmove', e=>{
      dx=e.touches[0].clientX-startX;
      if(dx<0 && dx>-120) content.style.transform=`translateX(${dx}px)`;
    }, {passive:true});
    card.addEventListener('touchend', ()=>{
      if(dx<-60) content.style.transform='translateX(-120px)';
      else content.style.transform='translateX(0)';
      dx=0;
    });
  });
}

/* hook after renders */
const _renderAll2 = renderAll;
renderAll = function(){
  _renderAll2();
  setTimeout(enableSwipe, 0);
};


/* ===== Theme Manager (All Presets) ===== */
(function(){
  const KEY='ga_theme_preset';
  const presets=['midnight','graphite','snow'];

  function apply(p){
    document.body.classList.remove('theme-midnight','theme-graphite','theme-snow');
    document.body.classList.add('theme-'+p);
    localStorage.setItem(KEY,p);
    // sync icon (moon/sun)
    const icon=document.getElementById('themeIcon');
    if(icon) icon.textContent = (p==='snow') ? '🌙' : '☀️';
  }

  const saved = localStorage.getItem(KEY);
  if(saved && presets.includes(saved)) apply(saved);
  else apply('midnight');

  // preset buttons
  document.querySelectorAll('.preset').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      tapFeedback();
      apply(btn.dataset.theme);
      toast('تم تغيير الثيم ✅');
    });
  });

  // override toggleTheme to cycle presets
  window.toggleTheme = function(){
    tapFeedback();
    const cur = localStorage.getItem(KEY) || 'midnight';
    const idx = presets.indexOf(cur);
    const next = presets[(idx+1)%presets.length];
    apply(next);
    toast('تم تبديل الثيم ✨');
  };

  // wire toggle button if present
  const tbtn=document.getElementById('themeToggle');
  if(tbtn){
    tbtn.addEventListener('click', (e)=>{
      e.preventDefault();
      window.toggleTheme();
    });
  }
})();


/* ===== LOCK THEME (WHITE ONLY) ===== */
(function(){
  localStorage.setItem('ga_theme_preset','midnight');
  window.toggleTheme = function(){
    toast('الثيم الداكن فقط 🔒');
  };
  document.querySelectorAll('.preset').forEach(b=>{
    b.disabled = true;
    b.style.opacity = .5;
  });
})();


/* ===== ULTRA INTERACTIONS ===== */
(function(){
  // Magnetic buttons
  document.querySelectorAll('.btn, .tabbar button').forEach(btn=>{
    btn.classList.add('magnetic');
    btn.addEventListener('mousemove', e=>{
      const r=btn.getBoundingClientRect();
      const x=(e.clientX-r.left-r.width/2)/8;
      const y=(e.clientY-r.top-r.height/2)/8;
      btn.style.transform=`translate(${x}px,${y}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{
      btn.style.transform='translate(0,0)';
    });
  });

  // Soft click sound (generated tone)
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  function clickSound(){
    const o=ctx.createOscillator();
    const g=ctx.createGain();
    o.frequency.value=880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.value=.05;
    o.start();
    setTimeout(()=>{ o.stop(); }, 60);
  }
  document.body.addEventListener('click', e=>{
    if(e.target.closest('button')){
      if(ctx.state==='suspended') ctx.resume();
      clickSound();
    }
  });
})();


/* ===== CINEMATIC LOGIC ===== */
// Smooth tab switch (extra delay for cinematic feel)
const _openTabCinema = openTab;
openTab = function(id){
  document.querySelectorAll('.pane').forEach(p=>p.classList.add('hidden'));
  setTimeout(()=>_openTabCinema(id), 120);
};

// Focus mode toggle (double tap header)
document.addEventListener('dblclick', e=>{
  if(e.target.closest('header')){
    document.body.classList.toggle('focus');
    toast(document.body.classList.contains('focus')?'وضع التركيز 🎯':'إلغاء التركيز');
  }
});


/* ===== CALM MODE LOGIC ===== */
// Disable cinematic openTab override if exists
if(typeof _openTabCinema !== 'undefined'){
  openTab = _openTabCinema;
}

// Disable focus mode
document.removeEventListener('dblclick', ()=>{});




/* ===== CLEAN NAVIGATION V2 ===== */
function openPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el=document.getElementById(id);
  if(el) el.classList.add('active');
  document.querySelectorAll('.tabbar button').forEach(b=>{
    b.classList.toggle('active', b.dataset.tab===id);
  });
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.tabbar button').forEach(btn=>{
    btn.onclick=()=>openPage(btn.dataset.tab);
  });
  openPage('clients');
});
