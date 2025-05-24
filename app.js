/* ---------------- IAST → Devanāgarī ---------------- */
const iastEl = document.getElementById('iast');
const devEl  = document.getElementById('dev');
iastEl.addEventListener('input', () => {
  devEl.value = Aksharamukha.convert('IAST', 'Devanagari', iastEl.value.trim());
});

/* ---------------- IndexedDB (ローカル保存) ----------- */
let db;
const open = indexedDB.open('spruecheDB', 1);
open.onupgradeneeded = e => {
  db = e.target.result;
  const store = db.createObjectStore('verses', { keyPath: 'id' });
  store.createIndex('allText', 'allText', { unique: false });
};
open.onsuccess = e => { db = e.target.result; load(1); };

/* ---------------- GitHub へ自動コミット -------------- */
/* ★ 事前準備
   ① GitHub に「indische-json」リポジトリを作成（public でも private でも可）
   ② Settings → Developer settings → PAT (Classic) で “repo” scope のトークン発行
   ③ ↓ に貼り付け（ブラウザに保存されるだけ／サーバー送信されません）            */
const GH_TOKEN   = localStorage.getItem('token') || prompt('GitHub PAT を入力（初回のみ）');
localStorage.setItem('token', GH_TOKEN);
const GH_OWNER   = 'YourUserName';
const GH_REPO    = 'indische-json';
const GH_BRANCH  = 'main';

async function pushToGitHub(obj){
  const path = `data/${obj.id.toString().padStart(4,'0')}.json`;
  const url  = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`;
  const res0 = await fetch(url, { headers:{Authorization:`token ${GH_TOKEN}`}});
  const sha  = res0.ok ? (await res0.json()).sha : undefined;
  const body = {
    message:`add/udpate verse ${obj.id}`,
    branch:GH_BRANCH,
    content:btoa(JSON.stringify(obj,null,2)),
    sha
  };
  await fetch(url,{
    method:'PUT',
    headers:{'Content-Type':'application/json', Authorization:`token ${GH_TOKEN}`},
    body:JSON.stringify(body)
  });
}

/* ---------------- フォーム動作 ---------------- */
const f = document.getElementById('f');
f.onsubmit = e=>{
  e.preventDefault();
  const v = {
    id: +document.getElementById('id').value,
    iast:iastEl.value.trim(),
    dev:devEl.value.trim(),
    de:document.getElementById('de').value.trim(),
    ja:document.getElementById('ja').value.trim(),
    notes:document.getElementById('notes').value.trim(),
    allText:`${iastEl.value} ${devEl.value} ${de.value} ${ja.value} ${notes.value}`.toLowerCase()
  };
  const tx = db.transaction('verses','readwrite');
  tx.objectStore('verses').put(v).onsuccess = () => {
    render();                            // 画面更新
    pushToGitHub(v).catch(console.error);// GitHub へ即アップ
    alert('Saved & Published!');
  };
};

/* ----------- ナビゲーション ----------- */
function load(id){ const tx=db.transaction('verses');tx.objectStore('verses').get(id).onsuccess=e=>{
  const v=e.target.result||{id,iast:'',dev:'',de:'',ja:'',notes:''};
  Object.assign(f,{id:{value:v.id},iast:{value:v.iast},dev:{value:v.dev},
    de:{value:v.de},ja:{value:v.ja},notes:{value:v.notes}});
  render();
};}
document.getElementById('prev').onclick = ()=>load(Math.max(1, +f.id.value-1));
document.getElementById('next').onclick = ()=>load(Math.min(7613, +f.id.value+1));
document.getElementById('rand').onclick = ()=>load(Math.floor(Math.random()*7613)+1);

/* --------------- 検索 ------------------ */
document.getElementById('search').onclick = ()=>{
  const q=document.getElementById('q').value.toLowerCase();
  const list=[];
  db.transaction('verses').objectStore('verses').openCursor().onsuccess=e=>{
    const c=e.target.result; if(!c){ render(list); return;}
    if(c.value.allText.includes(q)) list.push(c.value);
    c.continue();
  };
};
function render(arr){
  if(!arr){ // 再読込
    arr=[]; db.transaction('verses').objectStore('verses').openCursor().onsuccess=e=>{
      const c=e.target.result; if(!c){ render(arr); return;} arr.push(c.value); c.continue();
    }; return;
  }
  const out = arr.length? arr.map(v=>`<div class='card'><b>${v.id}</b> ${v.dev||v.iast}</div>`).join('') : '<em>No data</em>';
  document.getElementById('list').innerHTML=out;
}
