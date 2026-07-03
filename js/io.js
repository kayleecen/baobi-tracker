// io.js -- data export/import
// ================= 导出/导入 =================
function exportData(){
  const t = JSON.stringify(loadAll());
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(()=>alert('数据已复制,发给家人粘贴导入即可'));
  else prompt('长按复制以下内容:', t);
}
function importData(){
  try {
    const t = document.getElementById('importBox').value.trim();
    if (!t) { alert('请先粘贴数据'); return; }
    const incoming = JSON.parse(t);
    saveAll(mergeData(loadAll(), incoming));
    document.getElementById('importBox').value='';
    alert('导入成功'); masterRender(); renderReport(); scheduleSync();
  } catch(e){ alert('数据格式不对,请确认粘贴完整'); }
}

