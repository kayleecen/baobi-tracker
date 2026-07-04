// calendar.js -- report-page monthly calendar grid
// ================= 日历 =================
function shiftMonth(delta){
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth()+delta, 1);
  renderCalendar();
}
function jumpToday(){
  const t = new Date();
  calMonth = new Date(t.getFullYear(), t.getMonth(), 1);
  selectedDate = t;
  renderCalendar(); renderDayDetail();
}
function selectDay(y,m,d){
  const target = new Date(y,m,d);
  const changedMonth = (m!==calMonth.getMonth() || y!==calMonth.getFullYear());
  selectedDate = target;
  if (changedMonth) calMonth = new Date(y,m,1);
  renderCalendar(); renderDayDetail();
}
function renderCalendar(){
  document.getElementById('calLabel').textContent = calMonth.getFullYear()+'年'+(calMonth.getMonth()+1)+'月';
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const firstWeekday = new Date(y,m,1).getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const daysInPrev = new Date(y,m,0).getDate();
  const pm = m===0 ? 11 : m-1, py = m===0 ? y-1 : y;
  const nm = m===11 ? 0 : m+1, ny = m===11 ? y+1 : y;
  const today = new Date();
  const cells = [];
  for (let i=0; i<firstWeekday; i++){
    cells.push({y:py,m:pm,d:daysInPrev-firstWeekday+1+i,muted:true});
  }
  for (let d=1; d<=daysInMonth; d++) cells.push({y,m,d,muted:false});
  const remainder = (7 - cells.length % 7) % 7;
  for (let d=1; d<=remainder; d++) cells.push({y:ny,m:nm,d,muted:true});

  const grid = document.getElementById('calGrid');
  grid.innerHTML = cells.map(c=>{
    const k = c.y+'-'+String(c.m+1).padStart(2,'0')+'-'+String(c.d).padStart(2,'0');
    const ml = dayTotalMl(k);
    const isToday = c.y===today.getFullYear() && c.m===today.getMonth() && c.d===today.getDate();
    const isSel = c.y===selectedDate.getFullYear() && c.m===selectedDate.getMonth() && c.d===selectedDate.getDate();
    const cls = ['cal-cell'];
    if (c.muted) cls.push('muted');
    if (isToday) cls.push('today');
    if (isSel) cls.push('sel');
    return `<button class="${cls.join(' ')}" onclick="selectDay(${c.y},${c.m},${c.d})">
      <span class="d">${c.d}</span>
      ${ml>0 ? `<span class="m"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9.5" y="2" width="5" height="3" rx="1"/><path d="M8 8.5L9.5 5M16 8.5L14.5 5"/><rect x="8" y="8.5" width="8" height="12.5" rx="3"/><path d="M8 14h8"/></svg>${ml}</span>` : ''}
    </button>`;
  }).join('');
}

