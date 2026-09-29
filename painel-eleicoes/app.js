(() => {
const P = window.PAINEL;
const $ = s => document.querySelector(s);
const view = $("#view");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const cor = id => (P.candidatos.find(c => c.id === id) || {}).cor || "#9aa79c";
const nomeC = id => (P.candidatos.find(c => c.id === id) || {}).nome || id;
const PAL = ["#22381f","#2f4a33","#4d6b50","#7a9a7d","#a9c2ab","#9a7f47","#c3a86a","#6f8fb0","#b5645a","#9aa79c"];
const fmtData = d => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {day:"2-digit", month:"short", year:"numeric"});
const dias = d => Math.round((new Date(d + "T12:00:00") - new Date(new Date().toDateString() + " 12:00")) / 864e5);
const ABAS = {presidencial:"Eleições presidenciais", pesquisas:"Pesquisas eleitorais", conjuntura:"Conjuntura política", congresso:"Congresso Nacional", governos:"Governos estaduais"};
const ultima = () => P.pesquisas[P.pesquisas.length - 1];
const media = (n, turno) => { const r = P.pesquisas.slice(-n), m = {};
  r.forEach(p => Object.entries(p[turno]).forEach(([k,v]) => m[k] = (m[k]||0) + v / r.length)); return m; };

/* ---------- componentes ---------- */
function bars(pairs, colorFn){ const max = Math.max(...pairs.map(p => p[1]), 1);
  return pairs.map(([k,v],i) => `<div class="bar"><span>${esc(k)}</span><i style="width:${v/max*100}%;background:${colorFn ? colorFn(k,i) : "var(--verde)"}"></i><em>${Math.round(v*10)/10}</em></div>`).join(""); }

function candBars(m){ // barras de intenção de voto por candidato
  return bars(Object.entries(m).sort((a,b) => b[1]-a[1]).map(([k,v]) => [nomeC(k), v]), (n) => cor(P.candidatos.find(c => c.nome === n).id)); }

function linhas(ids){ // evolução das pesquisas (1º turno)
  const W = 680, H = 270, L = 34, R = 12, T = 12, B = 30, ps = P.pesquisas;
  const t0 = +new Date(ps[0].data), t1 = +new Date(ps[ps.length-1].data), maxV = 40;
  const x = d => L + (+new Date(d) - t0) / (t1 - t0 || 1) * (W-L-R), y = v => T + (1 - v/maxV) * (H-T-B);
  const grid = [0,10,20,30,40].map(v => `<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${v}%</text>`).join("");
  const xs = ps.filter((_,i) => i % 2 === 0).map(p => `<text x="${x(p.data)}" y="${H-8}" text-anchor="middle">${new Date(p.data+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</text>`).join("");
  const ln = ids.map(id => { const pts = ps.map(p => [x(p.data), y(p.t1[id])]);
    return `<polyline fill="none" stroke="${cor(id)}" stroke-width="2.5" points="${pts.map(p => p.join(",")).join(" ")}"/>` +
      pts.map((p,i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${cor(id)}"><title>${nomeC(id)} · ${ps[i].instituto} · ${ps[i].t1[id]}%</title></circle>`).join(""); }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução das pesquisas">${grid}${xs}${ln}</svg>
  <div class="legend">${ids.map(id => `<span><i style="background:${cor(id)}"></i>${esc(nomeC(id))}</span>`).join("")}</div>`;
}

function hemiciclo(pairs){ // parlamento em semicírculo
  const tot = pairs.reduce((a,p) => a + p[1], 0), rows = tot > 200 ? 9 : 4, r0 = 42, r1 = 102, step = (r1-r0)/(rows-1);
  const radii = Array.from({length:rows}, (_,i) => r0 + i*step), sr = radii.reduce((a,b) => a+b, 0);
  const n = radii.map(r => Math.round(tot*r/sr)); n[rows-1] += tot - n.reduce((a,b) => a+b, 0);
  const pts = []; radii.forEach((r,i) => { for(let k=0;k<n[i];k++){ const a = Math.PI * (1 - (n[i]===1 ? .5 : k/(n[i]-1))); pts.push({a, x:112 + r*Math.cos(a), y:108 - r*Math.sin(a)}); } });
  pts.sort((p,q) => q.a - p.a);
  let idx = 0, dots = "";
  pairs.forEach(([nome,v],pi) => { for(let k=0;k<v;k++){ const p = pts[idx++]; if(p) dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${tot>200?2.7:5.2}" fill="${PAL[pi%PAL.length]}"><title>${esc(nome)}</title></circle>`; } });
  return `<svg class="chart" viewBox="0 0 224 118" role="img" aria-label="Composição em hemiciclo">${dots}<text x="112" y="104" text-anchor="middle" style="font:600 22px var(--serif);fill:var(--verde-esc)">${tot}</text></svg>
  <div class="legend">${pairs.map(([k,v],i) => `<span><i style="background:${PAL[i%PAL.length]}"></i>${esc(k)} <b>${v}</b></span>`).join("")}</div>`;
}

function tiles(fill, sel, filtro){ // cartograma em quadrados
  let cells = "";
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const u = P.ufs.find(x => x[3]===c && x[4]===r);
    cells += u ? `<button class="tile${sel===u[0]?" sel":""}${filtro && !filtro(u) ? " dim":""}" data-uf="${u[0]}" style="background:${fill(u)}" title="${esc(u[1])}">${u[0]}</button>` : `<span class="tile empty"></span>`; }
  return `<div class="tiles" id="tiles">${cells}</div>`;
}

function informes(aba, limite){
  const r = P.informes.filter(i => !aba || i.aba === aba).sort((a,b) => b.data.localeCompare(a.data)).slice(0, limite || 99);
  return r.length ? `<div class="informes">${r.map(i => `<a class="inf" href="${esc(i.url)}"><small>${esc(i.tipo)} · ${fmtData(i.data)}${aba ? "" : " · " + ABAS[i.aba]}</small><h3>${esc(i.titulo)}</h3><p>${esc(i.resumo)}</p><span class="go">Ler informe →</span></a>`).join("")}</div>` : `<p class="lead">Nenhum informe publicado ainda.</p>`;
}
const blocoInformes = aba => `<h2>Informes Volpatti sobre este tema</h2>${informes(aba, 4)}`;
const rodape = () => `<div class="rodape"><span>Volpatti Advogados Associados · SAUS QD 04, Lote 9/10, Ed. Victoria Office Tower, Sala 505, Asa Sul, Brasília/DF</span><span>Dados fictícios · versão esqueleto</span></div>`;
const head = (t, l, e) => `<div class="eyebrow">${e || "Painel das Eleições 2026"}</div><h1>${t}</h1><p class="lead">${l}</p>`;
const contagem = () => [["1º turno", P.turnos.primeiro], ["2º turno", P.turnos.segundo]].map(([n,d]) => { const k = dias(d);
  return `<div class="cd"><b>${k > 0 ? k : k === 0 ? "Hoje" : "—"}</b><span>${k > 0 ? "dias para o " + n : k === 0 ? n : n + " já realizado"} · ${fmtData(d)}</span></div>`; }).join("");
const seg = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(o => `<button class="${o===cur?"on":""}">${esc(o)}</button>`).join("")}</div>`;

/* ---------- páginas ---------- */
function home(){
  const u = ultima(), m = media(3,"t1");
  view.innerHTML = head("Painel das Eleições 2026", "Acompanhamento das eleições presidenciais, pesquisas, conjuntura política, Congresso Nacional e governos estaduais, com a leitura dos informes da Volpatti.", "Volpatti Advogados Associados") +
  `<div class="count-box">${contagem()}</div>
  <div class="kpis">
    <div class="kpi"><b>${nomeC(Object.entries(m).filter(([k])=>k!=="O").sort((a,b)=>b[1]-a[1])[0][0])}</b><span>lidera a média das últimas 3 pesquisas</span></div>
    <div class="kpi"><b>${P.pesquisas.length}</b><span>pesquisas monitoradas</span></div>
    <div class="kpi"><b>27</b><span>governos estaduais em disputa</span></div>
    <div class="kpi"><b>${P.congresso.renovacao.camara + P.congresso.renovacao.senado}</b><span>cadeiras no Congresso em disputa</span></div>
  </div>
  <div class="grid2">
    <div class="card"><h3>Intenção de voto · 1º turno</h3><p style="color:var(--muted);font-size:13px">Média das 3 últimas pesquisas · ${esc(P.pesquisas.length)} no total</p>${candBars(m)}<p style="margin-top:10px"><a href="#/pesquisas" style="color:var(--verde);font-weight:600">Ver todas as pesquisas →</a></p></div>
    <div class="card"><h3>Últimos informes</h3>${P.informes.slice().sort((a,b)=>b.data.localeCompare(a.data)).slice(0,4).map(i => `<p><small style="color:var(--muted)">${fmtData(i.data)} · ${ABAS[i.aba]}</small><br><b style="font-family:var(--serif);font-size:18px">${esc(i.titulo)}</b></p>`).join("")}<a href="#/informes" style="color:var(--verde);font-weight:600">Todos os informes →</a></div>
  </div>
  <h2>Explore o painel</h2>
  <div class="informes">${[["presidencial","Cenário, candidatos e mapa de liderança por estado."],["pesquisas","Todas as pesquisas registradas, evolução e média."],["conjuntura","Fatos, agenda e radar de riscos políticos."],["congresso","Composição da Câmara e do Senado."],["governos","As 27 disputas estaduais, uma a uma."]].map(([k,t]) => `<a class="inf" href="#/${k}"><h3>${ABAS[k]}</h3><p>${t}</p><span class="go">Abrir →</span></a>`).join("")}</div>` + rodape();
}

let turno = "1º turno", ufSel = "";
function presidencial(){
  const m = turno === "1º turno" ? ultima().t1 : ultima().t2;
  view.innerHTML = head("Eleições presidenciais", "Quem disputa, como está o cenário e onde cada candidatura lidera. Dados fictícios.") +
  `<div class="count-box">${contagem()}</div>
  <h2>Candidaturas</h2><div class="cands">${P.candidatos.filter(c => c.id !== "O").map(c => `<div class="cand" style="--c:${c.cor}"><b>${esc(c.nome)}</b><small>${esc(c.partido)}</small><div class="pct">${ultima().t1[c.id]}%</div><small>última pesquisa · 1º turno</small></div>`).join("")}</div>
  <h2>Cenário atual</h2>${seg("seg", ["1º turno","2º turno (A x B)"], turno)}
  <div class="card" style="margin-top:14px">${candBars(m)}<p style="color:var(--muted);font-size:13px;margin:10px 0 0">${esc(ultima().instituto)} · ${fmtData(ultima().data)} · margem ±${ultima().margem} p.p.</p></div>
  <h2>Liderança por estado</h2>
  <div class="mapa-wrap">${tiles(u => cor(P.governos.find(g => g.uf === u[0]).presidencial), ufSel)}
    <div class="detalhe" id="det">${detalhePres()}</div></div>
  <div class="legend">${["A","B","C"].map(id => `<span><i style="background:${cor(id)}"></i>${esc(nomeC(id))}</span>`).join("")}</div>` + blocoInformes("presidencial") + rodape();
  $("#seg").onclick = e => { if(e.target.tagName === "BUTTON"){ turno = e.target.textContent.startsWith("1") ? "1º turno" : "2º turno (A x B)"; presidencial(); } };
  $("#tiles").onclick = e => { const b = e.target.closest("[data-uf]"); if(b){ ufSel = b.dataset.uf; presidencial(); } };
}
function detalhePres(){ const g = P.governos.find(x => x.uf === ufSel);
  return g ? `<h3>${esc(g.nome)}</h3><span class="chip v">${esc(g.regiao)}</span><dl><dt>Lidera</dt><dd>${esc(nomeC(g.presidencial))}</dd><dt>Observação</dt><dd>[espaço para a leitura da Volpatti sobre o estado]</dd></dl>` : `<h3>Selecione um estado</h3><p style="color:var(--muted)">Clique em um quadrado do mapa para ver o detalhe.</p>`; }

let pInst = "", pTurno = "1º turno";
function pesquisas(){
  const ps = P.pesquisas.filter(p => !pInst || p.instituto === pInst).slice().reverse();
  const inst = [...new Set(P.pesquisas.map(p => p.instituto))].sort();
  const t = pTurno === "1º turno" ? "t1" : "t2", ids = t === "t1" ? ["A","B","C","D"] : ["A","B"];
  view.innerHTML = head("Pesquisas eleitorais", "Pesquisas registradas, evolução ao longo do tempo e média. Dados fictícios.") +
  `<div class="kpis"><div class="kpi"><b>${P.pesquisas.length}</b><span>pesquisas</span></div><div class="kpi"><b>${inst.length}</b><span>institutos</span></div><div class="kpi"><b style="font-size:26px">${fmtData(ultima().data)}</b><span>última pesquisa</span></div></div>
  <div class="grid2"><div class="card"><h3>Evolução · 1º turno</h3>${linhas(["A","B","C","D"])}</div>
  <div class="card"><h3>Média das últimas 3 pesquisas</h3>${candBars(media(3, "t1"))}<h3 style="margin-top:22px">2º turno (A x B)</h3>${candBars(media(3, "t2"))}</div></div>
  <h2>Todas as pesquisas</h2>
  <div class="filters">${seg("pt", ["1º turno","2º turno (A x B)"], pTurno)}
    <select id="pi" class="${pInst?"ativo":""}"><option value="">Instituto</option>${inst.map(i => `<option${i===pInst?" selected":""}>${esc(i)}</option>`).join("")}</select>
    ${pInst ? '<button class="clear" id="pc">Limpar filtro</button>' : ""}</div>
  <div class="scroll"><table class="tbl"><thead><tr><th>Data</th><th>Instituto</th><th>Registro TSE</th><th class="n">Amostra</th><th class="n">Margem</th>${ids.map(i => `<th class="n">${esc(i)}</th>`).join("")}</tr></thead>
  <tbody>${ps.map(p => `<tr><td>${fmtData(p.data)}</td><td>${esc(p.instituto)}</td><td>${esc(p.registro)}</td><td class="n">${p.amostra.toLocaleString("pt-BR")}</td><td class="n">±${p.margem}</td>${ids.map(i => `<td class="n">${p[t][i]}%</td>`).join("")}</tr>`).join("")}</tbody></table></div>` + blocoInformes("pesquisas") + rodape();
  $("#pt").onclick = e => { if(e.target.tagName === "BUTTON"){ pTurno = e.target.textContent.startsWith("1") ? "1º turno" : "2º turno (A x B)"; pesquisas(); } };
  $("#pi").onchange = e => { pInst = e.target.value; pesquisas(); };
  const c = $("#pc"); if(c) c.onclick = () => { pInst = ""; pesquisas(); };
}

function conjuntura(){
  const c = P.conjuntura;
  view.innerHTML = head("Conjuntura política", "Fatos relevantes, temas em disputa e radar de riscos, com a análise da Volpatti. Dados fictícios.") +
  `<div class="kpis">${c.kpis.map(k => `<div class="kpi"><b>${esc(k.v)}</b><span>${esc(k.t)}</span></div>`).join("")}</div>
  <div class="grid2"><div class="card"><h3>Linha do tempo</h3><div class="tl">${c.linha.map(l => `<div><small>${fmtData(l.d).toUpperCase()}</small><b>${esc(l.t)}</b><p>${esc(l.p)}</p></div>`).join("")}</div></div>
  <div class="card"><h3>Radar de riscos</h3>${c.riscos.map(r => `<p><span class="chip ${r.nivel}">${r.nivel === "medio" ? "médio" : r.nivel}</span> <b>${esc(r.tema)}</b><br><span style="color:var(--muted);font-size:14px">${esc(r.nota)}</span></p>`).join("")}</div></div>` + blocoInformes("conjuntura") + rodape();
}

let casa = "Câmara dos Deputados";
function congresso(){
  const k = casa.startsWith("C") ? "camara" : "senado", d = P.congresso[k], esp = Object.entries(P.congresso.espectro[k]);
  view.innerHTML = head("Congresso Nacional", "Composição das duas Casas e o que está em jogo na renovação. Dados fictícios.") +
  seg("seg", ["Câmara dos Deputados","Senado Federal"], casa) +
  `<div class="kpis"><div class="kpi"><b>${d.total}</b><span>cadeiras</span></div><div class="kpi"><b>${P.congresso.renovacao[k]}</b><span>em disputa em 2026</span></div><div class="kpi"><b>${d.partidos.length}</b><span>bancadas</span></div></div>
  <div class="grid2"><div class="card"><h3>Composição</h3>${hemiciclo(d.partidos)}</div>
  <div class="card"><h3>Cadeiras por partido</h3>${bars(d.partidos, (_,i) => PAL[i%PAL.length])}</div>
  <div class="card"><h3>Posição ideológica</h3>${bars(esp)}<p style="font-size:12px;color:var(--muted);margin:12px 0 0">Critério de classificação a definir com a equipe.</p></div></div>` + blocoInformes("congresso") + rodape();
  $("#seg").onclick = e => { if(e.target.tagName === "BUTTON"){ casa = e.target.textContent; congresso(); } };
}

let regiao = "Todas";
function governos(){
  const regs = ["Todas","Norte","Nordeste","Centro-Oeste","Sudeste","Sul"], ok = u => regiao === "Todas" || u[2] === regiao;
  const lista = P.governos.filter(g => regiao === "Todas" || g.regiao === regiao);
  view.innerHTML = head("Governos estaduais", "As 27 disputas estaduais: quem governa, quem lidera e onde a disputa está mais aberta. Dados fictícios.") +
  seg("seg", regs, regiao) +
  `<div class="mapa-wrap" style="margin-top:20px">${tiles(u => cor(P.governos.find(g => g.uf === u[0]).lider), ufSel, ok)}<div class="detalhe" id="det">${detalheGov()}</div></div>
  <div class="legend">${["A","B","C","D"].map(id => `<span><i style="background:${cor(id)}"></i>Lidera: ${esc(nomeC(id))}</span>`).join("")}</div>
  <h2>${regiao === "Todas" ? "Todos os estados" : esc(regiao)}</h2>
  <div class="scroll"><table class="tbl"><thead><tr><th>UF</th><th>Estado</th><th>Governador(a)</th><th>Situação</th><th>Lidera</th><th class="n">Margem</th><th>Disputa</th></tr></thead>
  <tbody>${lista.map(g => `<tr><td><b>${g.uf}</b></td><td>${esc(g.nome)}</td><td>${esc(g.governador)}</td><td>${esc(g.reeleicao)}</td><td><span class="chip" style="border-color:${cor(g.lider)};color:var(--text)">${esc(nomeC(g.lider))}</span></td><td class="n">${g.margem} p.p.</td><td>${g.competitividade}</td></tr>`).join("")}</tbody></table></div>` + blocoInformes("governos") + rodape();
  $("#seg").onclick = e => { if(e.target.tagName === "BUTTON"){ regiao = e.target.textContent; governos(); } };
  $("#tiles").onclick = e => { const b = e.target.closest("[data-uf]"); if(b){ ufSel = b.dataset.uf; governos(); } };
}
function detalheGov(){ const g = P.governos.find(x => x.uf === ufSel);
  return g ? `<h3>${esc(g.nome)}</h3><span class="chip v">${esc(g.regiao)}</span><span class="chip">Disputa ${g.competitividade.toLowerCase()}</span>
    <dl><dt>Governador(a)</dt><dd>${esc(g.governador)} (${esc(g.partidoGov)})</dd><dt>Situação</dt><dd>${esc(g.reeleicao)}</dd><dt>Lidera</dt><dd>${esc(nomeC(g.lider))}, com ${g.margem} p.p. de vantagem</dd><dt>Leitura Volpatti</dt><dd>[espaço para comentário do escritório]</dd></dl>`
    : `<h3>Selecione um estado</h3><p style="color:var(--muted)">Clique em um quadrado do mapa para ver o detalhe.</p>`; }

let fAba = "";
function informesPag(){
  view.innerHTML = head("Informes Volpatti", "Todo o conteúdo do painel é alimentado pelos informes do escritório. Aqui ficam todos, por tema.", "Volpatti Advogados Associados") +
  `<div class="filters"><select id="fa" class="${fAba?"ativo":""}"><option value="">Todos os temas</option>${Object.entries(ABAS).map(([k,v]) => `<option value="${k}"${k===fAba?" selected":""}>${v}</option>`).join("")}</select></div>` + informes(fAba) +
  `<div class="faixa"><h3>Como um informe chega ao painel</h3><p>O time redige o informe → escolhe o tema (aba) → o painel o exibe automaticamente na aba correspondente e nesta página. [fluxo a definir com a equipe]</p></div>` + rodape();
  $("#fa").onchange = e => { fAba = e.target.value; informesPag(); };
}

function sobre(){
  view.innerHTML = head("Sobre e metodologia", "Objetivo do painel, origem dos dados e como usar as informações.", "Volpatti Advogados Associados") +
  `<div class="grid2"><div class="card"><h3>Objetivo</h3><p>[a definir] Oferecer aos clientes e à equipe uma visão organizada das eleições de 2026 e de seus efeitos para 2027.</p></div>
  <div class="card"><h3>Fontes</h3><p>[a definir] Pesquisas registradas no TSE, dados oficiais do TSE, Câmara e Senado, e informes próprios da Volpatti.</p></div>
  <div class="card"><h3>Atualização</h3><p>[a definir] Frequência de atualização de cada aba e responsável.</p></div>
  <div class="card"><h3>Aviso</h3><p>[a definir com o jurídico] Conteúdo informativo, sem caráter de aconselhamento jurídico.</p></div></div>
  <h2>Contato</h2><p>assessoria@volpatti.com.br<br>(61) 99652-2638 | (61) 4042-0111<br>SAUS QD 04, Lote 9/10, Ed. Victoria Office Tower, Sala 505, Asa Sul, Brasília/DF</p>` + rodape();
}

/* ---------- roteamento e menu ---------- */
function route(){
  const r = location.hash.replace(/^#\/?/, "").split("/")[0] || "home";
  ({home, presidencial, pesquisas, conjuntura, congresso, governos, informes:informesPag, sobre}[r] || home)();
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === r));
  if(mob.matches) menu(false); window.scrollTo(0,0);
}
const mob = matchMedia("(max-width:860px)"), app = $(".app"), side = $("#side"), btn = $("#menuBtn");
const aberto = () => mob.matches ? side.classList.contains("open") : !app.classList.contains("collapsed");
function sync(){ const o = aberto(); btn.textContent = o ? "✕" : "☰"; btn.setAttribute("aria-expanded", o); btn.setAttribute("aria-label", o ? "Fechar menu" : "Abrir menu"); $("#backdrop").classList.toggle("on", mob.matches && o); }
function menu(abrir){ if(mob.matches) side.classList.toggle("open", abrir); else app.classList.toggle("collapsed", !abrir); sync(); }
btn.onclick = () => menu(!aberto());
$("#backdrop").onclick = () => menu(false);
addEventListener("keydown", e => { if(e.key === "Escape" && aberto() && mob.matches) menu(false); });
mob.onchange = () => { side.classList.remove("open"); sync(); };
sync();
addEventListener("hashchange", route); route();
})();
