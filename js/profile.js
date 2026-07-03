// profile.js -- baby profile card (age/weight/height) feature module
// ================= 宝宝档案(月龄 · 体重 · 身高) =================
const PROFILE_KEY = 'baobi_profile_v1';
function loadProfile(){
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {} }
  catch(e){ return {} }
}
function saveProfile(p){
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) } catch(e){}
}
function saveBabyProfile(){
  const p = loadProfile();
  const b = document.getElementById('babyBirthday').value;
  const w = document.getElementById('babyWeight').value;
  const h = document.getElementById('babyHeight').value;
  if (b) p.birthday = b;
  if (w) p.weight = w;
  if (h) p.height = h;
  saveProfile(p);
  updateBabyCard();
  alert('已保存宝比档案');
}
function fillProfileInputs(){
  const p = loadProfile();
  if (p.birthday) document.getElementById('babyBirthday').value = p.birthday;
  if (p.weight) document.getElementById('babyWeight').value = p.weight;
  if (p.height) document.getElementById('babyHeight').value = p.height;
}
function updateBabyCard(){
  const p = loadProfile();
  const ageEl = document.getElementById('bcAge');
  const whEl = document.getElementById('bcWH');
  if (!ageEl || !whEl) return;
  if (p.birthday) {
    const b = new Date(p.birthday+'T00:00:00');
    const n = new Date();
    let months = (n.getFullYear()-b.getFullYear())*12 + (n.getMonth()-b.getMonth());
    let days = n.getDate() - b.getDate();
    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(n.getFullYear(), n.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }
    if (months < 0) { months = 0; days = Math.max(days,0); }
    ageEl.textContent = `宝比 ${months}个月${days}天`;
  } else {
    ageEl.textContent = '宝比 --';
  }
  const wTxt = p.weight ? `${p.weight}kg` : '--';
  const hTxt = p.height ? `${p.height}cm` : '--';
  whEl.textContent = `体重 ${wTxt} · 身高 ${hTxt}`;
}
function updateHeader(){
  const n = new Date();
  document.getElementById('todayStr').textContent =
    (n.getMonth()+1)+'月'+n.getDate()+'日 · 宝比今天也要健康长大呀';
  updateBabyCard();
}
