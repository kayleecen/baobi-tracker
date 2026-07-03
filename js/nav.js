// nav.js -- bottom nav / page switching
// ================= 导航 =================
function go(i){
  ['pageHome','pageRecord','pageReport','pageSet'].forEach((id,j)=>
    document.getElementById(id).className = 'page'+(i===j?' on':''));
  [0,1,2,3].forEach(j=>
    document.getElementById('nav'+j).className = i===j?'on':'');
  if (i===2) renderReport();
}
