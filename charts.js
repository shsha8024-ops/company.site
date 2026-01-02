'use strict';
let _m=null, _y=null;

function monthKey(dateStr){
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr||'') ? dateStr.slice(0,7) : null;
}
function yearKey(dateStr){
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr||'') ? dateStr.slice(0,4) : null;
}

function renderMonthlyYearlyCharts(data){
  const monthly=new Map();
  const yearly=new Map();

  data.invoices.forEach(i=>{
    const mk=monthKey(i.date), yk=yearKey(i.date);
    if(mk) monthly.set(mk,(monthly.get(mk)||0)+(+i.amount||0));
    if(yk) yearly.set(yk,(yearly.get(yk)||0)+(+i.amount||0));
  });
  data.expenses.forEach(e=>{
    const mk=monthKey(e.date), yk=yearKey(e.date);
    if(mk) monthly.set(mk,(monthly.get(mk)||0)-(+e.amount||0));
    if(yk) yearly.set(yk,(yearly.get(yk)||0)-(+e.amount||0));
  });

  const mLabels=[...monthly.keys()].sort();
  const mValues=mLabels.map(k=>monthly.get(k));
  const yLabels=[...yearly.keys()].sort();
  const yValues=yLabels.map(k=>yearly.get(k));

  _m = draw('monthlyChart','الأرباح الشهرية', mLabels, mValues, _m);
  _y = draw('yearlyChart','الأرباح السنوية', yLabels, yValues, _y);
}

function draw(id,label,labels,values,old){
  const el=document.getElementById(id);
  if(!el) return old;
  if(old) old.destroy();

  const safeLabels = labels.length ? labels : ['—'];
  const safeValues = values.length ? values : [0];

  return new Chart(el.getContext('2d'),{
    type:'bar',
    data:{
      labels:safeLabels,
      datasets:[{
        label,
        data:safeValues,
        backgroundColor:safeValues.map(v => (Number(v)||0) >= 0 ? 'rgba(10,132,255,.55)' : 'rgba(255,59,48,.55)'),
        borderColor:safeValues.map(v => (Number(v)||0) >= 0 ? 'rgba(10,132,255,1)' : 'rgba(255,59,48,1)'),
        borderWidth:1,
        borderRadius:10
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{ legend:{ display:true } },
      scales:{ y:{ beginAtZero:true } }
    }
  });
}

window.renderMonthlyYearlyCharts = renderMonthlyYearlyCharts;
