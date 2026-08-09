// sleep.js -- sleep intervals (start/end), including historical editing
let editingSleepIndex = null;
let editingSleepDayKey = null;

function sleepStartAt(rec){ return rec.startAt || rec.at || ''; }
function sleepEndAt(rec){
  if (rec.endAt) return rec.endAt;
  // Keep existing start + minutes records readable without changing them.
  if (rec.at && rec.minutes) {
    const [h,m] = rec.at.split(':').map(Number);
    const end = new Date(2000, 0, 1, h, m + Number(rec.minutes));
    return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
  }
  return '';
}
function sleepMinutes(rec){
  const start = sleepStartAt(rec), end = sleepEndAt(rec);
  if (!start || !end) return null;
  const [sh,sm] = start.split(':').map(Number), [eh,em] = end.split(':').map(Number);
  let total = (eh * 60 + em) - (sh * 60 + sm);
  if (total < 0) total += 24 * 60;
  return total;
}
function sleepDurationText(rec){
  const minutes = sleepMinutes(rec);
  if (minutes === null) return '睡眠中';
  return `${Math.floor(minutes / 60)}小时${minutes % 60}分钟`;
}
function startSleep(){
  const data = getDay(dayKey());
  data.sleeps.push({ startAt: nowHM(), endAt: '', ts: Date.now() });
  setDay(dayKey(), data); masterRender(); scheduleSync();
}
function openSleepSheet(){
  editingSleepIndex = null;
  editingSleepDayKey = null;
  document.getElementById('sleepSheetTitle').textContent = '记录睡觉';
  document.getElementById('sleepStartInput').value = nowHM();
  document.getElementById('sleepEndInput').value = '';
  document.getElementById('sleepDeleteBtn').style.display = 'none';
  document.getElementById('sleepOverlay').classList.add('show');
}
function editSleep(i, recordDayKey){
  const k = recordDayKey || dayKey(), data = getDay(k), rec = data.sleeps[i];
  if (!rec) return;
  editingSleepIndex = i;
  editingSleepDayKey = k;
  document.getElementById('sleepSheetTitle').textContent = '编辑睡觉记录';
  document.getElementById('sleepStartInput').value = sleepStartAt(rec);
  document.getElementById('sleepEndInput').value = sleepEndAt(rec);
  document.getElementById('sleepDeleteBtn').style.display = 'block';
  document.getElementById('sleepOverlay').classList.add('show');
}
function closeSleepSheet(){ document.getElementById('sleepOverlay').classList.remove('show'); }
function saveSleep(){
  const startAt = document.getElementById('sleepStartInput').value || nowHM();
  const endAt = document.getElementById('sleepEndInput').value || '';
  const k = editingSleepDayKey || dayKey(), data = getDay(k);
  if (editingSleepIndex !== null && data.sleeps[editingSleepIndex]) {
    Object.assign(data.sleeps[editingSleepIndex], { startAt, endAt });
  } else {
    data.sleeps.push({ startAt, endAt, ts: Date.now() });
  }
  setDay(k, data); closeSleepSheet(); masterRender(); scheduleSync();
}
function finishSleep(i, recordDayKey){
  const k = recordDayKey || dayKey(), data = getDay(k), rec = data.sleeps[i];
  if (!rec) return;
  rec.startAt = sleepStartAt(rec);
  rec.endAt = nowHM();
  setDay(k, data); masterRender(); scheduleSync();
}
function deleteSleepFromSheet(){
  if (editingSleepIndex === null) return;
  const k = editingSleepDayKey || dayKey(), data = getDay(k);
  const removed = data.sleeps.splice(editingSleepIndex, 1)[0];
  setDay(k, data); tombstone(removed); closeSleepSheet(); masterRender(); scheduleSync();
}
