(() => {
  const cfg = window.UCHINOKO_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const mt = document.getElementById('modalTitle');
  const mb = document.getElementById('modalBody');
  let state = {session:null, pets:[], activePet:null, appointments:[], records:[], health:[], meds:[], docs:[], meals:[], family:[], providers:[], memories:[]};

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmtDate = s => s ? new Date(s).toLocaleDateString('ja-JP') : '';
  const toast = msg => { const n=document.createElement('div'); n.className='notice ok'; n.textContent=msg; n.style.position='fixed'; n.style.left='50%'; n.style.bottom='90px'; n.style.transform='translateX(-50%)'; n.style.zIndex='99'; n.style.boxShadow='0 8px 24px rgba(0,0,0,.16)'; document.body.appendChild(n); setTimeout(()=>n.remove(),2200); };
  const openModal = (title, html) => { mt.textContent=title; mb.innerHTML=html; modal.classList.remove('hide'); };
  const closeModal = () => modal.classList.add('hide');
  document.getElementById('modalClose').onclick=closeModal;
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});

  async function safeSelect(table, query='*', order=null){
    try{ let q=sb.from(table).select(query); if(order) q=q.order(order,{ascending:false}); const {data,error}=await q; if(error) throw error; return data||[]; }
    catch(e){ console.warn(table,e.message); return []; }
  }

  async function loadAll(){
    if(!state.session) return;
    const uid=state.session.user.id;
    const [pets, appts, records, health, meds, docs, meals, family, providers] = await Promise.all([
      safeSelect('pets','*'), safeSelect('appointments','*','appointment_at'), safeSelect('medical_records','*','created_at'), safeSelect('health_logs','*','logged_at'), safeSelect('medications','*','created_at'), safeSelect('documents','*','created_at'), safeSelect('meals','*','logged_at'), safeSelect('family_members','*','created_at'), safeSelect('providers','*','created_at')
    ]);
    state.pets=pets.filter(x=>!x.owner_id||x.owner_id===uid);
    state.activePet=state.activePet || state.pets[0] || null;
    state.appointments=appts; state.records=records; state.health=health; state.meds=meds; state.docs=docs; state.meals=meals; state.family=family; state.providers=providers;
    renderHome();
  }

  function loginScreen(){
    app.innerHTML=`<div class="login-screen"><div class="card login-card"><div class="section-title" style="margin-top:0">飼い主登録・ログイン</div><div class="muted">メールアドレスでSupabaseにログインします。</div><label>メールアドレス</label><input id="email" type="email" autocomplete="email"><label>パスワード（6文字以上）</label><input id="password" type="password" autocomplete="current-password"><div class="actions"><button class="btn primary" id="signin">ログイン</button><button class="btn" id="signup">新規登録</button></div><div class="notice small">Apple / Googleログインは、各プロバイダー設定後に追加できます。</div></div></div>`;
    document.getElementById('signin').onclick=async()=>{const email=emailEl(),password=pwEl(); const {error}=await sb.auth.signInWithPassword({email,password}); if(error)return alert(error.message);};
    document.getElementById('signup').onclick=async()=>{const email=emailEl(),password=pwEl(); const {error}=await sb.auth.signUp({email,password}); if(error)return alert(error.message); alert('登録しました。確認メール設定が有効な場合はメールを確認してください。');};
  }
  const emailEl=()=>document.getElementById('email').value.trim(); const pwEl=()=>document.getElementById('password').value;

  function petCard(){
    const p=state.activePet;
    if(!p) return `<div class="card"><div class="section-title" style="margin:0 0 8px">ペットがまだ登録されていません</div><button class="btn primary" onclick="window.U.addPet()">＋ ペット追加</button></div>`;
    return `<div class="card"><div class="spread"><div class="row"><div class="pet-emoji">🐶</div><div><div class="pet-name">${esc(p.name||'名前未設定')}</div><div>${esc(p.breed||p.species||'')}</div><div class="muted">${p.weight_kg?`体重 ${esc(p.weight_kg)} kg`:''}</div></div></div><button class="btn" onclick="window.U.switchPet()">切替</button></div></div>`;
  }
  function upcoming(){
    const pid=state.activePet?.id; const arr=state.appointments.filter(a=>!pid||a.pet_id===pid).slice(0,3);
    if(!arr.length) return '<div class="muted">予定はまだありません。</div>';
    return arr.map(a=>`<div class="event spread"><div><span class="pill">${esc(a.appointment_type||a.type||'予定')}</span><div style="font-weight:800;font-size:20px;margin-top:6px">${esc(a.title||a.appointment_type||'予定')}</div><div class="muted">${esc(a.notes||'')}</div></div><div class="date">${fmtDate(a.appointment_at)}<br><span style="font-size:18px;font-weight:500">${a.appointment_at?new Date(a.appointment_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):''}</span></div></div>`).join('');
  }
  function renderHome(){
    app.innerHTML=`${petCard()}<div class="grid4"><button class="tile" onclick="window.U.openRecords()"><div class="ico">♥</div>健康記録</button><button class="tile" onclick="window.U.openSchedule()"><div class="ico">▣</div>予定</button><button class="tile" onclick="window.U.openMemories()"><div class="ico">📷</div>写真</button><button class="tile" onclick="window.U.openCloud()"><div class="ico">☁️</div>クラウド</button></div><div class="section-title spread"><span>次の予定</span><button class="btn" onclick="window.U.openSchedule()">すべて見る</button></div><div class="card">${upcoming()}</div><div class="section-title">最近の記録</div><div class="card">${recentRecords()}</div>`;
  }
  function recentRecords(){const pid=state.activePet?.id; const arr=state.health.filter(x=>!pid||x.pet_id===pid).slice(0,4); return arr.length?arr.map(x=>`<div class="list-item spread"><div>${fmtDate(x.logged_at||x.created_at)}</div><div>${x.weight_kg?`体重 ${esc(x.weight_kg)}kg`:esc(x.notes||'健康記録')}</div></div>`).join(''):'<div class="muted">まだ記録がありません。</div>';}

  async function addPet(){
  openModal(
    'ペットを追加',
    `
    <label>名前</label>
    <input id="pn">

    <div class="two">
      <div>
        <label>種類</label>
        <input id="ps" placeholder="犬・猫など">
      </div>
      <div>
        <label>犬種・猫種</label>
        <input id="pb">
      </div>
    </div>

    <div class="two">
      <div>
        <label>性別</label>
        <select id="psex">
          <option value="">未設定</option>
          <option>オス</option>
          <option>メス</option>
        </select>
      </div>
      <div>
        <label>誕生日</label>
        <input id="pbd" type="date">
      </div>
    </div>

    <div class="two">
      <div>
        <label>体重 kg</label>
        <input id="pw" type="number" step="0.1">
      </div>
      <div>
        <label>血液型</label>
        <input id="pbt">
      </div>
    </div>

    <label>ペットの写真</label>
    <input id="petPhoto" type="file" accept="image/*">

    <div class="actions">
      <button class="btn primary" id="psave">保存</button>
    </div>
    `
  );

  document.getElementById('psave').onclick=async()=>{

    const name=document.getElementById('pn').value.trim();

    if(!name){
      alert('名前を入力してください');
      return;
    }

    let photo_path=null;
    let photo_url=null;

    const file=document.getElementById('petPhoto').files[0];

    if(file){
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase();

      photo_path=
        `${state.session.user.id}/pets/${Date.now()}.${ext}`;

      const {error:uploadError}=await sb.storage
        .from(cfg.STORAGE_BUCKET)
        .upload(photo_path,file,{upsert:false});

      if(uploadError){
        alert(uploadError.message);
        return;
      }

      const {data:urlData}=sb.storage
        .from(cfg.STORAGE_BUCKET)
        .getPublicUrl(photo_path);

      photo_url=urlData.publicUrl;
    }

    const payload={
      owner_id:state.session.user.id,
      name:name,
      species:document.getElementById('ps').value.trim(),
      breed:document.getElementById('pb').value.trim(),
      sex:document.getElementById('psex').value,
      birth_date:document.getElementById('pbd').value||null,
      weight_kg:document.getElementById('pw').value
        ?Number(document.getElementById('pw').value)
        :null,
      blood_type:document.getElementById('pbt').value.trim(),
      photo_path:photo_path,
      photo_url:photo_url
    };

    const {data,error}=await sb
      .from('pets')
      .insert(payload)
      .select()
      .single();

    if(error){
      alert(error.message);
      return;
    }

    state.pets.push(data);
    state.activePet=data;

    closeModal();
    toast('ペットを保存しました');
    renderHome();
  };
}

function switchPet(){
  openModal(
    'ペットを切り替え',
    (
      state.pets.map(p=>`
        <button
          class="btn"
          style="width:100%;margin:6px 0"
          data-id="${p.id}">
          ${esc(p.name)}
        </button>
      `).join('')
      ||
      '<div class="muted">ペットがありません</div>'
    )
    +
    `
      <button
        class="btn primary"
        style="width:100%;margin:14px 0 0"
        id="addNewPet">
        ＋ 新しいペットを追加
      </button>
    `
  );

  mb.querySelectorAll('[data-id]').forEach(b=>{
    b.onclick=()=>{
      state.activePet=state.pets.find(
        p=>String(p.id)===b.dataset.id
      );
      closeModal();
      renderHome();
    };
  });

  document.getElementById('addNewPet').onclick=()=>{
    closeModal();
    addPet();
  };
}
  function openSchedule(){
    const pid=state.activePet?.id; const rows=state.appointments.filter(a=>!pid||a.pet_id===pid);
    openModal('予定・リマインダー',`<button class="btn primary" id="addAppt">＋予定追加</button><div style="margin-top:10px">${rows.map(a=>`<div class="list-item"><b>${esc(a.title||a.appointment_type||'予定')}</b><br><span class="muted">${fmtDate(a.appointment_at)} ${a.appointment_at?new Date(a.appointment_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):''}</span></div>`).join('')||'<div class="muted">予定なし</div>'}</div>`);
    document.getElementById('addAppt').onclick=()=>addAppointment();
  }
  function addAppointment(){openModal('予定を追加',`<label>種類</label><select id="atype"><option>動物病院</option><option>トリミング</option><option>薬・予防薬</option><option>その他</option></select><label>日時</label><input id="aat" type="datetime-local"><label>タイトル</label><input id="atl"><label>メモ</label><textarea id="anote"></textarea><div class="actions"><button class="btn primary" id="asave">保存</button></div>`); document.getElementById('asave').onclick=async()=>{if(!state.activePet)return alert('先にペットを登録してください');const payload={pet_id:state.activePet.id,appointment_type:atype.value,appointment_at:new Date(aat.value).toISOString(),title:atl.value.trim()||atype.value,notes:anote.value.trim(),status:'scheduled'};const {data,error}=await sb.from('appointments').insert(payload).select().single();if(error)return alert(error.message);state.appointments.unshift(data);closeModal();toast('予定を保存しました');renderHome();};}

  function openRecords(){const p=state.activePet;if(!p)return addPet();openModal('健康記録・グラフ',`<button class="btn primary" id="addHealth">＋健康記録</button><div style="margin-top:10px">${state.health.filter(x=>x.pet_id===p.id).map(x=>`<div class="list-item spread"><span>${fmtDate(x.logged_at||x.created_at)}</span><span>${x.weight_kg?`体重 ${esc(x.weight_kg)}kg`:esc(x.notes||'記録')}</span></div>`).join('')||'<div class="muted">記録なし</div>'}</div>`);document.getElementById('addHealth').onclick=addHealth;}
  function addHealth(){openModal('健康記録を追加',`<label>日時</label><input id="hdate" type="datetime-local"><div class="two"><div><label>体重 kg</label><input id="hweight" type="number" step="0.1"></div><div><label>食事量 g</label><input id="hfood" type="number"></div></div><div class="two"><div><label>飲水量 ml</label><input id="hwater" type="number"></div><div><label>体温 ℃</label><input id="htemp" type="number" step="0.1"></div></div><label>メモ</label><textarea id="hnotes"></textarea><div class="actions"><button class="btn primary" id="hsave">保存</button></div>`);document.getElementById('hsave').onclick=async()=>{const payload={pet_id:state.activePet.id,logged_at:hdate.value?new Date(hdate.value).toISOString():new Date().toISOString(),weight_kg:hweight.value?Number(hweight.value):null,food_g:hfood.value?Number(hfood.value):null,water_ml:hwater.value?Number(hwater.value):null,temperature_c:htemp.value?Number(htemp.value):null,notes:hnotes.value.trim()};const {data,error}=await sb.from('health_logs').insert(payload).select().single();if(error)return alert(error.message);state.health.unshift(data);closeModal();toast('健康記録を保存しました');renderHome();};}

  async function openMemories(){
  const p=state.activePet;
  if(!p)return addPet();

  const {data:memories,error}=await sb
    .from('memories')
    .select('*')
    .eq('pet_id',p.id)
    .order('taken_at',{ascending:false});

  if(error){
    alert(error.message);
    return;
  }

  const album=(memories||[]).map(m=>`
    <div class="card" style="margin-top:12px">
      <img
        src="${esc(m.photo_url||'')}"
        style="width:100%;max-height:360px;object-fit:cover;border-radius:18px"
        onclick="window.open('${esc(m.photo_url||'')}','_blank')"
      >
      <div style="margin-top:10px">
        <b>${esc(m.memo||'思い出写真')}</b>
      </div>
      <div class="small">
        ${fmtDate(m.taken_at||m.created_at)}
      </div>
    </div>
  `).join('');

  openModal(
    '思い出・写真',
    `
      <div class="notice">
        写真はSupabase Storage「${esc(cfg.STORAGE_BUCKET)}」に保存します。
      </div>

      <label>写真</label>
      <input id="photoFile" type="file" accept="image/*">

      <label>メモ</label>
      <input id="photoNote" placeholder="今日もかわいい">

      <div class="actions">
        <button class="btn primary" id="uploadPhoto">写真を保存</button>
      </div>

      <div id="photoResult"></div>

      <div class="section-title" style="margin-top:22px">
        保存した思い出
      </div>

      ${
        album ||
        '<div class="muted" style="margin-top:12px">まだ写真はありません</div>'
      }
    `
  );

  document.getElementById('uploadPhoto').onclick=uploadPhoto;
}

async function uploadPhoto(){
  const f=document.getElementById('photoFile').files[0];

  if(!f){
    alert('写真を選んでください');
    return;
  }

  if(!state.activePet){
    alert('ペットを選択してください');
    return;
  }

  const ext=(f.name.split('.').pop()||'jpg').toLowerCase();

  const path=
    `${state.session.user.id}/${state.activePet.id}/${Date.now()}.${ext}`;

  const {error:uploadError}=await sb.storage
    .from(cfg.STORAGE_BUCKET)
    .upload(path,f,{upsert:false});

  if(uploadError){
    alert(uploadError.message);
    return;
  }

  const {data}=sb.storage
    .from(cfg.STORAGE_BUCKET)
    .getPublicUrl(path);

  const url=data.publicUrl;

  const memo=
    document.getElementById('photoNote').value.trim() || '思い出写真';

  const {error:memoryError}=await sb
    .from('memories')
    .insert({
      pet_id:state.activePet.id,
      owner_id:state.session.user.id,
      photo_path:path,
      photo_url:url,
      memo:memo,
      taken_at:new Date().toISOString()
    });

  if(memoryError){
    alert(memoryError.message);
    return;
  }

  toast('写真を保存しました');
  await openMemories();
}

  function openCloud(){openModal('クラウド同期',`<div class="notice ok">Supabaseに接続済みです。</div><div><b>ユーザー</b><br>${esc(state.session?.user?.email||'')}</div><div style="margin-top:10px"><b>Project</b><br><span class="small">${esc(cfg.SUPABASE_URL)}</span></div><div class="actions"><button class="btn" id="syncNow">今すぐ同期</button><button class="btn danger" id="logout">ログアウト</button></div>`);document.getElementById('syncNow').onclick=async()=>{await loadAll();closeModal();toast('同期しました');};document.getElementById('logout').onclick=async()=>{await sb.auth.signOut();closeModal();};}

  function renderMenu(){app.innerHTML=`<div class="section-title">⚙️ アカウント・設定</div><div class="card menu-card"><div class="spread"><b>① 飼い主登録・ログイン</b><button class="btn" onclick="window.U.openCloud()">状態</button></div><div class="spread"><b>② ペット管理</b><button class="btn" onclick="window.U.switchPet()">切り替え</button></div><div class="spread"><b>③ 写真クラウド保存</b><button class="btn" onclick="window.U.openMemories()">保存</button></div><div class="spread"><b>④ リマインダー通知</b><button class="btn" onclick="window.U.openSchedule()">管理</button></div><div class="spread"><b>⑤ 施設との連携</b><button class="btn" onclick="window.U.openProviders()">開く</button></div><div class="spread"><b>⑥ 家族共有</b><button class="btn" onclick="window.U.openFamily()">開く</button></div></div><div class="card menu-card"><div class="spread"><b>🩺 ペットカルテ</b><button class="btn" onclick="window.U.openMedical()">開く</button></div><div class="spread"><b>💊 薬・予防薬</b><button class="btn" onclick="window.U.openMeds()">管理</button></div><div class="spread"><b>💉 ワクチン・書類</b><button class="btn" onclick="window.U.openMemories()">保存</button></div><div class="spread"><b>⚖️ 健康グラフ</b><button class="btn" onclick="window.U.openRecords()">記録</button></div><div class="spread"><b>🍚 食事・おやつ</b><button class="btn" onclick="window.U.openMeals()">管理</button></div><div class="spread"><b>🚨 緊急時プロフィール</b><button class="btn" onclick="window.U.openMedical()">表示</button></div><div class="spread"><b>🏥 診療用サマリー</b><button class="btn" onclick="window.U.openSummary()">表示</button></div><div class="spread"><b>📈 AI健康アシスタント</b><button class="btn" onclick="window.U.openAI()">チェック</button></div></div><div class="card"><b>⑧ データのバックアップ</b><p class="muted">Supabaseクラウドが主保存先です。必要ならJSONエクスポートもできます。</p><button class="btn" onclick="window.U.backup()">バックアップ保存</button></div>`;}

  function openMedical(){const p=state.activePet;if(!p)return addPet();const r=state.records.find(x=>x.pet_id===p.id)||{};openModal('ペットカルテ',`<label>既往歴</label><textarea id="mh">${esc(r.history||'')}</textarea><label>アレルギー</label><textarea id="ma">${esc(r.allergies||r.allergy||'')}</textarea><label>持病</label><textarea id="mc">${esc(r.chronic_conditions||r.chronic||'')}</textarea><label>手術歴</label><textarea id="ms">${esc(r.surgery_history||r.surgeries||'')}</textarea><label>かかりつけ病院</label><input id="mhosp" value="${esc(r.primary_hospital||'')}"><label>現在飲んでいる薬</label><textarea id="mmed">${esc(r.current_medications||'')}</textarea><div class="actions"><button class="btn primary" id="msave">保存</button></div>`);document.getElementById('msave').onclick=async()=>{const payload={pet_id:p.id,history:mh.value,allergies:ma.value,chronic_conditions:mc.value,surgery_history:ms.value,primary_hospital:mhosp.value,current_medications:mmed.value};let q=r.id?sb.from('medical_records').update(payload).eq('id',r.id):sb.from('medical_records').insert(payload);const {data,error}=await q.select().single();if(error)return alert(error.message);state.records=state.records.filter(x=>x.id!==r.id);state.records.unshift(data);closeModal();toast('カルテを保存しました');};}
  function openMeds(){const p=state.activePet;if(!p)return addPet();openModal('薬・予防薬',`<button class="btn primary" id="addMed">＋薬を追加</button>${state.meds.filter(x=>x.pet_id===p.id).map(x=>`<div class="list-item"><b>${esc(x.name||x.medication_name||'薬')}</b><br><span class="muted">次回 ${fmtDate(x.next_dose_at)}</span></div>`).join('')||'<div class="muted">登録なし</div>'}`);document.getElementById('addMed').onclick=()=>{openModal('薬を追加',`<label>薬・予防薬名</label><input id="medn"><label>次回予定</label><input id="medd" type="datetime-local"><label>メモ</label><textarea id="mednote"></textarea><div class="actions"><button class="btn primary" id="medsave">保存</button></div>`);document.getElementById('medsave').onclick=async()=>{const payload={pet_id:p.id,name:medn.value.trim(),next_dose_at:medd.value?new Date(medd.value).toISOString():null,notes:mednote.value.trim()};const {data,error}=await sb.from('medications').insert(payload).select().single();if(error)return alert(error.message);state.meds.unshift(data);closeModal();toast('薬を保存しました');};};}
  function openMeals(){const p=state.activePet;if(!p)return addPet();openModal('食事・おやつ',`<label>フード名</label><input id="mealn"><label>量 g</label><input id="mealg" type="number"><label>回数</label><input id="mealc" type="number"><label>メモ</label><textarea id="mealnote"></textarea><div class="actions"><button class="btn primary" id="mealsave">保存</button></div>`);document.getElementById('mealsave').onclick=async()=>{const payload={pet_id:p.id,food_name:mealn.value.trim(),amount_g:mealg.value?Number(mealg.value):null,times_per_day:mealc.value?Number(mealc.value):null,notes:mealnote.value.trim(),logged_at:new Date().toISOString()};const {data,error}=await sb.from('meals').insert(payload).select().single();if(error)return alert(error.message);state.meals.unshift(data);closeModal();toast('食事記録を保存しました');};}
  function openFamily(){openModal('家族共有',`<div class="notice">家族のメールアドレスを登録します。</div><label>メールアドレス</label><input id="femail" type="email"><label>役割</label><select id="frole"><option>family</option><option>viewer</option></select><div class="actions"><button class="btn primary" id="fsave">追加</button></div>`);document.getElementById('fsave').onclick=async()=>{const payload={owner_id:state.session.user.id,email:femail.value.trim(),role:frole.value};const {error}=await sb.from('family_members').insert(payload);if(error)return alert(error.message);closeModal();toast('家族共有に追加しました');};}
  function openProviders(){openModal('施設との連携',state.providers.map(x=>`<div class="list-item"><b>${esc(x.name||'施設')}</b><br><span class="muted">${esc(x.provider_type||x.type||'')}</span></div>`).join('')||'<div class="muted">施設がまだ登録されていません。</div>');}
  function openSummary(){const p=state.activePet;if(!p)return addPet();const r=state.records.find(x=>x.pet_id===p.id)||{};openModal('診療用サマリー',`<div class="card"><b>${esc(p.name)}</b><p>${esc(p.species||'')} ${esc(p.breed||'')} / ${esc(p.sex||'')}</p><p>体重：${esc(p.weight_kg||'未記録')} kg</p><p>血液型：${esc(p.blood_type||'未記録')}</p><hr><p><b>既往歴</b><br>${esc(r.history||'なし')}</p><p><b>アレルギー</b><br>${esc(r.allergies||'なし')}</p><p><b>持病</b><br>${esc(r.chronic_conditions||'なし')}</p><p><b>現在の薬</b><br>${esc(r.current_medications||'なし')}</p></div>`);}
  function openAI(){const p=state.activePet;if(!p)return addPet();const hs=state.health.filter(x=>x.pet_id===p.id).slice(0,5);const alerts=[];if(hs.length>=2&&hs[0].weight_kg&&hs[1].weight_kg){const d=Math.abs(hs[0].weight_kg-hs[1].weight_kg)/hs[1].weight_kg;if(d>=.05)alerts.push('体重が前回記録から5%以上変化しています。');}const soon=state.appointments.filter(a=>a.pet_id===p.id&&a.appointment_at&&new Date(a.appointment_at)-Date.now()<7*86400000&&new Date(a.appointment_at)>Date.now());if(soon.length)alerts.push('1週間以内の予定があります。');if(!alerts.length)alerts.push('現在の記録から大きな注意点は見つかりませんでした。');openModal('AI健康アシスタント',`<div class="notice warn">診断ではありません。記録確認の補助機能です。</div>${alerts.map(a=>`<div class="list-item">✅ ${esc(a)}</div>`).join('')}`);}
  function backup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`uchinoko-note-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);}

  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');const t=b.dataset.tab;if(t==='home')renderHome();else if(t==='schedule')openSchedule();else if(t==='records')openRecords();else if(t==='memories')openMemories();else if(t==='menu')renderMenu();});
  document.getElementById('quickAdd').onclick=()=>{if(!state.session)return; addAppointment();};
  window.U={addPet,switchPet,openSchedule,openRecords,openMemories,openCloud,openMedical,openMeds,openMeals,openFamily,openProviders,openSummary,openAI,backup};

  sb.auth.onAuthStateChange(async(_event,session)=>{state.session=session;if(!session){loginScreen();}else{await loadAll();}});
  sb.auth.getSession().then(({data})=>{state.session=data.session;if(!state.session)loginScreen();else loadAll();});
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
})();
