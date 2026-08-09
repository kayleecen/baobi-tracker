// sleep.js -- sleep records (start time + duration), including historical editing
let editingSleepIndex = null;
let editingSleepDayKey = null;

function openSleepSheet(){
  editingSleepIndex = null;
  editingSleepDayKey = null;
  document.getElementById('sleepSheetTitle').textContent = '记录睡觉';
  document.getElementById('sleepTimeInput').value = nowHM();
  document.getElementById('sleepMinutesInput').value = '';
  document.getElementById('sleepDeleteBtn').style.display = 'none';
  document.getElementById('sleepOverlay').classList.add('show');
}
function editSleep(i, recordDayKey){
  const k = recordDayKey || dayKey(), data = getDay(k), rec = data.sleeps[i];
  if (!rec) return;
  editingSleepIndex = i;
  editingSleepDayKey = k;
  document.getElementById('sleepSheetTitle').textContent = '编辑睡觉记录';
  document.getElementById('sleepTimeInput').value = rec.at;
  document.getElementById('sleepMinutesInput').value = rec.minutes || '';
  document.getElementById('sleepDeleteBtn').style.display = 'block';
  document.getElementById('sleepOverlay').classList.add('show');
}
function closeSleepSheet(){ document.getElementById('sleepOverlay').classList.remove('show'); }
function saveSleep(){
  const at = document.getElementById('sleepTimeInput').value || nowHM();
  const minutes = Math.max(0, parseInt(document.getElementById('sleepMinutesInput').value, 10) || 0);
  const k = editingSleepDayKey || dayKey(), data = getDay(k);
  if (editingSleepIndex !== null && data.sleeps[editingSleepIndex]) {
    Object.assign(data.sleeps[editingSleepIndex], { at, minutes });
  } else {
    data.sleeps.push({ at, minutes, ts: Date.now() });
  }
  setDay(k, data); closeSleepSheet(); masterRender(); scheduleSync();
}
function deleteSleepFromSheet(){
  if (editingSleepIndex === null) return;
  const k = editingSleepDayKey || dayKey(), data = getDay(k);
  const removed = data.sleeps.splice(editingSleepIndex, 1)[0];
  setDay(k, data); tombstone(removed); closeSleepSheet(); masterRender(); scheduleSync();
}
