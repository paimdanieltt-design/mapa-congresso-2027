(() => {
const D = window.DADOS.filter(p => p.status === "Aprovado");
const $ = s => document.querySelector(s);
const view = $("#view");
const COR = ["#1f4fd8","#5b84ee","#98a2b3","#c3c9d4","#0e2a80","#8fa9f2","#667085","#dfe3ea"];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ini = n => n.split(" ").filter(Boolean).slice(0,2).map(w => w[0]).join("");
const count = (arr, f) => { const m = {}; arr.forEach(x => [].concat(f(x)).forEach(k => m[k] = (m[k]||0)+1)); return Object.entries(m).sort((a,b) => b[1]-a[1]); };
const avatar = p => `<div class="av">${p.foto ? `<img src="${esc(p.foto)}" alt="">` : esc(ini(p.nome))}</div>`;

function bars(pairs){ const max = Math.max(...pairs.map(p=>p[1]),1);
  return pairs.map(([k,v]) => `<div class="bar"><span>${esc(k)}</span><i style="width:${v/max*100}%"></i><em>${v}</em></div>`).join(""); }

function donut(pairs){ const tot = pairs.reduce((a,p)=>a+p[1],0)||1; let acc = 0; const r=42, c=2*Math.PI*r;
  const segs = pairs.map(([k,v],i) => { const len = v/tot*c; const s = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${COR[i%COR.length]}" stroke-width="18" stroke-dasharray="${len} ${c-len}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"/>`; acc += len; return s; }).join("");
  const leg = pairs.map(([k,v],i) => `<div><i style="background:${COR[i%COR.length]}"></i>${esc(k)} <b>${v}</b> <span style="color:var(--muted)">(${Math.round(v/tot*100)}%)</span></div>`).join("");
  return `<div class="donut"><svg width="140" height="140" viewBox="0 0 120 120" role="img" aria-label="Gráfico de rosca">${segs}</svg><div class="legend">${leg}</div></div>`; }

function espectro(pairs){ const ord = ["Esquerda","Centro-esquerda","Centro","Centro-direita","Direita"]; const m = Object.fromEntries(pairs);
  const shades = ["#0e2a80","#5b84ee","#98a2b3","#8fa9f2","#1f4fd8"];
  const bar = ord.map((k,i) => `<div title="${k}: ${m[k]||0}" style="flex:${m[k]||0};background:${["#0e2a80","#5b84ee","#c3c9d4","#98a2b3","#667085"][i]}"></div>`).join("");
  const leg = ord.map(k => `<span>${k} ${m[k]||0}</span>`).join("");
  return `<div class="espectro">${bar}</div><div class="espectro-l" style="flex-wrap:wrap;gap:8px">${leg}</div>`; }

let casa = "Ambas";
function home(){
  const base = casa==="Ambas" ? D : D.filter(p => p.casa===casa);
  const nova = base.filter(p => p.situacao==="Novato").length;
  view.innerHTML = `
  <h1>Panorama do Congresso</h1>
  <p class="lead">Como será a composição da próxima legislatura. Filtre por Casa e explore os números.</p>
  <div class="seg" id="seg">${["Ambas","Câmara dos Deputados","Senado Federal"].map(c=>`<button class="${c===casa?"on":""}">${c}</button>`).join("")}</div>
  <div class="kpis">
    <div class="kpi"><b>${base.length}</b><span>parlamentares</span></div>
    <div class="kpi"><b>${new Set(base.map(p=>p.partido)).size}</b><span>partidos</span></div>
    <div class="kpi"><b>${Math.round(nova/(base.length||1)*100)}%</b><span>novatos</span></div>
    <div class="kpi"><b>${new Set(base.map(p=>p.uf)).size}</b><span>estados representados</span></div>
  </div>
  <div class="grid2">
    <div class="card"><h3>Composição por partido</h3>${bars(count(base,p=>p.partido))}</div>
    <div class="card"><h3>Renovação (situação)</h3>${donut(count(base,p=>p.situacao))}</div>
    <div class="card"><h3>Áreas temáticas</h3>${bars(count(base,p=>p.areas).slice(0,8))}</div>
    <div class="card"><h3>Posição ideológica</h3>${espectro(count(base,p=>p.espectro))}
      <p style="font-size:12px;color:var(--muted);margin:14px 0 0">Critério de classificação a definir pelo grupo.</p></div>
  </div>`;
  $("#seg").onclick = e => { if(e.target.tagName==="BUTTON"){ casa = e.target.textContent; home(); } };
}

const F = {q:"",casa:"",uf:"",partido:"",situacao:"",tema:""};
function lista(){
  const opts = (arr,ph) => `<option value="">${ph}</option>` + [...new Set(arr)].sort().map(x=>`<option>${esc(x)}</option>`).join("");
  view.innerHTML = `<h1>Parlamentares</h1><p class="lead">Busque por nome ou combine filtros. Clique em um card para abrir o perfil.</p>
  <div class="filters">
    <input id="q" type="search" placeholder="Buscar por nome…" value="${esc(F.q)}">
    <select id="casa">${opts(D.map(p=>p.casa),"Casa")}</select>
    <select id="uf">${opts(D.map(p=>p.uf),"UF")}</select>
    <select id="partido">${opts(D.map(p=>p.partido),"Partido")}</select>
    <select id="situacao">${opts(D.map(p=>p.situacao),"Situação")}</select>
    <select id="tema">${opts(D.flatMap(p=>p.areas),"Tema")}</select>
    <button class="clear" id="clr" type="button">Limpar filtros</button>
  </div><div class="count" id="cnt"></div><div class="cards" id="cards"></div>`;
  Object.keys(F).forEach(k => { const el = $("#"+k); if(k!=="q") el.value = F[k]; el.oninput = () => { F[k]=el.value; render(); }; });
  $("#clr").onclick = () => { Object.keys(F).forEach(k => F[k]=""); lista(); };
  const render = () => {
    const q = F.q.trim().toLowerCase();
    const r = D.filter(p => (!q||p.nome.toLowerCase().includes(q)) && (!F.casa||p.casa===F.casa) && (!F.uf||p.uf===F.uf) && (!F.partido||p.partido===F.partido) && (!F.situacao||p.situacao===F.situacao) && (!F.tema||p.areas.includes(F.tema))).sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
    const ativos = Object.values(F).some(v => v);
    $("#clr").hidden = !ativos;
    Object.keys(F).forEach(k => k!=="q" && $("#"+k).classList.toggle("ativo", !!F[k]));
    $("#cnt").textContent = `${r.length} parlamentar${r.length===1?"":"es"}`;
    $("#cards").innerHTML = r.map(p => `<a class="pcard" href="#/parlamentar/${p.id}">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${esc(p.partido)}/${esc(p.uf)} · ${p.casa==="Senado Federal"?"Senado":"Câmara"}</small></div></a>`).join("") || `<p class="lead">Nenhum resultado.</p>`;
  };
  render();
}

function ficha(id){
  const p = D.find(x => x.id === +id);
  if(!p){ view.innerHTML = `<a class="back" href="#/parlamentares">← Voltar</a><h1>Perfil não encontrado</h1>`; return; }
  const link = (u,t) => u ? `<a href="${esc(u)}" target="_blank" rel="noopener" style="color:var(--blue)">${t}</a>` : "—";
  view.innerHTML = `<a class="back" href="#/parlamentares">← Parlamentares</a>
  <div class="ficha"><div class="foto">${p.foto?`<img src="${esc(p.foto)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px">`:"Foto"}</div>
  <div><h1>${esc(p.nome)}</h1>
    <div><span class="chip blue">${esc(p.partido)}/${esc(p.uf)}</span><span class="chip">${esc(p.casa)}</span><span class="chip">${esc(p.situacao)}</span></div>
    <p>${esc(p.minibio)}</p>
    <dl><dt>Idade</dt><dd>${p.idade} anos</dd><dt>Naturalidade</dt><dd>${esc(p.naturalidade)}</dd><dt>Formação</dt><dd>${esc(p.formacao)}</dd>
    <dt>Áreas temáticas</dt><dd>${p.areas.map(a=>`<span class="chip blue">${esc(a)}</span>`).join("")}</dd>
    <dt>Página oficial</dt><dd>${link(p.pagina_oficial,"Abrir")}</dd>
    <dt>Redes</dt><dd>${Object.entries(p.redes).filter(([,v])=>v).map(([k,v])=>link(v,k)).join(" · ")||"—"}</dd></dl>
    <h2>Trajetória política</h2><p>${esc(p.trajetoria)}</p>
    <h2>Fontes</h2><ul>${p.fontes.map(f=>`<li>${link(f,esc(f))}</li>`).join("")}</ul></div></div>`;
}


const S = {casa:"",partido:"",uf:"",situacao:"",tema:"",por:"uf",tipo:"barras"};
const DIMS = {uf:["Estado",p=>p.uf],partido:["Partido",p=>p.partido],situacao:["Situação",p=>p.situacao],tema:["Área temática",p=>p.areas],casa:["Casa",p=>p.casa],espectro:["Posição ideológica",p=>p.espectro]};
function estatisticas(){
  const opts = (arr,ph,v) => `<option value="">${ph}</option>` + [...new Set(arr)].sort().map(x=>`<option${x===v?" selected":""}>${esc(x)}</option>`).join("");
  const sel = (id,arr,ph) => `<select id="s_${id}" class="${S[id]?"ativo":""}">${opts(arr,ph,S[id])}</select>`;
  const r = D.filter(p => (!S.casa||p.casa===S.casa)&&(!S.partido||p.partido===S.partido)&&(!S.uf||p.uf===S.uf)&&(!S.situacao||p.situacao===S.situacao)&&(!S.tema||p.areas.includes(S.tema)));
  const dados = count(r, DIMS[S.por][1]);
  const ativos = ["casa","partido","uf","situacao","tema"].some(k=>S[k]);
  view.innerHTML = `<h1>Estatísticas</h1><p class="lead">Escolha filtros e como dividir os resultados. Exemplo: filtre o Partido A e divida por Estado.</p>
  <div class="dim"><b style="font-size:14px">Filtrar</b><div class="filters">
    ${sel("casa",D.map(p=>p.casa),"Casa")}${sel("partido",D.map(p=>p.partido),"Partido")}${sel("uf",D.map(p=>p.uf),"UF")}${sel("situacao",D.map(p=>p.situacao),"Situação")}${sel("tema",D.flatMap(p=>p.areas),"Tema")}
    ${ativos?'<button class="clear" id="s_clr" type="button">Limpar filtros</button>':""}</div>
    <div class="filters"><label class="field">Dividir por<select id="s_por">${Object.entries(DIMS).map(([k,[n]])=>`<option value="${k}"${k===S.por?" selected":""}>${n}</option>`).join("")}</select></label>
    <label class="field">Gráfico<select id="s_tipo"><option value="barras"${S.tipo==="barras"?" selected":""}>Barras</option><option value="rosca"${S.tipo==="rosca"?" selected":""}>Rosca</option></select></label></div></div>
  <div class="kpis"><div class="kpi"><b>${r.length}</b><span>parlamentares no filtro</span></div><div class="kpi"><b>${Math.round(r.length/D.length*100)}%</b><span>do total</span></div><div class="kpi"><b>${dados.length}</b><span>grupos em “${DIMS[S.por][0]}”</span></div></div>
  <div class="card"><h3>Parlamentares por ${DIMS[S.por][0].toLowerCase()}</h3>${!r.length?'<p class="lead">Nenhum parlamentar com esses filtros.</p>':S.tipo==="rosca"?donut(dados.slice(0,8)):bars(dados.slice(0,20))}</div>`;
  ["casa","partido","uf","situacao","tema","por","tipo"].forEach(k => $("#s_"+k).onchange = e => { S[k]=e.target.value; estatisticas(); });
  const c = $("#s_clr"); if(c) c.onclick = () => { ["casa","partido","uf","situacao","tema"].forEach(k=>S[k]=""); estatisticas(); };
}

const sobre = () => view.innerHTML = `<h1>Sobre e metodologia</h1><p class="lead">Espaço para explicar o objetivo do projeto, quem faz e como os perfis são produzidos.</p>
  <div class="card"><h3>Como um perfil chega ao site</h3><p>A fazer → Em produção → Em revisão → Ajustes → <b>Aprovado</b>. Só perfis aprovados são publicados, e toda informação tem fonte linkada.</p></div>
  <h2>Equipe</h2><p class="lead">[a preencher]</p><h2>Contato</h2><p class="lead">[a preencher]</p>`;
const wip = () => view.innerHTML = `<h1>Análises</h1><p class="lead">Cruzamentos e recortes temáticos.</p><div class="wip">🚧 Em construção — volte em breve.</div>`;

function route(){
  const h = location.hash.replace(/^#\/?/,"").split("/");
  const r = h[0] || "home";
  ({home, parlamentares:lista, parlamentar:()=>ficha(h[1]), sobre, estatisticas, analises:wip}[r] || home)();
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
