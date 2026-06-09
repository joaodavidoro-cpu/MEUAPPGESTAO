/* =====================================================================
   Oro's hub — Motoboy Dashboard — App offline (PWA)
   Armazenamento 100% local (localStorage). Sem servidor, sem domínio.
   ===================================================================== */

/* ---------------- Camada de dados ---------------- */
const DB = {
  k:{ reg:'mg_registros', man:'mg_manutencao', orc:'mg_orcamentos',
      plat:'mg_plataformas', cfg:'mg_config' },
  load(key, def){ try{ return JSON.parse(localStorage.getItem(key)) ?? def }catch(e){ return def } },
  save(key, val){ localStorage.setItem(key, JSON.stringify(val)) },
  get registros(){ return DB.load(DB.k.reg, []) },
  set registros(v){ DB.save(DB.k.reg, v) },
  get manutencao(){ return DB.load(DB.k.man, []) },
  set manutencao(v){ DB.save(DB.k.man, v) },
  get orcamentos(){ return DB.load(DB.k.orc, []) },
  set orcamentos(v){ DB.save(DB.k.orc, v) },
  get plataformas(){ return DB.load(DB.k.plat, ['iFood','Rappi','Uber Flash','Loggi','Freelance','99 Entregas']) },
  set plataformas(v){ DB.save(DB.k.plat, v) },
  get habitos(){ return DB.load('mg_habitos', []) },
  set habitos(v){ DB.save('mg_habitos', v) },
};

/* ---------------- Utilidades ---------------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const money = n => 'R$ ' + (Number(n)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const num = v => { const n = parseFloat(String(v).replace(',','.')); return isNaN(n)?0:n; };
function fmtDate(iso){ if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
const todayISO = () => new Date().toISOString().slice(0,10);
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
const esc = s => String(s??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* converte "836" -> 8.6 (8h36m) ou "8.5" -> 8.5 */
function parseHoras(v){
  if(v==null||v==='') return 0;
  v=String(v).trim();
  if(/^\d{3,4}$/.test(v)){ const s=v.padStart(4,'0'); return (+s.slice(0,2)) + (+s.slice(2))/60; }
  return num(v);
}

/* categorias de gasto pessoal */
const CAT_PESSOAL = [
  {id:'alimentacao', nome:'Alimentação', ico:'🍔'},
  {id:'mercado', nome:'Mercado', ico:'🛒'},
  {id:'contas', nome:'Contas / Casa', ico:'🏠'},
  {id:'saude', nome:'Saúde', ico:'💊'},
  {id:'lazer', nome:'Lazer', ico:'🎮'},
  {id:'transporte', nome:'Transporte', ico:'🚌'},
  {id:'educacao', nome:'Educação', ico:'📚'},
  {id:'outros', nome:'Outros', ico:'📦'},
];
const catInfo = id => CAT_PESSOAL.find(c=>c.id===id) || {nome:'Outros', ico:'📦'};

/* ---------------- Tema (escuro/claro) ---------------- */
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('mg_theme', t);
  const b=document.getElementById('themeBtn'); if(b) b.textContent = t==='dark'?'☀️':'🌙';
  const meta=document.querySelector('meta[name=theme-color]');
  if(meta) meta.setAttribute('content', t==='dark'?'#000000':'#ff9000');
}
let THEME = localStorage.getItem('mg_theme') || 'dark';
applyTheme(THEME);
document.getElementById('themeBtn').onclick = ()=>{ THEME = THEME==='dark'?'light':'dark'; applyTheme(THEME); };

/* ---------------- Filtro de período ---------------- */
let PERIODO = 'todos'; // todos | mes | semana | custom
let PERIODO_INI = '', PERIODO_FIM = '';
function dentroPeriodo(iso){
  if(PERIODO==='todos') return true;
  if(PERIODO==='custom'){
    if(PERIODO_INI && iso < PERIODO_INI) return false;
    if(PERIODO_FIM && iso > PERIODO_FIM) return false;
    return true;
  }
  const d=new Date(iso+'T00:00:00'), now=new Date();
  if(PERIODO==='mes') return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
  if(PERIODO==='semana'){ const diff=(now-d)/86400000; return diff>=0 && diff<7; }
  return true;
}

/* cálculos do registro de moto */
function calcReg(r){
  const ganhos = (r.ganhos||[]).reduce((s,g)=>s+num(g.valor),0);
  const desp = num(r.gastosRua)+num(r.manutencao)+num(r.combustivel);
  const lucro = ganhos - desp;
  const horas = num(r.horas);
  // média/hora e média/km usam ganhos brutos (igual ao Painel),
  // assim despesas pontuais (ex: gasolina) não distorcem o dia.
  return { ganhos, desp, lucro, horas, mediaHora: horas? ganhos/horas : 0,
           km:num(r.km), mediaKm: num(r.km)? ganhos/num(r.km):0 };
}
const somaGanhos = r => (r.ganhos||[]).reduce((s,g)=>s+num(g.valor),0);

/* ================= ROTEADOR ================= */
const routes = {};
const ROUTE_ORDER = { painel:0, historico:1, novo:2, manutencao:3, orcamento:4 };
let current = 'painel';
let prevIndex = 0;
function go(route){
  const ni = ROUTE_ORDER[route] ?? 0;
  const dir = ni >= prevIndex ? 1 : -1;
  prevIndex = ni;
  current = route;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.route===route));
  moveIndicator();
  const v = document.getElementById('view');
  v.innerHTML = '';
  (routes[route]||routes.painel)(v);
  window.scrollTo(0,0);
  // transição direcional suave, sem delay
  v.style.setProperty('--enter-x', (dir*26)+'px');
  v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter');
}
document.querySelectorAll('.tab').forEach(t=> t.addEventListener('click', ()=>go(t.dataset.route)));

/* indicador deslizante da barra inferior (recria a animação da referência) */
function moveIndicator(){
  const bar=document.querySelector('.tabbar');
  const ind=document.querySelector('.tab-indicator');
  const active=document.querySelector('.tab.active');
  if(!bar||!ind){ return; }
  if(!active || active.classList.contains('tab-add')){ ind.style.opacity='0'; return; }
  const ico = active.querySelector('.tab-ico') || active;
  const br=bar.getBoundingClientRect(), r=ico.getBoundingClientRect();
  const size = ind.offsetWidth || 40;
  const cx = r.left + r.width/2 - br.left;
  const cy = r.top + r.height/2 - br.top;
  ind.style.opacity='1';
  ind.style.top = (cy - size/2) + 'px';
  ind.style.transform = `translateX(${cx - size/2}px)`;
}
window.addEventListener('resize', moveIndicator);


/* ================= PAINEL ================= */
routes.painel = (root)=>{
  const regs = DB.registros.filter(r=>dentroPeriodo(r.data));
  const motos = regs.filter(r=>r.tipo==='moto');
  const ganhosExtra = regs.filter(r=>r.tipo==='ganho');
  const pess  = regs.filter(r=>r.tipo==='pessoal');

  let ganhoMoto=0, gastosRua=0, manut=0, comb=0, km=0, horas=0;
  motos.forEach(r=>{ const c=calcReg(r); ganhoMoto+=c.ganhos; gastosRua+=num(r.gastosRua); manut+=num(r.manutencao); comb+=num(r.combustivel); km+=c.km; horas+=c.horas; });
  const manutPecas = DB.manutencao.filter(m=>dentroPeriodo(m.dataInicio)).reduce((s,m)=>s+num(m.custo),0);
  manut += manutPecas;

  const ganhoExtra = ganhosExtra.reduce((s,r)=>s+somaGanhos(r),0);
  const gastoPessoal = pess.reduce((s,r)=>s+num(r.valor),0);

  const totalGanho = ganhoMoto + ganhoExtra;
  const totalGastosMoto = gastosRua+manut+comb;
  const lucroMoto = ganhoMoto - totalGastosMoto;
  const saldoFinal = lucroMoto + ganhoExtra - gastoPessoal;

  // por plataforma (moto + ganhos extra)
  const porPlat = {};
  [...motos, ...ganhosExtra].forEach(r=> (r.ganhos||[]).forEach(g=>{ const n=g.plataforma||'Outros'; porPlat[n]=(porPlat[n]||0)+num(g.valor); }));
  const platArr = Object.entries(porPlat).sort((a,b)=>b[1]-a[1]);
  const maxPlat = Math.max(1, ...platArr.map(p=>p[1]));

  const saldoNeg = saldoFinal<0;
  root.innerHTML = `
    <div class="hero">
      <div class="hero-top">
        <span class="hero-label">Saldo do período</span>
        <span class="hero-chip">${periodoTexto()}</span>
      </div>
      <div class="hero-value">${money(saldoFinal)}</div>
      <div class="hero-change ${saldoNeg?'neg':'pos'}">${saldoNeg?'▼':'▲'} ${money(Math.abs(lucroMoto))} de lucro na moto</div>
      <div class="hero-actions">
        <button class="qbtn" data-act="novo"><span class="q-ico">＋</span><span>Registrar</span></button>
        <button class="qbtn" data-act="historico"><span class="q-ico">🗒️</span><span>Histórico</span></button>
        <button class="qbtn" data-act="backup"><span class="q-ico">⬇</span><span>Backup</span></button>
      </div>
    </div>

    <div class="block-title">Resumo do período</div>
    <div class="metrics">
      ${metric('Total Ganho','g','$',money(totalGanho), motos.length+ganhosExtra.length+' registros')}
      ${metric('Lucro Líquido (moto)','b','📈',money(lucroMoto), lucroMoto<0?'Prejuízo':'Após despesas', lucroMoto<0?'neg':'pos')}
      ${metric('Outros Ganhos','g','💵',money(ganhoExtra), ganhosExtra.length+' sem moto', ganhoExtra>0?'pos':'')}
      ${metric('Gastos Pessoais','r','👤',money(gastoPessoal),'Fora da moto', gastoPessoal>0?'neg':'')}
      ${metric('Média por KM','p','➤',money(km?ganhoMoto/km:0), km.toFixed(0)+' km totais')}
      ${metric('Média por Hora','a','⏱',money(horas?ganhoMoto/horas:0), horas.toFixed(1)+'h trabalhadas')}
      ${metric('Gastos na Rua','r','🛍',money(gastosRua),'Estacionamento, pedágio')}
      ${metric('Manutenção','a','🔧',money(manut),'Revisões e reparos')}
      ${metric('Combustível','b','⛽',money(comb),'Abastecimento')}
      ${metric('Total Gastos (moto)','s','$',money(totalGastosMoto),'Todas as despesas')}
    </div>

    <div class="section">
      <h3>Ganhos por Plataforma</h3>
      ${platArr.length? `<div class="bars">${platArr.map(([p,v])=>`
        <div class="bar-row">
          <div class="bl"><span>${esc(p)}</span><strong>${money(v)}</strong></div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6,v/maxPlat*100)}%"></div></div>
        </div>`).join('')}</div>` : `<div class="empty"><div class="big">📊</div><p>Sem ganhos no período</p></div>`}
    </div>

    <div class="section">
      <h3>Resumo Geral</h3>
      <div class="bars">
        ${resumoRow('Lucro da Moto', lucroMoto, lucroMoto<0?'red':'green')}
        ${resumoRow('Outros Ganhos', ganhoExtra,'green')}
        ${resumoRow('Gastos Pessoais', -gastoPessoal,'red')}
        ${resumoRow('Saldo Final', saldoFinal, saldoFinal<0?'red':'green')}
      </div>
    </div>

    <div class="section">
      <h3>💾 Backup dos dados</h3>
      <p class="hintline" style="margin:-4px 0 12px">Seus dados ficam salvos só neste aparelho. Faça um backup de vez em quando — assim você nunca perde nada se reinstalar o app ou trocar de celular.</p>
      <div class="btn-row">
        <button class="btn primary" id="backupBtn">⬇ Salvar Backup</button>
        <button class="btn ghost" id="restoreBtn">⬆ Restaurar</button>
      </div>
      <button class="btn ghost" id="exportBtn" style="margin-top:10px">Exportar CSV (planilha)</button>
      <input type="file" id="restoreFile" accept="application/json,.json" hidden>
    </div>
  `;
  document.getElementById('exportBtn').onclick = exportCSV;
  document.getElementById('backupBtn').onclick = exportBackup;
  const fileInp = document.getElementById('restoreFile');
  document.getElementById('restoreBtn').onclick = ()=> fileInp.click();
  fileInp.onchange = e=>{ if(e.target.files[0]) importBackup(e.target.files[0]); e.target.value=''; };
  root.querySelectorAll('.qbtn').forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==='backup'){ exportBackup(); } else go(a);
  });
};
function periodoTexto(){
  if(PERIODO==='custom') return periodoLabelTexto();
  return PERIODO==='mes'?'Este mês' : PERIODO==='semana'?'Últimos 7 dias' : 'Todos os períodos';
}
function metric(label,ico,icon,value,hint,cls=''){
  return `<div class="metric"><div class="top"><span class="label">${label}</span>
    <span class="ico ${ico}">${icon}</span></div>
    <span class="value ${cls}">${value}</span><span class="hint">${hint}</span></div>`;
}
function resumoRow(label,val,color){
  return `<div class="bar-row"><div class="bl"><span>${label}</span>
    <strong class="vv ${color}">${money(val)}</strong></div></div>`;
}

/* ================= GANHOS (controle reutilizável c/ plataforma personalizada) ================= */
function persistPlataformas(items){
  const cur = DB.plataformas; let changed=false;
  items.forEach(g=>{ const n=(g.plataforma||'').trim(); if(n && !cur.includes(n)){ cur.push(n); changed=true; } });
  if(changed) DB.plataformas = cur;
}
function buildGanhos(listEl, items, totalEl){
  function updTotal(){ if(totalEl) totalEl.textContent = money(items.reduce((s,g)=>s+num(g.valor),0)); }
  function rerender(){
    listEl.innerHTML = items.map((g,i)=>{
      const valInput = `<input class="input pval" data-i="${i}" inputmode="decimal" placeholder="R$ 0,00" value="${g.valor??''}">`;
      const del = `<button class="del" data-i="${i}" title="Remover">✕</button>`;
      if(g.custom){
        return `<div class="plat-row">
          <input class="input pcustom" data-i="${i}" placeholder="Escreva o nome da plataforma" value="${esc(g.plataforma)}">
          ${valInput}${del}</div>`;
      }
      return `<div class="plat-row">
        <select class="psel" data-i="${i}">
          <option value="">Selecione a plataforma</option>
          ${DB.plataformas.map(p=>`<option ${p===g.plataforma?'selected':''}>${esc(p)}</option>`).join('')}
          <option value="__new__">➕ Adicionar nova plataforma…</option>
        </select>${valInput}${del}</div>`;
    }).join('');
    listEl.querySelectorAll('.psel').forEach(s=>s.onchange=e=>{
      const i=+e.target.dataset.i;
      if(e.target.value==='__new__'){ items[i].custom=true; items[i].plataforma=''; rerender(); const inp=listEl.querySelector(`.pcustom[data-i="${i}"]`); inp&&inp.focus(); }
      else items[i].plataforma=e.target.value;
    });
    listEl.querySelectorAll('.pcustom').forEach(s=>s.oninput=e=>{ items[+e.target.dataset.i].plataforma=e.target.value; });
    listEl.querySelectorAll('.pval').forEach(s=>s.oninput=e=>{ items[+e.target.dataset.i].valor=e.target.value; updTotal(); });
    listEl.querySelectorAll('.del').forEach(b=>b.onclick=e=>{ items.splice(+e.target.dataset.i,1); if(!items.length)items.push({plataforma:'',valor:'',custom:false}); rerender(); updTotal(); });
    updTotal();
  }
  rerender();
}
function modalPlataformas(onClose){
  const render=()=>{
    const list = DB.plataformas;
    openModal(`
      <h3>Gerenciar Plataformas</h3>
      <p class="msub">Toque no ✕ para remover e evitar lotar a lista.</p>
      <div id="plManage">${ list.length? list.map((p,i)=>`
        <div class="plat-row">
          <div class="input" style="flex:1;display:flex;align-items:center;min-width:0">${esc(p)}</div>
          <button class="del" data-i="${i}" title="Remover">✕</button>
        </div>`).join('') : `<p class="hintline">Nenhuma plataforma salva ainda.</p>` }</div>
      <div class="plat-row" style="margin-top:10px">
        <input class="input" id="plNew" placeholder="Nome da nova plataforma" style="flex:1">
        <button class="del" id="plAdd" style="width:auto;padding:0 16px;color:var(--accent)">＋</button>
      </div>
      <div class="btn-row"><button class="btn primary" id="plClose">Concluído</button></div>
    `);
    document.querySelectorAll('#plManage .del').forEach(b=>b.onclick=()=>{
      const arr=DB.plataformas; arr.splice(+b.dataset.i,1); DB.plataformas=arr; render();
    });
    const add=()=>{ const inp=document.getElementById('plNew'); const v=(inp.value||'').trim();
      if(v && !DB.plataformas.includes(v)){ const a=DB.plataformas; a.push(v); DB.plataformas=a; } render(); };
    document.getElementById('plAdd').onclick=add;
    document.getElementById('plNew').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); add(); }});
    document.getElementById('plClose').onclick=()=>{ closeModal(); onClose && onClose(); };
  };
  render();
}
function ganhosFromRec(rec){
  return (rec.ganhos||[{plataforma:'',valor:''}]).map(g=>({
    plataforma:g.plataforma||'', valor:g.valor??'',
    custom: !!g.plataforma && !DB.plataformas.includes(g.plataforma)
  }));
}

/* ================= NOVO REGISTRO ================= */
let novoTipo = 'moto';   // moto | ganho | pessoal
let editingId = null;
routes.novo = (root)=>{
  const isMoto = novoTipo==='moto';
  root.innerHTML = `
    <h1 class="page-title">Novo Registro</h1>
    <p class="page-sub">Adicione os dados do seu dia</p>
    <div class="toggle2">
      <button id="tgMoto" class="${isMoto?'on moto':''}">🏍️ Moto</button>
      <button id="tgPess" class="${!isMoto?'on pessoal':''}">👤 Pessoal</button>
    </div>
    ${!isMoto? `<div class="toggle2" style="margin-top:-8px">
      <button id="subGasto" class="${novoTipo==='pessoal'?'on gasto':''}">💸 Gasto</button>
      <button id="subGanho" class="${novoTipo==='ganho'?'on ganho':''}">💵 Ganho</button>
    </div>`:''}
    <div id="formArea"></div>`;
  document.getElementById('tgMoto').onclick=()=>{novoTipo='moto';go('novo');};
  document.getElementById('tgPess').onclick=()=>{novoTipo=(novoTipo==='ganho'?'ganho':'pessoal');go('novo');};
  if(!isMoto){
    document.getElementById('subGasto').onclick=()=>{novoTipo='pessoal';go('novo');};
    document.getElementById('subGanho').onclick=()=>{novoTipo='ganho';go('novo');};
  }
  if(novoTipo==='moto') formMoto();
  else if(novoTipo==='ganho') formGanho();
  else formPessoal();
};

function formMoto(pre){
  const f = pre || { data:todayISO(), ganhos:[{plataforma:'',valor:''}], km:'', horas:'', gastosRua:'', manutencao:'', combustivel:'', obs:'' };
  const area = document.getElementById('formArea');
  area.innerHTML = `
    <div class="field"><label>Data <span class="req">*</span></label>
      <input class="input" type="date" id="mData" value="${f.data}"></div>

    <div class="block green">
      <div class="section-head" style="margin-bottom:10px">
        <h4 style="margin:0">💰 Ganhos por Plataforma</h4>
        <button id="managePlat" class="linkbtn">⚙️ Gerenciar</button>
      </div>
      <div id="platList"></div>
      <button class="add-line" id="addPlat">＋ Adicionar Outra Plataforma</button>
      <div class="total-line"><span>Total do Dia:</span><span class="v" id="totalDia">R$ 0,00</span></div>
    </div>

    <div class="block blue">
      <h4>📊 Métricas de Trabalho</h4>
      <div class="field"><label>Quilometragem (km)</label>
        <input class="input" inputmode="decimal" id="mKm" placeholder="0.0" value="${f.km}"></div>
      <div class="field" style="margin-bottom:0"><label>Horas Trabalhadas</label>
        <input class="input" id="mHoras" placeholder="Ex: 8.5 ou 836 (8h36m)" value="${f.horas}">
        <div class="hintline">Digite horas decimais (ex: 8.5) ou formato HHMM (ex: 836 = 8h36m)</div></div>
    </div>

    <div class="block red">
      <h4>💸 Despesas</h4>
      <div class="row3">
        <div class="field" style="margin:0"><label>Gastos na Rua</label>
          <input class="input" inputmode="decimal" id="mRua" placeholder="0,00" value="${f.gastosRua}"></div>
        <div class="field" style="margin:0"><label>Manutenção</label>
          <input class="input" inputmode="decimal" id="mManut" placeholder="0,00" value="${f.manutencao}"></div>
        <div class="field" style="margin:0"><label>Combustível</label>
          <input class="input" inputmode="decimal" id="mComb" placeholder="0,00" value="${f.combustivel}"></div>
      </div>
    </div>

    <div class="field"><label>Observações</label>
      <textarea id="mObs" placeholder="Notas sobre o dia...">${esc(f.obs)}</textarea></div>

    <div class="btn-row">
      <button class="btn ghost" id="cancelBtn">Cancelar</button>
      <button class="btn green" id="saveMoto">✓ Salvar Registro</button>
    </div>`;

  const listEl=document.getElementById('platList'), totalEl=document.getElementById('totalDia');
  const items = ganhosFromRec(f);
  const rebuild=()=>buildGanhos(listEl, items, totalEl);
  rebuild();
  document.getElementById('addPlat').onclick=()=>{ items.push({plataforma:'',valor:'',custom:false}); rebuild(); };
  document.getElementById('managePlat').onclick=()=>modalPlataformas(rebuild);
  document.getElementById('cancelBtn').onclick=()=>{ editingId=null; go('painel'); };

  document.getElementById('saveMoto').onclick=()=>{
    persistPlataformas(items);
    const rec = {
      id: editingId||uid(), tipo:'moto',
      data: document.getElementById('mData').value || todayISO(),
      ganhos: items.filter(g=>g.plataforma||num(g.valor)).map(g=>({plataforma:(g.plataforma||'Outros').trim(), valor:num(g.valor)})),
      km: num(document.getElementById('mKm').value),
      horas: parseHoras(document.getElementById('mHoras').value),
      gastosRua: num(document.getElementById('mRua').value),
      manutencao: num(document.getElementById('mManut').value),
      combustivel: num(document.getElementById('mComb').value),
      obs: document.getElementById('mObs').value.trim(),
    };
    let arr = DB.registros;
    if(editingId){ arr = arr.map(r=>r.id===editingId?rec:r); } else arr.unshift(rec);
    DB.registros = arr; editingId=null;
    toast('Registro da moto salvo ✓'); go('historico');
  };
}

function formGanho(pre){
  const f = pre || { data:todayISO(), ganhos:[{plataforma:'',valor:''}], obs:'' };
  const area = document.getElementById('formArea');
  area.innerHTML = `
    <div class="field"><label>Data <span class="req">*</span></label>
      <input class="input" type="date" id="gData" value="${f.data}"></div>

    <div class="block green">
      <div class="section-head" style="margin-bottom:6px">
        <h4 style="margin:0">💵 Ganhos (sem usar a moto)</h4>
        <button id="managePlat" class="linkbtn">⚙️ Gerenciar</button>
      </div>
      <p class="hintline" style="margin:0 0 12px">Registre ganhos avulsos — não exige quilometragem nem horas.</p>
      <div id="gList"></div>
      <button class="add-line" id="gAdd">＋ Adicionar Outro Ganho</button>
      <div class="total-line"><span>Total:</span><span class="v" id="gTotal">R$ 0,00</span></div>
    </div>

    <div class="field"><label>Observações</label>
      <textarea id="gObs" placeholder="Descreva a origem do ganho...">${esc(f.obs)}</textarea></div>

    <div class="btn-row">
      <button class="btn ghost" id="cancelBtn">Cancelar</button>
      <button class="btn green" id="saveGanho">✓ Salvar Ganho</button>
    </div>`;

  const listEl=document.getElementById('gList'), totalEl=document.getElementById('gTotal');
  const items = ganhosFromRec(f);
  const rebuild=()=>buildGanhos(listEl, items, totalEl);
  rebuild();
  document.getElementById('gAdd').onclick=()=>{ items.push({plataforma:'',valor:'',custom:false}); rebuild(); };
  document.getElementById('managePlat').onclick=()=>modalPlataformas(rebuild);
  document.getElementById('cancelBtn').onclick=()=>{ editingId=null; go('painel'); };

  document.getElementById('saveGanho').onclick=()=>{
    const validos = items.filter(g=>g.plataforma||num(g.valor));
    if(!validos.length || validos.reduce((s,g)=>s+num(g.valor),0)<=0){ toast('Informe ao menos um ganho'); return; }
    persistPlataformas(items);
    const rec = {
      id: editingId||uid(), tipo:'ganho',
      data: document.getElementById('gData').value || todayISO(),
      ganhos: validos.map(g=>({plataforma:(g.plataforma||'Outros').trim(), valor:num(g.valor)})),
      obs: document.getElementById('gObs').value.trim(),
    };
    let arr = DB.registros;
    if(editingId){ arr = arr.map(r=>r.id===editingId?rec:r); } else arr.unshift(rec);
    DB.registros = arr; editingId=null;
    toast('Ganho salvo ✓'); go('historico');
  };
}

function formPessoal(pre){
  const f = pre || { data:todayISO(), categoria:'alimentacao', valor:'', descricao:'', obs:'', pagamento:'PIX' };
  const area = document.getElementById('formArea');
  area.innerHTML = `
    <div class="field"><label>Data <span class="req">*</span></label>
      <input class="input" type="date" id="pData" value="${f.data}"></div>

    <div class="block amber">
      <h4>👤 Gasto Pessoal</h4>
      <div class="field"><label>Categoria</label>
        <div class="seg" id="catSeg">${CAT_PESSOAL.map(c=>`
          <label><input type="radio" name="cat" value="${c.id}" ${c.id===f.categoria?'checked':''}>
          <span>${c.ico} ${c.nome}</span></label>`).join('')}</div></div>
      <div class="field"><label>Valor <span class="req">*</span></label>
        <input class="input" inputmode="decimal" id="pValor" placeholder="R$ 0,00" value="${f.valor}"></div>
      <div class="field" style="margin-bottom:0"><label>Descrição</label>
        <input class="input" id="pDesc" placeholder="Ex: Almoço, conta de luz..." value="${esc(f.descricao)}"></div>
    </div>

    <div class="field"><label>Forma de Pagamento</label>
      <select id="pPag">
        ${['PIX','Dinheiro','Cartão Débito','Cartão Crédito'].map(o=>`<option ${o===f.pagamento?'selected':''}>${o}</option>`).join('')}
      </select></div>

    <div class="field"><label>Observações</label>
      <textarea id="pObs" placeholder="Notas...">${esc(f.obs)}</textarea></div>

    <div class="btn-row">
      <button class="btn ghost" id="cancelBtn">Cancelar</button>
      <button class="btn green" id="savePess">✓ Salvar Gasto</button>
    </div>`;
  document.getElementById('cancelBtn').onclick=()=>{ editingId=null; go('painel'); };
  document.getElementById('savePess').onclick=()=>{
    const valor = num(document.getElementById('pValor').value);
    if(valor<=0){ toast('Informe um valor válido'); return; }
    const rec = {
      id: editingId||uid(), tipo:'pessoal',
      data: document.getElementById('pData').value || todayISO(),
      categoria: document.querySelector('input[name=cat]:checked').value,
      valor, descricao: document.getElementById('pDesc').value.trim(),
      pagamento: document.getElementById('pPag').value,
      obs: document.getElementById('pObs').value.trim(),
    };
    let arr = DB.registros;
    if(editingId){ arr = arr.map(r=>r.id===editingId?rec:r); } else arr.unshift(rec);
    DB.registros = arr; editingId=null;
    toast('Gasto pessoal salvo ✓'); go('historico');
  };
}

/* ================= HISTÓRICO ================= */
let histFiltro='todas', histBusca='';
function histListData(){
  let regs = DB.registros.slice().sort((a,b)=> (a.data<b.data?1:-1));
  if(histFiltro!=='todas') regs=regs.filter(r=>r.tipo===histFiltro);
  if(histBusca){ const q=histBusca.toLowerCase(); regs=regs.filter(r=> JSON.stringify(r).toLowerCase().includes(q)); }
  return regs;
}
routes.historico = (root)=>{
  const regs = histListData();
  root.innerHTML = `
    <h1 class="page-title">Histórico</h1>
    <p class="page-sub">${regs.length} registro(s) — moto, ganhos e pessoais</p>
    <div class="search"><span class="mag">🔎</span>
      <input class="input" id="hBusca" placeholder="Buscar..." value="${esc(histBusca)}"></div>
    <div class="filters">
      <button class="chip ${histFiltro==='todas'?'on':''}" data-f="todas">Todas</button>
      <button class="chip ${histFiltro==='moto'?'on':''}" data-f="moto">🏍️ Moto</button>
      <button class="chip ${histFiltro==='ganho'?'on':''}" data-f="ganho">💵 Ganhos</button>
      <button class="chip ${histFiltro==='pessoal'?'on':''}" data-f="pessoal">👤 Pessoais</button>
    </div>
    <div id="histList">${regs.length? regs.map(recCard).join('') : `<div class="empty"><div class="big">🗒️</div><p>Nenhum registro ainda</p></div>`}</div>`;

  document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{histFiltro=c.dataset.f;go('historico');});
  document.getElementById('hBusca').oninput=e=>{
    histBusca=e.target.value;
    const rr=histListData(); const l=document.getElementById('histList');
    l.innerHTML = rr.length? rr.map(recCard).join(''):`<div class="empty"><div class="big">🗒️</div><p>Nada encontrado</p></div>`;
    bindRecActions();
  };
  bindRecActions();
};

function recCard(r){
  if(r.tipo==='moto'){
    const c=calcReg(r);
    return `<div class="rec moto">
      <div class="rhead"><span class="date">📅 ${fmtDate(r.data)}</span><span class="badge moto">MOTO</span></div>
      <div class="rgrid">
        <div class="it"><div class="k">📈 Ganhos</div><div class="vv accent">${money(c.ganhos)}</div></div>
        <div class="it"><div class="k">📉 Despesas</div><div class="vv red">${money(c.desp)}</div></div>
        <div class="it"><div class="k">💲 Lucro Líquido</div><div class="vv green">${money(c.lucro)}</div></div>
        <div class="it"><div class="k">⏱ Média/Hora</div><div class="vv">${money(c.mediaHora)}</div></div>
      </div>
      <div class="meta"><span>⏱ ${c.horas.toFixed(1)} horas</span><span>➤ ${c.km.toFixed(1)} km</span><span>⛽ ${money(r.combustivel)} comb.</span></div>
      ${r.obs?`<div class="obs">📝 ${esc(r.obs)}</div>`:''}
      ${actionsHTML(r.id)}</div>`;
  } else if(r.tipo==='ganho'){
    const total=somaGanhos(r);
    const fontes=(r.ganhos||[]).map(g=>`${esc(g.plataforma||'Outros')}: ${money(g.valor)}`).join(' · ');
    return `<div class="rec ganho">
      <div class="rhead"><span class="date">📅 ${fmtDate(r.data)}</span><span class="badge ganho">GANHO EXTRA</span></div>
      <div class="rgrid">
        <div class="it"><div class="k">💵 Total recebido</div><div class="vv green">${money(total)}</div></div>
        <div class="it"><div class="k">🏷️ Fontes</div><div class="vv" style="font-size:13px">${(r.ganhos||[]).length}</div></div>
      </div>
      <div class="meta"><span>${fontes}</span></div>
      ${r.obs?`<div class="obs">📝 ${esc(r.obs)}</div>`:''}
      ${actionsHTML(r.id)}</div>`;
  } else {
    const ci=catInfo(r.categoria);
    return `<div class="rec pessoal">
      <div class="rhead"><span class="date">📅 ${fmtDate(r.data)}</span><span class="badge pessoal">PESSOAL</span></div>
      <div class="rgrid">
        <div class="it"><div class="k">${ci.ico} ${ci.nome}</div><div class="vv red">${money(r.valor)}</div></div>
        <div class="it"><div class="k">💳 Pagamento</div><div class="vv" style="font-size:14px">${esc(r.pagamento||'-')}</div></div>
      </div>
      ${r.descricao?`<div class="meta"><span>${esc(r.descricao)}</span></div>`:''}
      ${r.obs?`<div class="obs">📝 ${esc(r.obs)}</div>`:''}
      ${actionsHTML(r.id)}</div>`;
  }
}
function actionsHTML(id){
  return `<div class="rec-actions"><button class="ed" data-ed="${id}">✏️ Editar</button>
    <button class="rm" data-rm="${id}">🗑️ Excluir</button></div>`;
}
function bindRecActions(){
  document.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{
    const r=DB.registros.find(x=>x.id===b.dataset.ed); editingId=r.id; novoTipo=r.tipo; go('novo');
    setTimeout(()=>{ if(r.tipo==='moto')formMoto(r); else if(r.tipo==='ganho')formGanho(r); else formPessoal(r); },0);
  });
  document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
    if(confirm('Excluir este registro?')){ DB.registros = DB.registros.filter(x=>x.id!==b.dataset.rm); toast('Registro excluído'); go('historico'); }
  });
}

/* ================= MANUTENÇÃO ================= */
routes.manutencao = (root)=>{
  const itens = DB.manutencao.slice().sort((a,b)=> (a.status==='ativo'?-1:1) - (b.status==='ativo'?-1:1));
  const totalGasto = DB.manutencao.reduce((s,m)=>s+num(m.custo),0);
  const ativos = DB.manutencao.filter(m=>m.status==='ativo').length;

  root.innerHTML = `
    <h1 class="page-title">Manutenção</h1>
    <p class="page-sub">Acompanhe a vida útil das peças da sua moto</p>
    <div class="metrics">
      ${metric('Peças em uso','b','🔧',ativos,'Em acompanhamento')}
      ${metric('Total gasto','r','💸',money(totalGasto),'Em peças e serviços')}
    </div>
    <button class="btn primary" id="addPeca" style="margin-top:16px">＋ Nova Peça / Serviço</button>
    <div id="pecaList" style="margin-top:16px">
      ${itens.length? itens.map(pecaCard).join('') : `<div class="empty"><div class="big">🔧</div><p>Nenhuma peça registrada.<br>Ex: pneu, óleo, corrente, pastilha...</p></div>`}
    </div>`;
  document.getElementById('addPeca').onclick=()=>modalPeca();
  bindPecaActions();
};
function pecaCard(m){
  const kmInicio=num(m.kmInicio), kmAtual=num(m.kmAtual||m.kmInicio), kmTroca=num(m.kmVidaUtil);
  const rodado = Math.max(0, kmAtual-kmInicio);
  const pct = kmTroca? Math.min(120, rodado/kmTroca*100) : 0;
  let barCls='', pillCls='ok', pillTxt='Em uso';
  if(m.status==='trocado'){ pillCls='end'; pillTxt='Finalizado'; barCls='over'; }
  else if(kmTroca && rodado>=kmTroca){ pillCls='warn'; pillTxt='Trocar!'; barCls='over'; }
  else if(kmTroca && pct>=80){ pillCls='warn'; pillTxt='Atenção'; barCls='warn'; }
  return `<div class="peca">
    <div class="ph"><span class="pname">${esc(m.peca)}</span><span class="pill ${pillCls}">${pillTxt}</span></div>
    <div class="pmeta"><span>Rodou <strong>${rodado.toLocaleString('pt-BR')} km</strong></span>
      <span>${kmTroca? 'Meta: '+kmTroca.toLocaleString('pt-BR')+' km':'Sem meta de km'}</span></div>
    ${kmTroca? `<div class="kmbar"><i class="${barCls}" style="width:${Math.max(3,pct)}%"></i></div>`:''}
    <div class="pmeta" style="margin-top:6px">
      <span>🏁 Início: ${kmInicio.toLocaleString('pt-BR')} km${m.dataInicio?' • '+fmtDate(m.dataInicio):''}</span>
      <span>💰 ${money(m.custo)}</span></div>
    ${m.obs?`<div class="obs">📝 ${esc(m.obs)}</div>`:''}
    <div class="rec-actions">
      ${m.status!=='trocado'?`<button class="ed" data-upd="${m.id}">📍 Atualizar KM</button>`:''}
      <button class="ed" data-edp="${m.id}">✏️ Editar</button>
      <button class="rm" data-rmp="${m.id}">🗑️ Excluir</button>
    </div></div>`;
}
function bindPecaActions(){
  document.querySelectorAll('[data-edp]').forEach(b=>b.onclick=()=>modalPeca(DB.manutencao.find(m=>m.id===b.dataset.edp)));
  document.querySelectorAll('[data-rmp]').forEach(b=>b.onclick=()=>{
    if(confirm('Excluir esta peça?')){ DB.manutencao=DB.manutencao.filter(m=>m.id!==b.dataset.rmp); toast('Excluído'); go('manutencao'); }});
  document.querySelectorAll('[data-upd]').forEach(b=>b.onclick=()=>modalAtualizarKm(DB.manutencao.find(m=>m.id===b.dataset.upd)));
}
function modalPeca(pre){
  const m = pre || { peca:'', kmInicio:'', kmAtual:'', kmVidaUtil:'', custo:'', dataInicio:todayISO(), obs:'', status:'ativo' };
  openModal(`
    <h3>${pre?'Editar Peça':'Nova Peça / Serviço'}</h3>
    <p class="msub">Registre a peça e acompanhe quantos km ela aguenta</p>
    <div class="field"><label>Peça / Serviço <span class="req">*</span></label>
      <input class="input" id="kPeca" placeholder="Ex: Pneu traseiro, Óleo, Corrente..." value="${esc(m.peca)}"></div>
    <div class="row2">
      <div class="field"><label>KM inicial <span class="req">*</span></label>
        <input class="input" inputmode="numeric" id="kIni" placeholder="0" value="${m.kmInicio}"></div>
      <div class="field"><label>KM atual</label>
        <input class="input" inputmode="numeric" id="kAtual" placeholder="0" value="${m.kmAtual}"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Vida útil estimada (km)</label>
        <input class="input" inputmode="numeric" id="kVida" placeholder="Ex: 15000" value="${m.kmVidaUtil}"></div>
      <div class="field"><label>Custo (R$)</label>
        <input class="input" inputmode="decimal" id="kCusto" placeholder="0,00" value="${m.custo}"></div>
    </div>
    <div class="field"><label>Data de instalação</label>
      <input class="input" type="date" id="kData" value="${m.dataInicio}"></div>
    <div class="field"><label>Observações</label>
      <textarea id="kObs" placeholder="Marca, oficina, garantia...">${esc(m.obs)}</textarea></div>
    <div class="btn-row">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" id="kSave">Salvar</button>
    </div>`);
  document.getElementById('kSave').onclick=()=>{
    const peca=document.getElementById('kPeca').value.trim();
    if(!peca){ toast('Informe o nome da peça'); return; }
    const kmIni=num(document.getElementById('kIni').value);
    const obj={ id:m.id||uid(), peca,
      kmInicio:kmIni, kmAtual:num(document.getElementById('kAtual').value)||kmIni,
      kmVidaUtil:num(document.getElementById('kVida').value),
      custo:num(document.getElementById('kCusto').value),
      dataInicio:document.getElementById('kData').value||todayISO(),
      obs:document.getElementById('kObs').value.trim(),
      status:m.status||'ativo' };
    let arr=DB.manutencao;
    arr = m.id? arr.map(x=>x.id===m.id?obj:x) : [obj,...arr];
    DB.manutencao=arr; closeModal(); toast('Peça salva ✓'); go('manutencao');
  };
}
function modalAtualizarKm(m){
  openModal(`
    <h3>Atualizar — ${esc(m.peca)}</h3>
    <p class="msub">Informe a quilometragem atual da moto</p>
    <div class="field"><label>KM atual</label>
      <input class="input" inputmode="numeric" id="uKm" value="${m.kmAtual||m.kmInicio}"></div>
    <div class="field"><label><input type="checkbox" id="uTroca"> Marcar como trocada/finalizada</label></div>
    <div class="btn-row">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" id="uSave">Salvar</button>
    </div>`);
  document.getElementById('uSave').onclick=()=>{
    m.kmAtual=num(document.getElementById('uKm').value);
    if(document.getElementById('uTroca').checked) m.status='trocado';
    DB.manutencao = DB.manutencao.map(x=>x.id===m.id?m:x);
    closeModal(); toast('Atualizado ✓'); go('manutencao');
  };
}

/* ================= ORÇAMENTO ================= */
const TIPOS_ENTREGA = [
  {id:'documento', nome:'Documento', base:8},
  {id:'pequena', nome:'Encomenda Pequena', base:12},
  {id:'media', nome:'Encomenda Média', base:18},
  {id:'grande', nome:'Encomenda Grande', base:25},
  {id:'expressa', nome:'Entrega Expressa', base:30},
];
const TAXA_KM = 2.5;      // R$ por km
const TAXA_ESPERA = 0.5;  // R$ por minuto

routes.orcamento = (root)=>{
  const orcs = DB.orcamentos.slice().sort((a,b)=>(a.criado<b.criado?1:-1));
  const aceitos = orcs.filter(o=>o.status==='aceito');
  const enviados = orcs.filter(o=>o.status==='enviado').length;
  const recusados= orcs.filter(o=>o.status==='recusado').length;
  const faturado = aceitos.reduce((s,o)=>s+num(o.valor),0);
  const taxa = (aceitos.length+enviados+recusados)? Math.round(aceitos.length/(aceitos.length+enviados+recusados)*100):0;

  root.innerHTML = `
    <h1 class="page-title">Orçamento</h1>
    <p class="page-sub">Crie e gerencie orçamentos para seus clientes</p>
    <div class="metrics">
      ${metric('Total Faturado','g','$',money(faturado),aceitos.length+' aceitos')}
      ${metric('Enviados','b','👥',enviados,'Aguardando')}
      ${metric('Aceitos','p','✓',aceitos.length,'Fechados')}
      ${metric('Taxa Conversão','a','📈',taxa+'%','Aceitos/Total')}
    </div>
    <button class="btn primary" id="addOrc" style="margin-top:16px">＋ Novo Orçamento</button>
    <div id="orcList" style="margin-top:16px">
      ${orcs.length? orcs.map(orcCard).join('') : `<div class="empty"><div class="big">🧾</div><p>Nenhum orçamento criado ainda</p></div>`}
    </div>`;
  document.getElementById('addOrc').onclick=()=>modalOrc();
  bindOrcActions();
};
function orcCard(o){
  const t=TIPOS_ENTREGA.find(x=>x.id===o.tipoEntrega);
  return `<div class="orc">
    <div class="oh"><div><div class="cli">${esc(o.cliente||'Cliente')}</div>
      <div style="font-size:12px;color:var(--muted)">${esc(t?t.nome:'')} • ${num(o.distancia)} km • ${esc(o.pagamento||'')}</div></div>
      <div class="val">${money(o.valor)}</div></div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px">📍 ${esc(o.origem)} → ${esc(o.destino)}</div>
    ${o.telefone?`<div style="font-size:12px;color:var(--muted);margin-top:4px">📱 ${esc(o.telefone)}</div>`:''}
    <div class="status-row">
      <button class="act-env ${o.status==='enviado'?'on':''}" data-st="enviado" data-id="${o.id}">Enviado</button>
      <button class="act-ace ${o.status==='aceito'?'on':''}" data-st="aceito" data-id="${o.id}">Aceito</button>
      <button class="act-rec ${o.status==='recusado'?'on':''}" data-st="recusado" data-id="${o.id}">Recusado</button>
    </div>
    <div class="rec-actions">
      <button class="ed" data-shareo="${o.id}">📤 Compartilhar</button>
      <button class="ed" data-edo="${o.id}">✏️ Editar</button>
      <button class="rm" data-rmo="${o.id}">🗑️ Excluir</button>
    </div></div>`;
}
function bindOrcActions(){
  document.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{
    DB.orcamentos = DB.orcamentos.map(o=>o.id===b.dataset.id?{...o,status:b.dataset.st}:o); go('orcamento');});
  document.querySelectorAll('[data-edo]').forEach(b=>b.onclick=()=>modalOrc(DB.orcamentos.find(o=>o.id===b.dataset.edo)));
  document.querySelectorAll('[data-rmo]').forEach(b=>b.onclick=()=>{
    if(confirm('Excluir orçamento?')){ DB.orcamentos=DB.orcamentos.filter(o=>o.id!==b.dataset.rmo); go('orcamento'); }});
  document.querySelectorAll('[data-shareo]').forEach(b=>b.onclick=()=>shareOrc(DB.orcamentos.find(o=>o.id===b.dataset.shareo)));
}
function calcOrc(d){
  const t=TIPOS_ENTREGA.find(x=>x.id===d.tipoEntrega)||TIPOS_ENTREGA[0];
  let v = t.base + num(d.distancia)*TAXA_KM + num(d.espera)*TAXA_ESPERA;
  if(num(d.peso)>5) v += (num(d.peso)-5)*1.5;
  if(d.urgente) v *= 1.10;
  return Math.round(v*100)/100;
}
function modalOrc(pre){
  const d = pre || { origem:'',destino:'',distancia:'',tempo:'',tipoEntrega:'documento',peso:'',descricao:'',
    urgente:false,espera:'',cliente:'',telefone:'',email:'',pagamento:'PIX',status:'enviado' };
  openModal(`
    <h3>${pre?'Editar Orçamento':'Novo Orçamento'}</h3>
    <p class="msub">Preencha os dados da entrega para gerar o orçamento</p>
    <div class="sectitle">Origem e destino</div>
    <div class="field"><label>Endereço de retirada <span class="req">*</span></label>
      <input class="input" id="oOrig" placeholder="Ex: Rua ABC, 123 - Centro" value="${esc(d.origem)}"></div>
    <div class="field"><label>Endereço de entrega <span class="req">*</span></label>
      <input class="input" id="oDest" placeholder="Ex: Av XYZ, 456 - Jardim" value="${esc(d.destino)}"></div>
    <div class="row2">
      <div class="field"><label>Distância (km) <span class="req">*</span></label>
        <input class="input" inputmode="decimal" id="oDist" placeholder="0" value="${d.distancia}"></div>
      <div class="field"><label>Tempo estimado (min)</label>
        <input class="input" inputmode="numeric" id="oTempo" placeholder="0" value="${d.tempo}"></div>
    </div>
    <div class="sectitle">Detalhes da entrega</div>
    <div class="field"><label>Tipo de entrega <span class="req">*</span></label>
      <div class="seg" id="oTipo">${TIPOS_ENTREGA.map(t=>`
        <label><input type="radio" name="otipo" value="${t.id}" ${t.id===d.tipoEntrega?'checked':''}>
        <span>${t.nome}</span></label>`).join('')}</div></div>
    <div class="row2">
      <div class="field"><label>Peso estimado (kg)</label>
        <input class="input" inputmode="decimal" id="oPeso" placeholder="0" value="${d.peso}"></div>
      <div class="field"><label>Espera no local (min)</label>
        <input class="input" inputmode="numeric" id="oEsp" placeholder="0" value="${d.espera}"></div>
    </div>
    <div class="field"><label><input type="checkbox" id="oUrg" ${d.urgente?'checked':''}> Entrega urgente (+10%)</label></div>
    <div class="field"><label>Descrição / observações</label>
      <textarea id="oDesc" placeholder="Observações sobre a entrega...">${esc(d.descricao)}</textarea></div>

    <div class="block green"><div class="total-line"><span>💲 Valor Total:</span><span class="v" id="oValor">R$ 0,00</span></div></div>

    <div class="sectitle">Informações do solicitante</div>
    <div class="field"><label>Nome do cliente <span class="req">*</span></label>
      <input class="input" id="oCli" placeholder="Nome completo" value="${esc(d.cliente)}"></div>
    <div class="row2">
      <div class="field"><label>Telefone / WhatsApp <span class="req">*</span></label>
        <input class="input" inputmode="tel" id="oTel" placeholder="(11) 99999-9999" value="${esc(d.telefone)}"></div>
      <div class="field"><label>E-mail</label>
        <input class="input" id="oEmail" placeholder="cliente@email.com" value="${esc(d.email)}"></div>
    </div>
    <div class="field"><label>Forma de pagamento <span class="req">*</span></label>
      <select id="oPag">${['PIX','Dinheiro','Cartão'].map(o=>`<option ${o===d.pagamento?'selected':''}>${o}</option>`).join('')}</select></div>

    <div class="btn-row">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" id="oSave">Salvar Orçamento</button>
    </div>`);
  const recalc=()=>{
    const d2={ tipoEntrega:document.querySelector('input[name=otipo]:checked').value,
      distancia:document.getElementById('oDist').value, espera:document.getElementById('oEsp').value,
      peso:document.getElementById('oPeso').value, urgente:document.getElementById('oUrg').checked };
    document.getElementById('oValor').textContent = money(calcOrc(d2));
  };
  ['oDist','oEsp','oPeso'].forEach(id=>document.getElementById(id).oninput=recalc);
  document.getElementById('oUrg').onchange=recalc;
  document.querySelectorAll('input[name=otipo]').forEach(r=>r.onchange=recalc);
  recalc();

  document.getElementById('oSave').onclick=()=>{
    const obj={ id:d.id||uid(), criado:d.criado||new Date().toISOString(),
      origem:document.getElementById('oOrig').value.trim(),
      destino:document.getElementById('oDest').value.trim(),
      distancia:num(document.getElementById('oDist').value),
      tempo:num(document.getElementById('oTempo').value),
      tipoEntrega:document.querySelector('input[name=otipo]:checked').value,
      peso:num(document.getElementById('oPeso').value),
      espera:num(document.getElementById('oEsp').value),
      urgente:document.getElementById('oUrg').checked,
      descricao:document.getElementById('oDesc').value.trim(),
      cliente:document.getElementById('oCli').value.trim(),
      telefone:document.getElementById('oTel').value.trim(),
      email:document.getElementById('oEmail').value.trim(),
      pagamento:document.getElementById('oPag').value,
      status:d.status||'enviado' };
    if(!obj.cliente||!obj.origem||!obj.destino){ toast('Preencha cliente, origem e destino'); return; }
    obj.valor=calcOrc(obj);
    DB.orcamentos = d.id? DB.orcamentos.map(o=>o.id===d.id?obj:o) : [obj,...DB.orcamentos];
    closeModal(); toast('Orçamento salvo ✓'); go('orcamento');
  };
}
function shareOrc(o){
  const t=TIPOS_ENTREGA.find(x=>x.id===o.tipoEntrega);
  const txt = `*Orçamento de Entrega — Oro's hub*\n\n`+
    `👤 Cliente: ${o.cliente}\n📍 Retirada: ${o.origem}\n🏁 Entrega: ${o.destino}\n`+
    `📦 Tipo: ${t?t.nome:''}\n➤ Distância: ${o.distancia} km\n`+
    (o.urgente?`⚡ Entrega urgente\n`:'')+
    `💳 Pagamento: ${o.pagamento}\n\n*💰 Valor total: ${money(o.valor)}*`;
  if(navigator.share){ navigator.share({title:'Orçamento', text:txt}).catch(()=>{}); }
  else { navigator.clipboard?.writeText(txt); toast('Orçamento copiado!'); }
}

/* ================= MODAL helpers ================= */
function openModal(html){
  const root=document.getElementById('modalRoot');
  root.innerHTML=`<div class="modal-bg" id="mbg"><div class="modal">${html}</div></div>`;
  document.getElementById('mbg').onclick=e=>{ if(e.target.id==='mbg') closeModal(); };
}
function closeModal(){ document.getElementById('modalRoot').innerHTML=''; }
window.closeModal=closeModal;

/* ================= GARAGEM (menu lateral esquerdo) ================= */
function openGaragem(){
  closeGaragem();
  const d=document.createElement('div');
  d.className='drawer-bg'; d.id='garagem';
  d.innerHTML=`
    <aside class="drawer" onclick="event.stopPropagation()">
      <div class="drawer-head">
        <div class="drawer-logo"><span class="oro">Oro's</span><span class="hub">hub</span></div>
        <div class="drawer-title">🔧 Garagem</div>
        <div class="drawer-sub">Ferramentas e novas funções</div>
      </div>
      <nav class="drawer-list">
        <button class="drawer-item" data-go="habitos">
          <span class="di-ico">🎯</span>
          <span class="di-tx"><strong>Metas & Hábitos</strong><small>Planner diário e hábitos</small></span>
          <span class="di-arrow">›</span>
        </button>
        <button class="drawer-item" data-go="painel">
          <span class="di-ico">📊</span>
          <span class="di-tx"><strong>Painel financeiro</strong><small>Ganhos, gastos e médias</small></span>
          <span class="di-arrow">›</span>
        </button>
        <div class="drawer-soon">
          <div class="ds-title">Em breve</div>
          <div class="ds-tags"><span>📅 Agenda</span><span>⛽ Consumo/L</span><span>🏆 Conquistas</span></div>
          <p class="hintline" style="margin-top:8px">Novas funções vão aparecer aqui na sua Garagem.</p>
        </div>
      </nav>
      <button class="drawer-theme" id="drawerTheme">🌗 Alternar tema (escuro/claro)</button>
    </aside>`;
  d.onclick=closeGaragem;
  document.getElementById('modalRoot').appendChild(d);
  requestAnimationFrame(()=>d.classList.add('show'));
  d.querySelectorAll('.drawer-item').forEach(b=>b.onclick=()=>{ closeGaragem(); go(b.dataset.go); });
  document.getElementById('drawerTheme').onclick=()=>{ THEME=THEME==='dark'?'light':'dark'; applyTheme(THEME); };
}
function closeGaragem(){ const g=document.getElementById('garagem'); if(g){ g.classList.remove('show'); setTimeout(()=>g.remove(),220); } }
document.getElementById('menuBtn').onclick=openGaragem;

/* ================= MÓDULO: Metas & Hábitos ================= */
routes.habitos = (root)=>{
  const hoje=todayISO();
  const habitos=DB.habitos;
  root.innerHTML=`
    <button class="back-btn" id="backHab">‹ Voltar ao Painel</button>
    <h1 class="page-title">Metas & Hábitos</h1>
    <p class="page-sub">${fmtDate(hoje)} • marque o que cumpriu hoje</p>
    <div class="block amber" style="margin-bottom:16px">
      <h4>➕ Novo hábito / meta</h4>
      <div class="plat-row" style="margin-bottom:0">
        <input class="input" id="habNome" placeholder="Ex: Beber 2L de água" style="flex:1">
        <button class="del" id="habAdd" style="width:auto;padding:0 16px;color:var(--accent)">＋</button>
      </div>
    </div>
    <div id="habList">${ habitos.length? habitos.map(habCard).join('') : `<div class="empty"><div class="big">🎯</div><p>Nenhum hábito ainda.<br>Adicione metas diárias para acompanhar.</p></div>` }</div>`;
  document.getElementById('backHab').onclick=()=>go('painel');
  const addHab=()=>{ const nome=document.getElementById('habNome').value.trim(); if(!nome) return;
    const arr=DB.habitos; arr.unshift({id:uid(),nome,dias:{}}); DB.habitos=arr; go('habitos'); };
  document.getElementById('habAdd').onclick=addHab;
  document.getElementById('habNome').addEventListener('keydown',e=>{ if(e.key==='Enter'){e.preventDefault();addHab();} });
  bindHabActions();
};
function habStreak(h){
  let s=0; const d=new Date();
  for(;;){ const iso=d.toISOString().slice(0,10); if(h.dias&&h.dias[iso]){ s++; d.setDate(d.getDate()-1); } else break; }
  return s;
}
function habCard(h){
  const hoje=todayISO(); const done=!!(h.dias&&h.dias[hoje]); const st=habStreak(h);
  return `<div class="hab ${done?'done':''}">
    <button class="hab-check ${done?'on':''}" data-tg="${h.id}">${done?'✓':''}</button>
    <div class="hab-tx"><strong>${esc(h.nome)}</strong><small>🔥 ${st} dia(s) seguidos</small></div>
    <button class="hab-del" data-del="${h.id}">🗑️</button>
  </div>`;
}
function bindHabActions(){
  document.querySelectorAll('[data-tg]').forEach(b=>b.onclick=()=>{
    const arr=DB.habitos; const h=arr.find(x=>x.id===b.dataset.tg); const hoje=todayISO();
    h.dias=h.dias||{}; if(h.dias[hoje]) delete h.dias[hoje]; else h.dias[hoje]=true;
    DB.habitos=arr; go('habitos');
  });
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(confirm('Excluir este hábito?')){ DB.habitos=DB.habitos.filter(x=>x.id!==b.dataset.del); go('habitos'); }
  });
}

/* ================= Período (header) ================= */
function periodoLabelTexto(){
  if(PERIODO==='custom') return (PERIODO_INI?fmtDate(PERIODO_INI):'…')+' – '+(PERIODO_FIM?fmtDate(PERIODO_FIM):'…');
  return PERIODO==='mes'?'Este Mês' : PERIODO==='semana'?'Últimos 7 dias' : 'Todos os Períodos';
}
function setPeriodo(p, ini, fim){
  PERIODO=p; PERIODO_INI=ini||''; PERIODO_FIM=fim||'';
  document.getElementById('periodoLabel').textContent = periodoLabelTexto();
  go(current);
}
function openPeriodoPopover(){
  closePeriodoPopover();
  const pop=document.createElement('div');
  pop.className='popover-bg'; pop.id='perPop';
  pop.innerHTML=`
    <div class="popover" onclick="event.stopPropagation()">
      <div class="pop-title">Período</div>
      <div class="pop-chips">
        <button class="chip ${PERIODO==='todos'?'on':''}" data-p="todos">Todos</button>
        <button class="chip ${PERIODO==='mes'?'on':''}" data-p="mes">Este mês</button>
        <button class="chip ${PERIODO==='semana'?'on':''}" data-p="semana">7 dias</button>
      </div>
      <div class="pop-sub">Intervalo personalizado</div>
      <div class="row2">
        <div class="field" style="margin:0"><label>De</label><input class="input" type="date" id="perIni" value="${PERIODO==='custom'?PERIODO_INI:''}"></div>
        <div class="field" style="margin:0"><label>Até</label><input class="input" type="date" id="perFim" value="${PERIODO==='custom'?PERIODO_FIM:''}"></div>
      </div>
      <button class="btn primary" id="perApply" style="margin-top:12px">Aplicar intervalo</button>
    </div>`;
  pop.onclick=closePeriodoPopover;
  document.getElementById('modalRoot').appendChild(pop);
  requestAnimationFrame(()=>pop.classList.add('show'));
  pop.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{ setPeriodo(c.dataset.p); closePeriodoPopover(); });
  document.getElementById('perApply').onclick=()=>{
    const ini=document.getElementById('perIni').value, fim=document.getElementById('perFim').value;
    if(!ini && !fim){ toast('Escolha ao menos uma data'); return; }
    if(ini && fim && ini>fim){ toast('A data inicial é depois da final'); return; }
    setPeriodo('custom', ini, fim); closePeriodoPopover();
  };
}
function closePeriodoPopover(){ const p=document.getElementById('perPop'); if(p) p.remove(); }
document.getElementById('periodoBtn').onclick=openPeriodoPopover;

/* ================= Backup / Restauração (JSON) ================= */
function exportBackup(){
  const data={ app:"oros-hub", versao:1, exportadoEm:new Date().toISOString(),
    registros:DB.registros, manutencao:DB.manutencao, orcamentos:DB.orcamentos, plataformas:DB.plataformas, habitos:DB.habitos };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='oros-hub-backup-'+todayISO()+'.json'; a.click();
  toast('Backup salvo ✓ — guarde o arquivo!');
}
function importBackup(file){
  const r=new FileReader();
  r.onload=()=>{
    let d; try{ d=JSON.parse(r.result); }catch(e){ alert('Arquivo de backup inválido.'); return; }
    if(!d || (d.registros===undefined && d.manutencao===undefined && d.orcamentos===undefined)){
      alert('Este arquivo não parece ser um backup do Oro\'s hub.'); return; }
    const qtd=(d.registros||[]).length;
    if(!confirm('Restaurar este backup?\n\n'+qtd+' registro(s) serão carregados e SUBSTITUIRÃO os dados atuais deste aparelho.')) return;
    if(Array.isArray(d.registros))  DB.registros  = d.registros;
    if(Array.isArray(d.manutencao)) DB.manutencao = d.manutencao;
    if(Array.isArray(d.orcamentos)) DB.orcamentos = d.orcamentos;
    if(Array.isArray(d.plataformas))DB.plataformas= d.plataformas;
    if(Array.isArray(d.habitos))    DB.habitos    = d.habitos;
    toast('Backup restaurado ✓'); go('painel');
  };
  r.readAsText(file);
}

/* ================= Exportar CSV ================= */
function exportCSV(){
  const rows=[['Tipo','Data','Categoria/Plataformas','Ganhos','Despesas','KM','Horas','Obs']];
  DB.registros.forEach(r=>{
    if(r.tipo==='moto'){ const c=calcReg(r);
      rows.push(['Moto',r.data,(r.ganhos||[]).map(g=>g.plataforma+'='+g.valor).join('|'),c.ganhos.toFixed(2),c.desp.toFixed(2),c.km,c.horas,r.obs||'']);
    } else if(r.tipo==='ganho'){
      rows.push(['Ganho Extra',r.data,(r.ganhos||[]).map(g=>g.plataforma+'='+g.valor).join('|'),somaGanhos(r).toFixed(2),'','','',r.obs||'']);
    } else rows.push(['Pessoal',r.data,catInfo(r.categoria).nome,'',num(r.valor).toFixed(2),'','',r.descricao||r.obs||'']);
  });
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob(["﻿"+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='oros-hub-motoboy.csv'; a.click(); toast('CSV exportado ✓');
}

/* ================= Boot ================= */
if('serviceWorker' in navigator){
  window.addEventListener('load',()=> navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
go('painel');
requestAnimationFrame(moveIndicator);
window.addEventListener('load', ()=> setTimeout(moveIndicator, 60));
