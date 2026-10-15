(() => {
// true = publica só perfis com "Revisão" marcada na planilha; false = publica todos os "Feito" (os não revisados ganham o selo "Em revisão")
const SOMENTE_REVISADOS = false;

const $ = s => document.querySelector(s);
const view = $("#view");
const TODOS = window.DADOS || [];
const D = TODOS.filter(p => !SOMENTE_REVISADOS || p.revisado);
const PRONTOS = D.filter(p => p.pronto);
const R = window.RESULTADO;
const COR = ["#1f4fd8","#65a59c","#5d85ed","#8cc671","#427cad","#338e22","#99a3b7","#c5ccdc"];
const COR_PARTIDO = {PL:"#1b2f6b",PT:"#d1202f","União":"#4aa3df",PSD:"#f5a623",PP:"#d9541e",Republicanos:"#138a72",MDB:"#3fa34d",
  Podemos:"#8e6bbf",PSB:"#e7c92b",PSOL:"#a3195b",PCdoB:"#7f1d1d",PSDB:"#2c6fbb",Novo:"#ff9f43",PV:"#8bc34a",PDT:"#e0457b",
  Avante:"#00acc1",PRD:"#6d4c41",Solidariedade:"#9e9d24","Missão":"#607d8b",Rede:"#4db6ac","Sem partido":"#9aa3b2"};
const corP = k => COR_PARTIDO[k] || "#99a3b7";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// só deixa passar links http(s): bloqueia javascript:, data: etc.
const safeUrl = u => { try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:" ? x.href : ""; } catch (e) { return ""; } };
const ini = n => n.split(" ").filter(Boolean).slice(0,2).map(w => w[0]).join("");
const count = (arr, f) => { const m = {}; arr.forEach(x => [].concat(f(x)).forEach(k => { if (k) m[k] = (m[k]||0)+1; })); return Object.entries(m).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],"pt")); };
const sel = (id, arr, ph, v) => `<select id="${id}" class="${v?"ativo":""}"><option value="">${ph}</option>${[...new Set(arr)].filter(Boolean).sort((a,b)=>a.localeCompare(b,"pt")).map(x=>`<option${x===v?" selected":""}>${esc(x)}</option>`).join("")}</select>`;
const avatar = p => `<div class="av">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy">` : esc(ini(p.nome))}</div>`;
const selo = p => !p.pronto ? `<span class="badge cinza">Em produção</span>` : !p.revisado ? `<span class="badge">Em revisão</span>` : "";

function bars(pairs){ const max = Math.max(...pairs.map(p=>p[1]),1);
  return pairs.map(([k,v]) => `<div class="bar"><span>${esc(k)}</span><i style="width:${v/max*100}%"></i><em>${v}</em></div>`).join(""); }

function donut(pairs){ const tot = pairs.reduce((a,p)=>a+p[1],0)||1; let acc = 0; const r=42, c=2*Math.PI*r;
  const segs = pairs.map(([k,v],i) => { const len = v/tot*c; const s = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${COR[i%COR.length]}" stroke-width="18" stroke-dasharray="${len} ${c-len}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"/>`; acc += len; return s; }).join("");
  const leg = pairs.map(([k,v],i) => `<div><i style="background:${COR[i%COR.length]}"></i>${esc(k)} <b>${v}</b> <span style="color:var(--muted)">(${Math.round(v/tot*100)}%)</span></div>`).join("");
  return `<div class="donut"><svg width="140" height="140" viewBox="0 0 120 120" role="img" aria-label="Gráfico de rosca">${segs}</svg><div class="legend">${leg}</div></div>`; }

// Hemiciclo: cadeiras em arcos concêntricos, agrupadas por partido (da esquerda para a direita)
function hemiciclo(pairs, rotulo){
  const N = pairs.reduce((a,p)=>a+p[1],0); if (!N) return "";
  const rows = Math.max(2, Math.round(Math.sqrt(N/6))), Ri = 60, Ro = 104, cx = 110, cy = 110;
  const radii = Array.from({length:rows}, (_,i) => Ri + i*(Ro-Ri)/(rows-1));
  const soma = radii.reduce((a,b)=>a+b,0);
  const n = radii.map(r => Math.max(2, Math.round(N*r/soma)));
  let dif = N - n.reduce((a,b)=>a+b,0); for (let i = rows-1; dif !== 0; i = (i-1+rows)%rows) { n[i] += Math.sign(dif); dif -= Math.sign(dif); }
  const seats = [];
  radii.forEach((r,i) => { for (let k = 0; k < n[i]; k++) { const a = Math.PI*(1 - k/(n[i]-1)); seats.push({x:cx+r*Math.cos(a), y:cy-r*Math.sin(a), a, r}); } });
  seats.sort((s,t) => t.a - s.a || s.r - t.r);
  const gap = (Ro-Ri)/(rows-1), arco = Math.min(...radii.map((r,i) => Math.PI*r/(n[i]-1))), dot = 0.46*Math.min(gap, arco);
  let idx = 0;
  const grupos = pairs.map(([k,v]) => { const cs = seats.slice(idx, idx+v).map(s => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${dot.toFixed(2)}"/>`).join(""); idx += v; return `<g fill="${corP(k)}"><title>${esc(k)}: ${v}</title>${cs}</g>`; }).join("");
  return `<svg class="hemi-svg" viewBox="0 0 220 120" role="img" aria-label="Hemiciclo: ${N} ${esc(rotulo)}">${grupos}<text x="110" y="97" text-anchor="middle" class="hemi-n">${N}</text><text x="110" y="110" text-anchor="middle" class="hemi-l">${esc(rotulo)}</text></svg>`;
}
const gridPartidos = pairs => `<div class="pgrid">${pairs.map(([k,v]) => `<div class="pcell" style="--c:${corP(k)}"><span>${esc(k)}</span><b>${v}</b></div>`).join("")}</div>`;
const painelCasa = (pairs, rotulo) => `<div class="hemi">${hemiciclo(pairs, rotulo)}${gridPartidos(pairs)}</div>`;

function home(){
  const s26 = R.senado.partidos;
  const m = {}; s26.forEach(([k,v]) => m[k] = v);
  TODOS.filter(p => p.eleicao === "Eleito em 2022" && p.partido).forEach(p => m[p.partido] = (m[p.partido]||0)+1);
  const completa = Object.entries(m).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],"pt"));
  const nCompleta = completa.reduce((a,p)=>a+p[1],0);
  const novos = PRONTOS.filter(p => p.eleicao === "Eleito em 2026");
  view.innerHTML = `
  <h1>Congresso Nacional</h1>
  <p class="lead">Resultado das eleições de 2026 para o Senado e a Câmara dos Deputados, por partido, e os perfis de quem vai ocupar as cadeiras em 2027.</p>
  <div class="kpis">
    <div class="kpi"><b>${R.senado.eleitos}</b><span>senadores eleitos em 2026</span></div>
    <div class="kpi"><b>${nCompleta}</b><span>senadores na bancada completa</span></div>
    <div class="kpi"><b>${R.camara.total}</b><span>deputados federais eleitos</span></div>
    <div class="kpi"><b>${PRONTOS.length}</b><span>perfis publicados</span></div>
  </div>
  <div class="card painel"><h2>Senado Federal</h2>
    ${painelCasa(completa,"senadores")}
    <p class="nota">Bancada completa: 54 eleitos em 2026 (mandato de 2027 a 2034) + 27 eleitos em 2022 (mandato até 2031).</p></div>
  <div class="card painel"><h2>Câmara dos Deputados</h2>${painelCasa(R.camara.partidos,"deputados")}
    <p class="nota">Perfis dos deputados em produção.</p></div>
  <h2>Senadores com perfil publicado</h2>
  <div class="grid2">
    <div class="card"><h3>Renovação entre os eleitos em 2026</h3>${donut(count(novos,p=>p.situacao))}</div>
    <div class="card"><h3>Áreas temáticas</h3>${bars(count(PRONTOS,p=>p.areas).slice(0,8))}</div>
  </div>
  <p class="nota" style="margin-top:20px">${esc(R.fonte)}</p>`;
}

const F = {q:"",uf:"",partido:"",situacao:"",eleicao:"",tema:""};
function lista(){
  view.innerHTML = `<h1>Parlamentares</h1><p class="lead">Perfis dos senadores. Busque por nome ou combine filtros. <b>Os perfis dos deputados ainda estão em produção.</b></p>
  <div class="filters">
    <input id="q" type="search" placeholder="Buscar por nome…" value="${esc(F.q)}">
    ${sel("uf",D.map(p=>p.uf),"UF",F.uf)}${sel("partido",D.map(p=>p.partido),"Partido",F.partido)}${sel("situacao",PRONTOS.map(p=>p.situacao),"Situação",F.situacao)}${sel("eleicao",D.map(p=>p.eleicao),"Eleição",F.eleicao)}${sel("tema",PRONTOS.flatMap(p=>p.areas),"Tema",F.tema)}
    <button class="clear" id="clr" type="button">Limpar filtros</button>
  </div><div class="count" id="cnt"></div><div class="cards" id="cards"></div>`;
  const render = () => {
    const q = F.q.trim().toLowerCase();
    const r = D.filter(p => (!q||p.nome.toLowerCase().includes(q)) && (!F.uf||p.uf===F.uf) && (!F.partido||p.partido===F.partido) && (!F.situacao||p.situacao===F.situacao) && (!F.eleicao||p.eleicao===F.eleicao) && (!F.tema||(p.areas||[]).includes(F.tema))).sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
    $("#clr").hidden = !Object.values(F).some(v => v);
    Object.keys(F).forEach(k => k!=="q" && $("#"+k).classList.toggle("ativo", !!F[k]));
    $("#cnt").textContent = `${r.length} parlamentar${r.length===1?"":"es"}`;
    $("#cards").innerHTML = r.map(p => `<a class="pcard" href="#/parlamentar/${esc(p.id)}">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${[p.partido,p.uf].filter(Boolean).map(esc).join("/")} · Senado</small>${selo(p)}</div></a>`).join("") || `<p class="lead">Nenhum resultado.</p>`;
  };
  Object.keys(F).forEach(k => { const el = $("#"+k); el.oninput = () => { F[k] = el.value; render(); }; });
  $("#clr").onclick = () => { Object.keys(F).forEach(k => F[k]=""); lista(); };
  render();
}

function relacionadas(p){
  const r = (window.NOTICIAS || []).filter(n => (n.parlamentares||[]).includes(p.id));
  return r.length ? `<h2>Notícias</h2><div class="news">${r.map(ncard).join("")}</div>` : "";
}
function ficha(id){
  const p = D.find(x => x.id === id);
  if (!p) { view.innerHTML = `<a class="back" href="#/parlamentares">← Voltar</a><h1>Perfil não encontrado</h1>`; return; }
  const link = (u,t) => safeUrl(u) ? `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">${t}</a>` : "—";
  const cab = `<a class="back" href="#/parlamentares">← Parlamentares</a>`;
  const foto = `<div class="foto">${p.foto?`<img src="${esc(p.foto)}" alt="Foto de ${esc(p.nome)}">`:"Sem foto"}</div>`;
  const chips = `<div><span class="chip blue">${[p.partido,p.uf].filter(Boolean).map(esc).join("/")}</span><span class="chip">${esc(p.casa)}</span>${p.situacao?`<span class="chip">${esc(p.situacao)}</span>`:""}<span class="chip">${esc(p.eleicao)}</span> ${selo(p)}</div>`;
  if (!p.pronto) { view.innerHTML = `${cab}<div class="ficha">${foto}<div><h1>${esc(p.nome)}</h1>${chips}<p class="lead" style="margin-top:20px">O perfil deste parlamentar está em produção.</p></div></div>`; return; }
  const linha = (k,v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  view.innerHTML = `${cab}
  <div class="ficha">${foto}
  <div><h1>${esc(p.nome)}</h1>${chips}
    ${p.minibio.split(/\n{2,}/).map(t=>`<p>${esc(t)}</p>`).join("")}
    <dl>${linha("Naturalidade",esc(p.naturalidade))}${linha("Formação",esc(p.formacao))}${linha("Ocupação",esc(p.ocupacao))}${linha("Cargos políticos",esc(p.cargos))}
    ${linha("Áreas temáticas",(p.areas||[]).map(a=>`<span class="chip blue">${esc(a)}</span>`).join(""))}
    ${linha("Página oficial",p.pagina_oficial?link(p.pagina_oficial,"Senado Federal"):"")}
    ${linha("Redes",(p.redes||[]).map(r=>link(r.url,esc(r.rotulo))).filter(x=>x!=="—").join(" · "))}</dl>
    <h2>Fontes</h2><ul class="fontes">${(p.fontes||[]).map(f=>`<li>${link(f,esc(f))}</li>`).join("")}</ul>
    ${relacionadas(p)}</div></div>`;
}

const S = {partido:"",uf:"",situacao:"",eleicao:"",tema:"",por:"uf",tipo:"barras"};
const FILTROS = ["partido","uf","situacao","eleicao","tema"];
const DIMS = {uf:["Estado",p=>p.uf],partido:["Partido",p=>p.partido],situacao:["Situação",p=>p.situacao],tema:["Área temática",p=>p.areas],eleicao:["Eleição",p=>p.eleicao]};
function estatisticas(){
  const r = PRONTOS.filter(p => (!S.partido||p.partido===S.partido)&&(!S.uf||p.uf===S.uf)&&(!S.situacao||p.situacao===S.situacao)&&(!S.eleicao||p.eleicao===S.eleicao)&&(!S.tema||p.areas.includes(S.tema)));
  const dados = count(r, DIMS[S.por][1]);
  const ativos = FILTROS.some(k=>S[k]);
  view.innerHTML = `<h1>Estatísticas</h1><p class="lead">Escolha filtros e como dividir os resultados. Exemplo: filtre o PL e divida por Estado. Base: ${PRONTOS.length} senadores com perfil publicado.</p>
  <div class="dim"><b style="font-size:14px">Filtrar</b><div class="filters">
    ${sel("s_partido",PRONTOS.map(p=>p.partido),"Partido",S.partido)}${sel("s_uf",PRONTOS.map(p=>p.uf),"UF",S.uf)}${sel("s_situacao",PRONTOS.map(p=>p.situacao),"Situação",S.situacao)}${sel("s_eleicao",PRONTOS.map(p=>p.eleicao),"Eleição",S.eleicao)}${sel("s_tema",PRONTOS.flatMap(p=>p.areas),"Tema",S.tema)}
    ${ativos?'<button class="clear" id="s_clr" type="button">Limpar filtros</button>':""}</div>
    <div class="filters"><label class="field">Dividir por<select id="s_por">${Object.entries(DIMS).map(([k,[n]])=>`<option value="${k}"${k===S.por?" selected":""}>${n}</option>`).join("")}</select></label>
    <label class="field">Gráfico<select id="s_tipo"><option value="barras"${S.tipo==="barras"?" selected":""}>Barras</option><option value="rosca"${S.tipo==="rosca"?" selected":""}>Rosca</option></select></label></div></div>
  <div class="kpis"><div class="kpi"><b>${r.length}</b><span>parlamentares no filtro</span></div><div class="kpi"><b>${Math.round(r.length/(PRONTOS.length||1)*100)}%</b><span>do total</span></div><div class="kpi"><b>${dados.length}</b><span>grupos em “${DIMS[S.por][0]}”</span></div></div>
  <div class="card"><h3>Parlamentares por ${DIMS[S.por][0].toLowerCase()}</h3>${!r.length?'<p class="lead">Nenhum parlamentar com esses filtros.</p>':S.tipo==="rosca"?donut(dados.slice(0,8)):bars(dados.slice(0,20))}</div>`;
  FILTROS.forEach(k => $("#s_"+k).onchange = e => { S[k]=e.target.value; estatisticas(); });
  ["por","tipo"].forEach(k => $("#s_"+k).onchange = e => { S[k]=e.target.value; estatisticas(); });
  const c = $("#s_clr"); if (c) c.onclick = () => { FILTROS.forEach(k=>S[k]=""); estatisticas(); };
}

const N = (window.NOTICIAS || []).slice().sort((a,b) => (b.data||"").localeCompare(a.data||""));
const fmtData = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}) : "";
const ncard = n => `<a class="ncard" href="${esc(safeUrl(n.url)||"#")}" target="_blank" rel="noopener noreferrer"><div class="img">${safeUrl(n.imagem)?`<img src="${esc(safeUrl(n.imagem))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith('Sem prévia')">`:"Sem prévia"}</div>
  <div class="body"><small>${esc(n.veiculo)}${n.data?" · "+fmtData(n.data):""}</small><h3>${esc(n.titulo)}</h3><p>${esc(n.resumo)}</p>
  <div>${(n.tags||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div><span class="go">Ler reportagem ↗</span></div></a>`;
const NF = {q:"",tag:"",veiculo:""};
function noticias(){
  const opts = (arr,ph,v) => `<option value="">${ph}</option>` + [...new Set(arr)].sort().map(x=>`<option${x===v?" selected":""}>${esc(x)}</option>`).join("");
  view.innerHTML = `<h1>Notícias</h1><p class="lead">Reportagens sobre o Congresso e os parlamentares, com prévia. Clique para ler na fonte original.</p>
  <div class="filters"><input id="n_q" type="search" placeholder="Buscar por título ou resumo…" value="${esc(NF.q)}">
    <select id="n_tag" class="${NF.tag?"ativo":""}">${opts(N.flatMap(n=>n.tags||[]),"Tema",NF.tag)}</select>
    <select id="n_veiculo" class="${NF.veiculo?"ativo":""}">${opts(N.map(n=>n.veiculo),"Veículo",NF.veiculo)}</select>
    <button class="clear" id="n_clr" type="button" ${NF.q||NF.tag||NF.veiculo?"":"hidden"}>Limpar filtros</button></div>
  <div class="count" id="n_cnt"></div><div class="news" id="n_list"></div>
  <details class="add"><summary>+ Adicionar notícia</summary>
    <p class="hint">Preencha os campos e copie o código gerado para o final da lista em <code>data/noticias.js</code>. (O site é estático, então a lista é editada no arquivo.) Para a imagem de prévia, use o link da imagem da reportagem (botão direito → copiar endereço da imagem).</p>
    <form id="n_form" onsubmit="return false">
      <label class="full">Título<input name="titulo"></label><label>Veículo<input name="veiculo" placeholder="Ex.: Folha, Nexo, Agência Senado"></label>
      <label>Data<input name="data" type="date"></label><label class="full">Link da reportagem<input name="url" type="url" placeholder="https://…"></label>
      <label class="full">Link da imagem de prévia (opcional)<input name="imagem" type="url"></label>
      <label class="full">Resumo<textarea name="resumo" rows="2"></textarea></label>
      <label>Temas (separados por vírgula)<input name="tags" placeholder="Economia, Saúde"></label>
      <label>Parlamentares citados (opcional)<input name="parl" placeholder="alessandro-vieira, arthur-lira"></label>
      <div class="full"><pre id="n_out"></pre><button class="clear" id="n_copy" type="button" style="margin-top:10px">Copiar código</button></div></form></details>`;
  const draw = () => {
    const q = NF.q.trim().toLowerCase();
    const r = N.filter(n => (!q||(n.titulo+" "+n.resumo).toLowerCase().includes(q)) && (!NF.tag||(n.tags||[]).includes(NF.tag)) && (!NF.veiculo||n.veiculo===NF.veiculo));
    $("#n_cnt").textContent = `${r.length} notícia${r.length===1?"":"s"}`;
    $("#n_list").innerHTML = r.map(ncard).join("") || `<p class="lead">Nenhuma notícia encontrada.</p>`;
  };
  draw();
  $("#n_q").oninput = e => { NF.q = e.target.value; draw(); };
  ["tag","veiculo"].forEach(k => $("#n_"+k).onchange = e => { NF[k] = e.target.value; noticias(); });
  $("#n_clr").onclick = () => { NF.q = NF.tag = NF.veiculo = ""; noticias(); };
  const f = $("#n_form"), out = $("#n_out");
  const gen = () => { const v = Object.fromEntries(new FormData(f));
    const list = s => (s||"").split(",").map(x=>x.trim()).filter(Boolean);
    out.textContent = "  " + JSON.stringify({titulo:v.titulo,veiculo:v.veiculo,data:v.data,url:v.url,imagem:v.imagem,resumo:v.resumo,tags:list(v.tags),parlamentares:list(v.parl)},null,2).replace(/\n/g,"\n  ") + ","; };
  f.oninput = gen; gen();
  $("#n_copy").onclick = async e => { try{ await navigator.clipboard.writeText(out.textContent); e.target.textContent = "Copiado!"; }catch(_){ e.target.textContent = "Selecione e copie manualmente"; } setTimeout(()=>e.target.textContent="Copiar código",1800); };
}

const sobre = () => view.innerHTML = `<h1>Sobre e metodologia</h1><p class="lead">Espaço para explicar o objetivo do projeto, quem faz e como os perfis são produzidos.</p>
  <div class="card"><h3>Como um perfil chega ao site</h3><p>Cada perfil é produzido por uma pessoa do grupo, marcado como <b>Feito</b> e conferido por outra pessoa (<b>Revisão</b>). Perfis ainda não revisados aparecem com o selo “Em revisão”. Toda informação tem fonte linkada.</p></div>
  <h2>Equipe</h2><p class="lead">[a preencher]</p><h2>Contato</h2><p class="lead">[a preencher]</p>`;
const wip = () => view.innerHTML = `<h1>Análises</h1><p class="lead">Cruzamentos e recortes temáticos.</p><div class="wip">🚧 Em construção — volte em breve.</div>`;

function route(){
  const h = location.hash.replace(/^#\/?/,"").split("/");
  const r = h[0] || "home";
  ({home, parlamentares:lista, parlamentar:()=>ficha(decodeURIComponent(h[1]||"")), sobre, estatisticas, noticias, analises:wip}[r] || home)();
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === (r==="parlamentar"?"lista":r==="parlamentares"?"lista":r)));
  if(mob.matches) menu(false); window.scrollTo(0,0);
}
const mob = matchMedia("(max-width:860px)"), app = $(".app"), side = $("#side"), btn = $("#menuBtn");
const aberto = () => mob.matches ? side.classList.contains("open") : !app.classList.contains("collapsed");
function sync(){ const o = aberto(); btn.textContent = o ? "✕" : "☰"; btn.setAttribute("aria-expanded", o); btn.setAttribute("aria-label", o ? "Fechar menu" : "Abrir menu"); $("#backdrop").classList.toggle("on", mob.matches && o); }
function menu(abrir){ if(mob.matches) side.classList.toggle("open", abrir); else { app.classList.toggle("collapsed", !abrir); try{ localStorage.setItem("menu", abrir?"1":"0"); }catch(e){} } sync(); }
btn.onclick = () => menu(!aberto());
$("#backdrop").onclick = () => menu(false);
addEventListener("keydown", e => { if(e.key==="Escape" && aberto() && mob.matches) menu(false); });
mob.onchange = () => { side.classList.remove("open"); sync(); };
try{ if(localStorage.getItem("menu")==="0") app.classList.add("collapsed"); }catch(e){}
sync();
addEventListener("hashchange", route); route();
})();
