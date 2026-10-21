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

function bars(pairs, corDe){ const max = Math.max(...pairs.map(p=>p[1]),1);
  return pairs.map(([k,v],i) => `<div class="bar"><span>${esc(k)}</span><i style="width:${v/max*100}%${corDe?`;background:${corDe(k,i)}`:""}"></i><em>${v}</em></div>`).join(""); }

// cor fixa por área temática (mesma cor em selos e gráficos): tons espaçados pelo ângulo áureo, na ordem alfabética das áreas
const TEMAS = [...new Set(TODOS.flatMap(p => p.areas || []))].sort((x,y) => x.localeCompare(y,"pt"));
const matizTema = k => Math.round((Math.max(0, TEMAS.indexOf(k)) * 137.508) % 360);
const corTema = k => `hsl(${matizTema(k)} 62% 46%)`;
const chipTema = k => `<span class="chip tema" style="--h:${matizTema(k)}">${esc(k)}</span>`;
// cor da fatia i: paleta da marca nas 8 primeiras; depois tons distintos (ângulo áureo) para caber todos os grupos
const corFatia = (k, i) => i < COR.length ? COR[i] : `hsl(${Math.round((i * 137.5) % 360)} 52% 48%)`;
function donut(pairs, grande, corDe = corFatia){ const tot = pairs.reduce((a,p)=>a+p[1],0)||1; let acc = 0; const r=42, c=2*Math.PI*r;
  const segs = pairs.map(([k,v],i) => { const len = v/tot*c; const gap = pairs.length > 1 && len > 1 ? 0.6 : 0; const s = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${corDe(k,i)}" stroke-width="18" stroke-dasharray="${len-gap} ${c-len+gap}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"><title>${esc(k)}: ${v} (${Math.round(v/tot*100)}%)</title></circle>`; acc += len; return s; }).join("");
  const leg = pairs.map(([k,v],i) => `<div><i style="background:${corDe(k,i)}"></i>${esc(k)} <b>${v}</b> <span style="color:var(--muted)">(${Math.round(v/tot*100)}%)</span></div>`).join("");
  return `<div class="donut${grande?" grande":""}"><svg ${grande?"":'width="140" height="140" '}viewBox="0 0 120 120" role="img" aria-label="Gráfico de rosca">${segs}</svg><div class="legend">${leg}</div></div>`; }

// Hemiciclo: cadeiras em arcos concêntricos, agrupadas por partido (da esquerda para a direita)
// calcHemi devolve as posições (num quadro de 220x120); é usado pelo SVG da tela e pelo PNG exportado
function calcHemi(pairs){
  const N = pairs.reduce((a,p)=>a+p[1],0); if (!N) return null;
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
  const grupos = pairs.map(([k,v]) => { const cs = seats.slice(idx, idx+v); idx += v; return {k, v, seats: cs}; });
  return {N, dot, grupos};
}
function hemiciclo(pairs, rotulo){
  const g = calcHemi(pairs); if (!g) return "";
  const grupos = g.grupos.map(({k,v,seats}) => `<g class="par" fill="${corP(k)}" data-p="${esc(k)}" data-n="${v}">${seats.map(s => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${g.dot.toFixed(2)}"/>`).join("")}</g>`).join("");
  return `<svg class="hemi-svg" viewBox="0 0 220 120" data-total="${g.N}" role="img" aria-label="Hemiciclo: ${g.N} ${esc(rotulo)}">${grupos}<text x="110" y="97" text-anchor="middle" class="hemi-n">${g.N}</text><text x="110" y="110" text-anchor="middle" class="hemi-l">${esc(rotulo)}</text></svg>`;
}
const gridPartidos = pairs => `<div class="pgrid">${pairs.map(([k,v]) => `<div class="pcell" style="--c:${corP(k)}" data-p="${esc(k)}" data-n="${v}"><span>${esc(k)}</span><b>${v}</b></div>`).join("")}</div>`;
const tip = document.createElement("div"); tip.className = "tip"; tip.hidden = true; document.body.appendChild(tip);
function ligarHover(){
  document.querySelectorAll(".hemi").forEach(h => {
    const svg = h.querySelector(".hemi-svg"); if (!svg) return;
    const tot = +svg.dataset.total, grupos = [...svg.querySelectorAll(".par")], cels = [...h.querySelectorAll(".pcell")];
    const alvo = ev => ev.target.closest(".par,.pcell");
    const mover = ev => { tip.style.left = Math.max(8, Math.min(ev.clientX + 14, innerWidth - tip.offsetWidth - 8)) + "px"; tip.style.top = (ev.clientY + 18) + "px"; };
    const esconder = () => { svg.classList.remove("has-hover"); h.querySelectorAll(".on").forEach(x => x.classList.remove("on")); tip.hidden = true; };
    const mostrar = (el, ev) => {
      const p = el.dataset.p, n = +el.dataset.n;
      svg.classList.add("has-hover");
      grupos.forEach(g => g.classList.toggle("on", g.dataset.p === p));
      cels.forEach(c => c.classList.toggle("on", c.dataset.p === p));
      tip.innerHTML = `<i style="background:${corP(p)}"></i><b>${esc(p)}</b> · ${n} cadeira${n === 1 ? "" : "s"} (${Math.round(n / tot * 100)}%)`;
      tip.hidden = false; mover(ev);
    };
    const tratar = ev => { const el = alvo(ev); if (el) mostrar(el, ev); else if (!ev.target.closest("svg")) esconder(); };
    h.addEventListener("mouseover", tratar);
    h.addEventListener("click", tratar); // toque no celular
    h.addEventListener("mousemove", ev => { if (!tip.hidden) mover(ev); });
    h.addEventListener("mouseleave", esconder);
  });
}

// ---------- Baixar gráficos em PNG ----------
// A imagem é desenhada num <canvas> no próprio navegador e salva localmente: nada é enviado a servidor
// e nenhum script de terceiros é usado. Só entram fontes e imagens do próprio site (senão o navegador bloquearia o download).
const FT = '"Poppins", system-ui, sans-serif', FD = '"Bebas Neue", Impact, sans-serif';
const btnDl = id => `<button class="dl" id="${id}" type="button" title="Baixar este gráfico em PNG">⬇ Baixar PNG</button>`;
const carregarImagem = src => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };
function quebrar(ctx, texto, maxW){ const linhas = []; let l = ""; String(texto).split(" ").forEach(p => { const t = l ? l + " " + p : p; if (ctx.measureText(t).width > maxW && l) { linhas.push(l); l = p; } else l = t; }); if (l) linhas.push(l); return linhas; }
function cortar(ctx, texto, maxW){ let t = String(texto); while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -1); return t === String(texto) ? t : t.trimEnd() + "…"; }

function pintarGrade(ctx, pairs, x, y, w){
  const cols = 5, gx = 36, gy = 34, cw = (w - gx*(cols-1))/cols, ch = 120;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  pairs.forEach(([k,v],i) => { const cx = x + (i%cols)*(cw+gx), cy = y + Math.floor(i/cols)*(ch+gy);
    ctx.fillStyle = corP(k); ctx.fillRect(cx, cy, cw, 7);
    ctx.fillStyle = "#5b6478"; ctx.font = `24px ${FT}`; ctx.fillText(k, cx, cy + 38);
    ctx.fillStyle = "#14192b"; ctx.font = `70px ${FD}`; ctx.fillText(String(v), cx, cy + 106); });
  return Math.ceil(pairs.length/cols)*(ch+gy) - gy;
}
function pintarHemi(ctx, pairs, rotulo, x, y, w){
  const g = calcHemi(pairs); if (!g) return 0; const s = w/220;
  g.grupos.forEach(({k,seats}) => { ctx.fillStyle = corP(k); seats.forEach(st => { ctx.beginPath(); ctx.arc(x + st.x*s, y + st.y*s, g.dot*s, 0, 2*Math.PI); ctx.fill(); }); });
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#14192b"; ctx.font = `${34*s}px ${FD}`; ctx.fillText(String(g.N), x + 110*s, y + 97*s);
  ctx.fillStyle = "#5b6478"; ctx.font = `${7*s}px ${FT}`; ctx.fillText(rotulo, x + 110*s, y + 110*s);
  return 120*s;
}
function pintarPainel(ctx, pairs, rotulo, x, y, w){ // hemiciclo centralizado + grade de partidos
  const hw = Math.min(1000, w), h1 = pintarHemi(ctx, pairs, rotulo, x + (w-hw)/2, y, hw);
  return h1 + 40 + pintarGrade(ctx, pairs, x, y + h1 + 40, w);
}
function pintarBarras(ctx, pairs, x, y, w, corDe){
  const lab = 330, val = 90, rowH = 54, barH = 26, max = Math.max(...pairs.map(p=>p[1]), 1), bw = w - lab - val;
  ctx.textBaseline = "middle";
  pairs.forEach(([k,v],i) => { const cy = y + i*rowH;
    ctx.fillStyle = "#14192b"; ctx.font = `26px ${FT}`; ctx.textAlign = "left"; ctx.fillText(cortar(ctx, k, lab - 20), x, cy + rowH/2);
    const gr = ctx.createLinearGradient(x + lab, 0, x + lab + bw, 0); gr.addColorStop(0, "#1f4fd8"); gr.addColorStop(1, "#5d85ed");
    ctx.fillStyle = corDe ? corDe(k,i) : gr; rrect(ctx, x + lab, cy + (rowH-barH)/2, Math.max(12, bw*v/max), barH, barH/2); ctx.fill();
    ctx.fillStyle = "#5b6478"; ctx.textAlign = "right"; ctx.fillText(String(v), x + w, cy + rowH/2); });
  ctx.textBaseline = "alphabetic"; return pairs.length*rowH;
}
function pintarRosca(ctx, pairs, corDe, x, y, w){
  const tot = pairs.reduce((a,p)=>a+p[1],0) || 1, R = 270, r = R*0.57, cx = x + R + 10, cy = y + R + 10; let ang = -Math.PI/2;
  pairs.forEach(([k,v],i) => { const a2 = ang + v/tot*2*Math.PI; ctx.beginPath(); ctx.arc(cx, cy, R, ang, a2); ctx.arc(cx, cy, r, a2, ang, true); ctx.closePath();
    ctx.fillStyle = corDe(k,i); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke(); ang = a2; });
  const lx = x + 2*R + 80, lw = w - (lx - x), cols = pairs.length > 24 ? 3 : pairs.length > 11 ? 2 : 1, rowH = cols === 3 ? 38 : 46, porCol = Math.ceil(pairs.length/cols), cw = lw/cols;
  const hLeg = porCol*rowH, ly = y + Math.max(0, (2*R + 20 - hLeg)/2);
  ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.font = `${cols === 3 ? 21 : 25}px ${FT}`;
  pairs.forEach(([k,v],i) => { const col = Math.floor(i/porCol), px = lx + col*cw, py = ly + (i%porCol)*rowH + rowH/2;
    ctx.fillStyle = corDe(k,i); rrect(ctx, px, py - 10, 20, 20, 5); ctx.fill();
    ctx.fillStyle = "#14192b"; ctx.fillText(cortar(ctx, `${k}  ${v} (${Math.round(v/tot*100)}%)`, cw - 40), px + 32, py); });
  ctx.textBaseline = "alphabetic"; return Math.max(2*R + 20, hLeg);
}

async function exportarPng(botao, {titulo, subtitulo, rodape, pintar}){
  const rotulo = botao.textContent; botao.disabled = true; botao.textContent = "Gerando…";
  try {
    await Promise.all([document.fonts.load(`40px "Bebas Neue"`), document.fonts.load(`24px Poppins`), document.fonts.ready]);
    const logo = await carregarImagem("assets/logo.png").catch(() => null);
    const W = 1600, M = 80, cw = W - 2*M, lw = 260, lh = logo ? lw*logo.height/logo.width : 0;
    const site = location.protocol.startsWith("http") ? location.host : "", data = new Date().toLocaleDateString("pt-BR");
    const medir = document.createElement("canvas").getContext("2d");
    medir.font = `28px ${FT}`; const linhasSub = quebrar(medir, subtitulo, cw);
    medir.font = `22px ${FT}`; const linhasRod = quebrar(medir, rodape, cw);
    const hGraf = pintar(medir, M, 0, cw);
    const yTit = M + lh + 80, ySub = yTit + 50, yGraf = ySub + linhasSub.length*40 + 40, yRod = yGraf + hGraf + 60;
    const H = Math.ceil(yRod + 30 + linhasRod.length*32 + 44 + M*0.6);
    const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    if (logo) ctx.drawImage(logo, M, M, lw, lh);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#14192b"; ctx.font = `80px ${FD}`; ctx.fillText(titulo.toUpperCase(), M, yTit);
    ctx.fillStyle = "#427cad"; for (let i = 0; i < 12; i++) ctx.fillRect(M + i*12, yTit + 16, 5, 12);
    ctx.fillStyle = "#5b6478"; ctx.font = `28px ${FT}`; linhasSub.forEach((l,i) => ctx.fillText(l, M, ySub + 20 + i*40));
    pintar(ctx, M, yGraf, cw);
    ctx.fillStyle = "#dde2ec"; ctx.fillRect(M, yRod - 24, cw, 2);
    ctx.fillStyle = "#5b6478"; ctx.font = `22px ${FT}`; ctx.textAlign = "left"; linhasRod.forEach((l,i) => ctx.fillText(l, M, yRod + 14 + i*32));
    ctx.fillStyle = "#14192b"; ctx.font = `600 22px ${FT}`; ctx.fillText(`Mapa do Congresso${site ? " · " + site : ""} · gerado em ${data}`, M, yRod + 30 + linhasRod.length*32);
    const blob = await new Promise((ok, erro) => c.toBlob(b => b ? ok(b) : erro(new Error("sem imagem")), "image/png"));
    const nome = titulo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `mapa-do-congresso-${nome}.png`;
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  } catch (e) {
    alert("Não foi possível gerar a imagem. Se você abriu o site como arquivo do computador, use o endereço publicado do site.");
  } finally { botao.disabled = false; botao.textContent = rotulo; }
}

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
  <div class="card painel"><div class="card-topo"><h2>Senado Federal</h2>${btnDl("dl_senado")}</div>
    ${painelCasa(completa,"senadores")}
    <p class="nota">Bancada completa: 54 eleitos em 2026 (mandato de 2027 a 2034) + 27 eleitos em 2022 (mandato até 2031).</p></div>
  <div class="card painel"><div class="card-topo"><h2>Câmara dos Deputados</h2>${btnDl("dl_camara")}</div>${painelCasa(R.camara.partidos,"deputados")}
    <p class="nota">Os 513 eleitos já estão na lista de Parlamentares; os perfis dos deputados estão em produção.</p></div>
  <h2>Senadores com perfil publicado</h2>
  <div class="grid2">
    <div class="card"><div class="card-topo"><h3>Renovação entre os eleitos em 2026</h3>${btnDl("dl_renov")}</div>${donut(count(novos,p=>p.situacao))}</div>
    <div class="card"><div class="card-topo"><h3>Áreas temáticas</h3>${btnDl("dl_areas")}</div>${bars(count(PRONTOS,p=>p.areas).slice(0,8), k => corTema(k))}</div>
  </div>
  <p class="nota" style="margin-top:20px">${esc(R.fonte)}</p>`;
  ligarHover();
  const renov = count(novos, p => p.situacao), areasTop = count(PRONTOS, p => p.areas).slice(0,8);
  $("#dl_senado").onclick = e => exportarPng(e.currentTarget, {titulo:"Senado Federal: bancada completa", subtitulo:`${nCompleta} senadores por partido · ${R.senado.eleitos} eleitos em 2026 (mandato de 2027 a 2034) + ${nCompleta - R.senado.eleitos} eleitos em 2022 (mandato até 2031)`, rodape:`Fonte: ${R.fonte}; senadores eleitos em 2022 conforme a planilha do projeto.`, pintar:(ctx,x,y,w) => pintarPainel(ctx, completa, "senadores", x, y, w)});
  $("#dl_camara").onclick = e => exportarPng(e.currentTarget, {titulo:"Câmara dos Deputados: composição eleita em 2026", subtitulo:`${R.camara.total} deputados federais por partido`, rodape:`Fonte: ${R.fonte}`, pintar:(ctx,x,y,w) => pintarPainel(ctx, R.camara.partidos, "deputados", x, y, w)});
  $("#dl_renov").onclick = e => exportarPng(e.currentTarget, {titulo:"Renovação entre os senadores eleitos em 2026", subtitulo:`${novos.length} senadores eleitos em 2026 com perfil publicado, por situação`, rodape:"Fonte: planilha de perfis do projeto (senadores com perfil pronto).", pintar:(ctx,x,y,w) => pintarRosca(ctx, renov, corFatia, x, y, w)});
  $("#dl_areas").onclick = e => exportarPng(e.currentTarget, {titulo:"Áreas temáticas dos senadores", subtitulo:`As 8 áreas mais frequentes entre os ${PRONTOS.length} senadores com perfil publicado (um senador pode ter mais de uma área)`, rodape:"Fonte: planilha de perfis do projeto (senadores com perfil pronto).", pintar:(ctx,x,y,w) => pintarBarras(ctx, areasTop, x, y, w, k => corTema(k))});
}

const CASAS = ["Câmara dos Deputados","Senado Federal"];
const F = {q:"",casa:"",uf:"",partido:"",situacao:"",ocupacao:"",tema:""};
function lista(){
  view.innerHTML = `<h1>Parlamentares</h1><p class="lead">Busque por nome ou combine filtros. Os perfis prontos aparecem primeiro. A lista já traz os <b>513 deputados eleitos</b>, mas os perfis deles ainda estão <b>em produção</b>.</p>
  <div class="filters">
    <input id="q" type="search" placeholder="Buscar por nome…" value="${esc(F.q)}">
    ${sel("casa",CASAS,"Casa",F.casa)}${sel("uf",D.map(p=>p.uf),"UF",F.uf)}${sel("partido",D.map(p=>p.partido),"Partido",F.partido)}${sel("situacao",PRONTOS.map(p=>p.situacao),"Situação",F.situacao)}${sel("ocupacao",PRONTOS.flatMap(p=>p.ocupacoes||[]),"Ocupação",F.ocupacao)}${sel("tema",PRONTOS.flatMap(p=>p.areas),"Tema",F.tema)}
    <button class="clear" id="clr" type="button">Limpar filtros</button>
  </div><div class="count" id="cnt"></div><div class="cards" id="cards"></div>`;
  const render = () => {
    const q = F.q.trim().toLowerCase();
    const r = D.filter(p => (!q||p.nome.toLowerCase().includes(q)) && (!F.casa||p.casa===F.casa) && (!F.uf||p.uf===F.uf) && (!F.partido||p.partido===F.partido) && (!F.situacao||p.situacao===F.situacao) && (!F.ocupacao||(p.ocupacoes||[]).includes(F.ocupacao)) && (!F.tema||(p.areas||[]).includes(F.tema))).sort((a,b)=>(b.pronto-a.pronto)||a.nome.localeCompare(b.nome,"pt"));
    $("#clr").hidden = !Object.values(F).some(v => v);
    Object.keys(F).forEach(k => k!=="q" && $("#"+k).classList.toggle("ativo", !!F[k]));
    $("#cnt").textContent = `${r.length} parlamentar${r.length===1?"":"es"}`;
    $("#cards").innerHTML = r.map(p => `<a class="pcard ${p.casa==="Senado Federal"?"senado":"camara"}" href="#/parlamentar/${esc(p.id)}">${avatar(p)}<div><b>${esc(p.nome)}</b><small>${[p.partido,p.uf].filter(Boolean).map(esc).join("/")} · ${p.casa==="Senado Federal"?"Senado":"Câmara"}</small>${selo(p)}</div></a>`).join("") || `<p class="lead">${F.casa==="Câmara dos Deputados" ? "Os perfis dos deputados ainda estão em produção." : "Nenhum resultado."}</p>`;
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
  const chips = `<div>${p.partido||p.uf?`<span class="chip partido"${p.partido?` style="--c:${corP(p.partido)}"`:""}>${[p.partido,p.uf].filter(Boolean).map(esc).join("/")}</span>`:""}<span class="chip">${esc(p.casa)}</span>${p.situacao&&p.situacao!==p.eleicao?`<span class="chip">${esc(p.situacao)}</span>`:""}<span class="chip">${esc(p.eleicao)}</span> ${selo(p)}</div>`;
  if (!p.pronto) { view.innerHTML = `${cab}<div class="ficha">${foto}<div><h1>${esc(p.nome)}</h1>${chips}<p class="lead" style="margin-top:20px">O perfil deste parlamentar está em produção.</p>${relacionadas(p)}</div></div>`; return; }
  const linha = (k,v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  view.innerHTML = `${cab}
  <div class="ficha">${foto}
  <div><h1>${esc(p.nome)}</h1>${chips}
    <dl>${linha("Naturalidade",esc(p.naturalidade))}${linha("Formação",esc(p.formacao))}${linha("Ocupação",esc(p.ocupacao))}${linha("Cargos políticos",esc(p.cargos))}
    ${linha("Áreas temáticas",(p.areas||[]).map(chipTema).join(""))}
    ${linha("Página oficial",p.pagina_oficial?link(p.pagina_oficial,"Senado Federal"):"")}
    ${linha("Redes",(p.redes||[]).map(r=>link(r.url,esc(r.rotulo))).filter(x=>x!=="—").join(" · "))}</dl>
    <h2>Minibiografia</h2>
    <div class="minibio">${p.minibio.split(/\n{2,}/).map(t=>`<p>${esc(t)}</p>`).join("")}</div>
    <h2>Fontes</h2><ul class="fontes">${(p.fontes||[]).map(f=>`<li>${link(f,esc(f))}</li>`).join("")}</ul>
    ${relacionadas(p)}</div></div>`;
}

const S = {casa:"",partido:"",uf:"",situacao:"",ocupacao:"",tema:"",por:"partido",tipo:"barras"};
const FILTROS = ["casa","partido","uf","situacao","ocupacao","tema"];
const corDim = por => por === "partido" ? (k => corP(k)) : por === "tema" ? (k => corTema(k)) : null;
const DIMS = {uf:["Estado",p=>p.uf],partido:["Partido",p=>p.partido],situacao:["Situação",p=>p.situacao],tema:["Área temática",p=>p.areas],ocupacao:["Ocupação",p=>p.ocupacoes],eleicao:["Eleição",p=>p.eleicao]};
function estatisticas(){
  const r = PRONTOS.filter(p => (!S.casa||p.casa===S.casa)&&(!S.partido||p.partido===S.partido)&&(!S.uf||p.uf===S.uf)&&(!S.situacao||p.situacao===S.situacao)&&(!S.ocupacao||(p.ocupacoes||[]).includes(S.ocupacao))&&(!S.tema||p.areas.includes(S.tema)));
  const dados = count(r, DIMS[S.por][1]);
  const ativos = FILTROS.some(k=>S[k]);
  view.innerHTML = `<h1>Estatísticas</h1><p class="lead">Escolha filtros e como dividir os resultados. Exemplo: filtre o PL e divida por Estado. Base: ${PRONTOS.length} senadores com perfil publicado.</p>
  <div class="dim"><b style="font-size:14px">Filtrar</b><div class="filters">
    ${sel("s_casa",CASAS,"Casa",S.casa)}${sel("s_partido",PRONTOS.map(p=>p.partido),"Partido",S.partido)}${sel("s_uf",PRONTOS.map(p=>p.uf),"UF",S.uf)}${sel("s_situacao",PRONTOS.map(p=>p.situacao),"Situação",S.situacao)}${sel("s_ocupacao",PRONTOS.flatMap(p=>p.ocupacoes||[]),"Ocupação",S.ocupacao)}${sel("s_tema",PRONTOS.flatMap(p=>p.areas),"Tema",S.tema)}
    ${ativos?'<button class="clear" id="s_clr" type="button">Limpar filtros</button>':""}</div>
    <div class="filters"><label class="field">Dividir por<select id="s_por">${Object.entries(DIMS).map(([k,[n]])=>`<option value="${k}"${k===S.por?" selected":""}>${n}</option>`).join("")}</select></label>
    <label class="field">Gráfico<select id="s_tipo"><option value="barras"${S.tipo==="barras"?" selected":""}>Barras</option><option value="rosca"${S.tipo==="rosca"?" selected":""}>Rosca</option></select></label></div></div>
  <div class="kpis"><div class="kpi"><b>${r.length}</b><span>parlamentares no filtro</span></div><div class="kpi"><b>${Math.round(r.length/(PRONTOS.length||1)*100)}%</b><span>do total</span></div><div class="kpi"><b>${dados.length}</b><span>grupos em “${DIMS[S.por][0]}”</span></div></div>
  <div class="card"><div class="card-topo"><h3>Parlamentares por ${DIMS[S.por][0].toLowerCase()}</h3>${r.length ? btnDl("dl_stats") : ""}</div>${!r.length?`<p class="lead">${S.casa==="Câmara dos Deputados" ? "Os perfis dos deputados ainda estão em produção." : "Nenhum parlamentar com esses filtros."}</p>`:S.tipo==="rosca"?donut(dados,true,corDim(S.por)||corFatia):bars(dados.slice(0,20),corDim(S.por))}</div>`;
  const btn = $("#dl_stats");
  if (btn) btn.onclick = e => {
    const ROT = {casa:"Casa", partido:"Partido", uf:"UF", situacao:"Situação", ocupacao:"Ocupação", tema:"Tema"};
    const filtros = FILTROS.filter(k => S[k]).map(k => `${ROT[k]}: ${S[k]}`).join(" · ") || "sem filtros";
    exportarPng(e.currentTarget, {titulo:`Parlamentares por ${DIMS[S.por][0].toLowerCase()}`, subtitulo:`${r.length} parlamentares (${filtros})`,
      rodape:`Fonte: planilha de perfis do projeto (${PRONTOS.length} senadores com perfil publicado).`,
      pintar:(ctx,x,y,w) => S.tipo === "rosca" ? pintarRosca(ctx, dados, corDim(S.por) || corFatia, x, y, w) : pintarBarras(ctx, dados.slice(0,20), x, y, w, corDim(S.por))});
  };
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
  <div class="count" id="n_cnt"></div><div class="news" id="n_list"></div>`;
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
  tip.hidden = true;
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
