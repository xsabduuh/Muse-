/* =====================================================
   منظم حياتي — تطبيق شخصي: عادات + مالية + تنظيم وقت
   حفظ تلقائي في localStorage (يعمل على GitHub Pages)
   ===================================================== */

// ---------- أدوات ----------
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parseD = ds => { const [y,m,d] = ds.split('-').map(Number); return new Date(y, m-1, d); };
const dstr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => dstr(new Date());
const addDays = (ds, n) => { const d = parseD(ds); d.setDate(d.getDate()+n); return dstr(d); };
const fmtM = n => Number(n||0).toLocaleString('fr-FR') + ' درهم';
const fmtDateAr = ds => parseD(ds).toLocaleDateString('ar-MA', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
const monthKey = ds => ds.slice(0,7);
const monthNameAr = mk => parseD(mk+'-01').toLocaleDateString('ar-MA', {month:'long', year:'numeric'});

// ---------- التخزين ----------
const KEY = 'munazim_data_v1';
const store = {
  data: null,
  load(){
    try { this.data = JSON.parse(localStorage.getItem(KEY)); } catch(e){ this.data = null; }
    if(!this.data || typeof this.data !== 'object')
      this.data = { habits:[], transactions:[], budgets:[], blocks:[] };
  },
  save(){ localStorage.setItem(KEY, JSON.stringify(this.data)); }
};

const state = { view:'dashboard', finMonth: todayStr().slice(0,7) };

// ---------- التنقل ----------
function navigate(view){
  state.view = view;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-'+view));
  render();
}
$$('.nav-btn').forEach(b => b.addEventListener('click', () => navigate(b.dataset.view)));

// ---------- نافذة منبثقة + تنبيه ----------
function openModal(html){
  $('#modal-box').innerHTML = html;
  $('#modal-backdrop').hidden = false;
}
function closeModal(){ $('#modal-backdrop').hidden = true; $('#modal-box').innerHTML=''; }
$('#modal-backdrop').addEventListener('click', e => { if(e.target.id==='modal-backdrop') closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

let toastT;
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(()=> t.hidden = true, 2200);
}

// =====================================================
//  لوحة التحكم
// =====================================================
function greeting(){
  const h = new Date().getHours();
  if(h < 12) return 'صباح الخير';
  if(h < 18) return 'مساء الخير';
  return 'مساء النور';
}
function renderDashboard(){
  const t = todayStr();
  const habits = store.data.habits;
  const doneToday = habits.filter(h => h.log && h.log[t]).length;
  const blocks = store.data.blocks
    .filter(b => b.day === (new Date().getDay()+6)%7)
    .sort((a,b) => a.start.localeCompare(b.start));
  const mk = state.finMonth;
  const txns = store.data.transactions.filter(x => monthKey(x.date) === mk);
  const inc = txns.filter(x=>x.type==='income').reduce((s,x)=>s+ +x.amount,0);
  const exp = txns.filter(x=>x.type==='expense').reduce((s,x)=>s+ +x.amount,0);

  $('#view-dashboard').innerHTML = `
    <div class="page-head">
      <div><h1>${greeting()} 👋</h1><p>${fmtDateAr(t)}</p></div>
    </div>
    <div class="grid c4">
      <div class="card"><div class="kpi-label">عادات اليوم</div><div class="num acc">${doneToday}/${habits.length}</div><div class="small muted">عادة منجزة</div></div>
      <div class="card"><div class="kpi-label">مهام اليوم</div><div class="num acc">${blocks.length}</div><div class="small muted">في الجدول</div></div>
      <div class="card"><div class="kpi-label">مداخيل ${monthNameAr(mk)}</div><div class="num ok">${fmtM(inc)}</div></div>
      <div class="card"><div class="kpi-label">مصاريف ${monthNameAr(mk)}</div><div class="num bad">${fmtM(exp)}</div><div class="small muted">المتبقي: ${fmtM(inc-exp)}</div></div>
    </div>
    <div class="grid c2" style="margin-top:16px">
      <div class="card">
        <h3>✅ عادات اليوم</h3>
        ${habits.length ? `<div class="check-list">` + habits.map(h=>`
          <div class="check-item">
            <button class="habit-check ${h.log&&h.log[t]?'done':''}" onclick="toggleHabit('${h.id}')">✓</button>
            <span>${esc(h.name)}</span>
            <span class="streak" style="margin-inline-start:auto">🔥 ${streakOf(h)}</span>
          </div>`).join('') + `</div>`
        : `<div class="empty-box"><span class="big">🌱</span>ما زال ما ضفتي حتى عادة.<br><button class="btn sm" style="margin-top:10px" onclick="navigate('habits')">زيد عادة</button></div>`}
      </div>
      <div class="card">
        <h3>🕐 برنامج اليوم</h3>
        ${blocks.length ? blocks.map(b=>`
          <div class="block ${b.cat}"><span class="t">${esc(b.title)}</span><span class="h">${b.start} – ${b.end} · ${catName(b.cat)}</span></div>`).join('')
        : `<div class="empty-box"><span class="big">🗓️</span>ما كاين حتى مهمة اليوم.<br><button class="btn sm" style="margin-top:10px" onclick="navigate('schedule')">نظم وقتك</button></div>`}
      </div>
    </div>`;
}

// =====================================================
//  العادات
// =====================================================
function streakOf(h){
  let s = 0;
  let day = (h.log && h.log[todayStr()]) ? todayStr() : addDays(todayStr(), -1);
  while(h.log && h.log[day]){ s++; day = addDays(day, -1); }
  return s;
}
function renderHabits(){
  const t = todayStr();
  const list = store.data.habits;
  $('#view-habits').innerHTML = `
    <div class="page-head">
      <div><h1>العادات</h1><p>علّم كل نهار، والسلسلة غتكبر نهار على نهار 🔥</p></div>
      <button class="btn" onclick="habitForm()">+ عادة جديدة</button>
    </div>
    ${list.length ? list.map(h=>{
      const days = [];
      for(let i=6;i>=0;i--){
        const ds = addDays(t,-i);
        const v = h.log && h.log[ds];
        days.push(`<span class="dot ${v?'ok':''} ${ds===t?'today':''}" title="${ds}">${parseD(ds).getDate()}</span>`);
      }
      return `<div class="habit">
        <button class="habit-check ${h.log&&h.log[t]?'done':''}" onclick="toggleHabit('${h.id}')" title="علّم اليوم">✓</button>
        <div class="habit-info">
          <div><b>${esc(h.name)}</b><span class="tag ${h.type==='quit'?'quit':''}">${h.type==='quit'?'إقلاع':'بناء'}</span></div>
          <div class="dots">${days.join('')}</div>
        </div>
        <div style="text-align:center"><div class="streak">🔥 ${streakOf(h)}</div><div class="small muted">أيام</div></div>
        <button class="icon-btn" onclick="delHabit('${h.id}')" title="حذف">🗑</button>
      </div>`;
    }).join('')
    : `<div class="empty-box"><span class="big">🌱</span>ابدأ بأول عادة ديالك.<br>مثال: الإقلاع عن التدخين، القراءة اليومية، الرياضة...</div>`}`;
}
function toggleHabit(id){
  const h = store.data.habits.find(x=>x.id===id); if(!h) return;
  h.log = h.log || {};
  const t = todayStr();
  if(h.log[t]) delete h.log[t]; else h.log[t] = true;
  store.save(); render();
  if(h.log[t]) toast('أحسنت! نهار موفق 🎉');
}
function habitForm(){
  openModal(`
    <h2>عادة جديدة</h2>
    <div class="field"><label>اسم العادة</label><input id="f-hname" placeholder="مثال: بلا تدخين"></div>
    <div class="field"><label>النوع</label>
      <select id="f-htype"><option value="quit">إقلاع عن شيء</option><option value="build">بناء عادة جديدة</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="saveHabit()">حفظ</button>
      <button class="btn sec" onclick="closeModal()">إلغاء</button>
    </div>`);
}
function saveHabit(){
  const name = $('#f-hname').value.trim();
  if(!name){ toast('كتب اسم العادة'); return; }
  store.data.habits.push({id:uid(), name, type:$('#f-htype').value, startDate:todayStr(), log:{}});
  store.save(); closeModal(); render(); toast('تزادت العادة ✅');
}
function delHabit(id){
  if(!confirm('تحذف هاد العادة؟')) return;
  store.data.habits = store.data.habits.filter(x=>x.id!==id);
  store.save(); render(); toast('تحذفات');
}

// =====================================================
//  المالية
// =====================================================
function renderFinance(){
  const mk = state.finMonth;
  const txns = store.data.transactions
    .filter(x => monthKey(x.date) === mk)
    .sort((a,b) => b.date.localeCompare(a.date));
  const inc = txns.filter(x=>x.type==='income').reduce((s,x)=>s+ +x.amount,0);
  const exp = txns.filter(x=>x.type==='expense').reduce((s,x)=>s+ +x.amount,0);

  // مصاريف حسب الصنف
  const byCat = {};
  txns.filter(x=>x.type==='expense').forEach(x=>{
    byCat[x.category] = (byCat[x.category]||0) + +x.amount;
  });
  const cats = Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]);
  const maxCat = Math.max(1, ...Object.values(byCat));

  // تقدم الميزانية
  const budgets = store.data.budgets.map(b=>{
    const spent = byCat[b.category] || 0;
    const pct = b.limit > 0 ? Math.min(100, Math.round(spent / b.limit * 100)) : 0;
    return {...b, spent, pct, over: spent > b.limit && b.limit > 0};
  });

  $('#view-finance').innerHTML = `
    <div class="page-head">
      <div><h1>المالية</h1><p>تتبع مداخيلك ومصاريفك شهر بشهر</p></div>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <button class="btn sec" onclick="budgetForm()">🎯 ميزانية</button>
        <button class="btn" onclick="txnForm()">+ عملية جديدة</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="month-nav">
        <button class="btn sec sm" onclick="finNav(-1)">→</button>
        <b>${monthNameAr(mk)}</b>
        <button class="btn sec sm" onclick="finNav(1)">←</button>
      </div>
    </div>
    <div class="grid c3">
      <div class="card"><div class="kpi-label">المداخيل</div><div class="num ok">${fmtM(inc)}</div></div>
      <div class="card"><div class="kpi-label">المصاريف</div><div class="num bad">${fmtM(exp)}</div></div>
      <div class="card"><div class="kpi-label">المتبقي</div><div class="num ${inc-exp>=0?'ok':'bad'}">${fmtM(inc-exp)}</div></div>
    </div>
    <div class="grid c2" style="margin-top:16px">
      <div class="card">
        <h3>📊 المصاريف حسب الصنف</h3>
        ${cats.length ? cats.map(c=>`
          <div class="bar-row">
            <div class="bar-top"><span>${esc(c)}</span><b>${fmtM(byCat[c])}</b></div>
            <div class="bar"><i style="width:${Math.round(byCat[c]/maxCat*100)}%"></i></div>
          </div>`).join('')
        : `<p class="muted">ما كاين حتى مصروف هاد الشهر.</p>`}
      </div>
      <div class="card">
        <h3>🎯 الميزانية</h3>
        ${budgets.length ? budgets.map(b=>`
          <div class="bar-row">
            <div class="bar-top"><span>${esc(b.category)} <button class="icon-btn" onclick="delBudget('${b.id}')" title="حذف">🗑</button></span><b>${fmtM(b.spent)} / ${fmtM(b.limit)}</b></div>
            <div class="bar ${b.over?'over':''}"><i style="width:${b.pct}%"></i></div>
            ${b.over?'<div class="small" style="color:var(--bad)">تجاوزتي الميزانية!</div>':''}
          </div>`).join('')
        : `<p class="muted">حدد ميزانية لكل صنف باش تتحكم في مصاريفك.</p>`}
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>🧾 العمليات</h3>
      ${txns.length ? txns.map(x=>`
        <div class="txn">
          <div class="txn-amt ${x.type==='income'?'in':'out'}">${x.type==='income'?'+':'−'} ${fmtM(x.amount)}</div>
          <div style="flex:1"><div>${esc(x.note||'—')}</div><div class="small muted">${x.date}</div></div>
          <span class="txn-cat">${esc(x.category)}</span>
          <button class="icon-btn" onclick="delTxn('${x.id}')" title="حذف">🗑</button>
        </div>`).join('')
      : `<p class="muted">ما كاين حتى عملية هاد الشهر.</p>`}
    </div>`;
}
function finNav(d){
  const [y,m] = state.finMonth.split('-').map(Number);
  const dt = new Date(y, m-1+d, 1);
  state.finMonth = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
  render();
}
function txnForm(){
  openModal(`
    <h2>عملية جديدة</h2>
    <div class="field-row">
      <div class="field"><label>النوع</label>
        <select id="f-ttype"><option value="expense">مصروف</option><option value="income">مدخول</option></select></div>
      <div class="field"><label>المبلغ (درهم)</label><input id="f-tamt" type="number" min="0" step="1" placeholder="0"></div>
    </div>
    <div class="field"><label>الصنف</label><input id="f-tcat" placeholder="مثال: النقل، الماكلة..." list="cats-list">
      <datalist id="cats-list">${[...new Set(store.data.transactions.map(x=>x.category))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
    <div class="field-row">
      <div class="field"><label>التاريخ</label><input id="f-tdate" type="date" value="${todayStr()}"></div>
      <div class="field"><label>ملاحظة</label><input id="f-tnote" placeholder="اختياري"></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="saveTxn()">حفظ</button>
      <button class="btn sec" onclick="closeModal()">إلغاء</button>
    </div>`);
}
function saveTxn(){
  const amount = parseFloat($('#f-tamt').value);
  const category = $('#f-tcat').value.trim() || 'عام';
  if(!(amount > 0)){ toast('دخل مبلغ صحيح'); return; }
  store.data.transactions.push({
    id:uid(), type:$('#f-ttype').value, amount,
    category, date:$('#f-tdate').value || todayStr(),
    note:$('#f-tnote').value.trim()
  });
  store.save(); closeModal(); render(); toast('تسجلات العملية ✅');
}
function delTxn(id){
  if(!confirm('تحذف هاد العملية؟')) return;
  store.data.transactions = store.data.transactions.filter(x=>x.id!==id);
  store.save(); render();
}
function budgetForm(){
  openModal(`
    <h2>ميزانية صنف</h2>
    <div class="field"><label>الصنف</label><input id="f-bcat" placeholder="مثال: النقل"></div>
    <div class="field"><label>السقف الشهري (درهم)</label><input id="f-blim" type="number" min="0" step="1" placeholder="0"></div>
    <div class="modal-actions">
      <button class="btn" onclick="saveBudget()">حفظ</button>
      <button class="btn sec" onclick="closeModal()">إلغاء</button>
    </div>`);
}
function saveBudget(){
  const category = $('#f-bcat').value.trim();
  const limit = parseFloat($('#f-blim').value);
  if(!category || !(limit >= 0)){ toast('عمّر الخانات'); return; }
  const ex = store.data.budgets.find(b=>b.category===category);
  if(ex) ex.limit = limit; else store.data.budgets.push({id:uid(), category, limit});
  store.save(); closeModal(); render(); toast('تسجلات الميزانية 🎯');
}
function delBudget(id){
  store.data.budgets = store.data.budgets.filter(x=>x.id!==id);
  store.save(); render();
}

// =====================================================
//  تنظيم الوقت
// =====================================================
const DAYS = ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد'];
const CATS = { work:'العمل', study:'الدراسة', reading:'القراءة', other:'أخرى' };
const catName = c => CATS[c] || c;

function renderSchedule(){
  const todayIdx = (new Date().getDay()+6)%7;
  $('#view-schedule').innerHTML = `
    <div class="page-head">
      <div><h1>تنظيم الوقت</h1><p>قسم أسبوعك: العمل، الدراسة، القراءة...</p></div>
      <button class="btn" onclick="blockForm()">+ مهمة جديدة</button>
    </div>
    <div class="week">
      ${DAYS.map((d,i)=>{
        const blocks = store.data.blocks.filter(b=>b.day===i).sort((a,b)=>a.start.localeCompare(b.start));
        return `<div class="day-col ${i===todayIdx?'today':''}">
          <h4>${d}</h4>
          ${blocks.length ? blocks.map(b=>`
            <div class="block ${b.cat}" onclick="blockForm('${b.id}')" title="اضغط للتعديل">
              <span class="t">${esc(b.title)}</span>
              <span class="h">${b.start} – ${b.end} · ${catName(b.cat)}</span>
            </div>`).join('')
          : `<p class="small muted" style="text-align:center">—</p>`}
        </div>`;
      }).join('')}
    </div>`;
}
function blockForm(id){
  const b = id ? store.data.blocks.find(x=>x.id===id) : null;
  openModal(`
    <h2>${b?'تعديل المهمة':'مهمة جديدة'}</h2>
    <div class="field"><label>العنوان</label><input id="f-btitle" value="${esc(b?.title||'')}" placeholder="مثال: الخدمة، مراجعة دروس..."></div>
    <div class="field-row">
      <div class="field"><label>اليوم</label>
        <select id="f-bday">${DAYS.map((d,i)=>`<option value="${i}" ${b&&b.day===i?'selected':''}>${d}</option>`).join('')}</select></div>
      <div class="field"><label>الصنف</label>
        <select id="f-bcat">${Object.keys(CATS).map(c=>`<option value="${c}" ${b&&b.cat===c?'selected':''}>${CATS[c]}</option>`).join('')}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>من</label><input id="f-bstart" type="time" value="${b?.start||'09:00'}"></div>
      <div class="field"><label>إلى</label><input id="f-bend" type="time" value="${b?.end||'10:00'}"></div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="saveBlock('${b?.id||''}')">حفظ</button>
      ${b?`<button class="btn danger" onclick="delBlock('${b.id}')">حذف</button>`:''}
      <button class="btn sec" onclick="closeModal()">إلغاء</button>
    </div>`);
}
function saveBlock(id){
  const title = $('#f-btitle').value.trim();
  const start = $('#f-bstart').value, end = $('#f-bend').value;
  if(!title){ toast('كتب عنوان المهمة'); return; }
  if(start >= end){ toast('وقت البداية خاصو يكون قبل النهاية'); return; }
  const data = { title, day:+$('#f-bday').value, cat:$('#f-bcat').value, start, end };
  if(id){
    Object.assign(store.data.blocks.find(x=>x.id===id), data);
  } else {
    store.data.blocks.push({id:uid(), ...data});
  }
  store.save(); closeModal(); render(); toast('تسجلات ✅');
}
function delBlock(id){
  if(!confirm('تحذف هاد المهمة؟')) return;
  store.data.blocks = store.data.blocks.filter(x=>x.id!==id);
  store.save(); closeModal(); render();
}

// =====================================================
//  نسخة احتياطية
// =====================================================
$('#btn-export').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(store.data, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'munazim-backup-' + todayStr() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('تحملات النسخة الاحتياطية 💾');
});
$('#btn-import').addEventListener('click', ()=> $('#file-import').click());
$('#file-import').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    try{
      const d = JSON.parse(r.result);
      if(!d.habits || !d.transactions) throw 0;
      if(!confirm('غتعوض البيانات الحالية بالنسخة المسترجعة. متأكد؟')) return;
      store.data = d; store.save(); render(); toast('ترجعات البيانات ✅');
    }catch(err){ toast('ملف غير صالح'); }
  };
  r.readAsText(f);
  e.target.value = '';
});

// ---------- تشغيل ----------
function render(){
  ({dashboard:renderDashboard, habits:renderHabits, finance:renderFinance, schedule:renderSchedule})[state.view]();
}
store.load();
render();
