// app.js -- app bootstrap: masterRender() orchestrator + startup calls (loads LAST)
// ================= 总渲染入口 =================
function masterRender(){
  updateHeader();
  updateBanner();
  renderCalendar();
  renderDayDetail();
  renderRecordLists();
  renderYesterdaySummary();
  renderFamilyNote();
}


masterRender();
fillProfileInputs();
renderSyncUI();
syncNow(false);
setInterval(masterRender, 60000);
setInterval(()=>syncNow(false), 180000);
