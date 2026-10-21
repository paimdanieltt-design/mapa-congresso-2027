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
    ${sel("casa",CASAS,"Congresso Nacional",F.casa)}${sel("uf",D.map(p=>p.uf),"UF",F.uf)}${sel("partido",D.map(p=>p.partido),"Partido",F.partido)}${sel("situacao",PRONTOS.map(p=>p.situacao),"Situação",F.situacao)}${sel("ocupacao",PRONTOS.flatMap(p=>p.ocupacoes||[]),"Ocupação",F.ocupacao)}${sel("tema",PRONTOS.flatMap(p=>p.areas),"Tema",F.tema)}
    <button class="clear" id="clr" type="button">Limpar filtros</button>
  </div><div class="count" id="cnt"></div><div class="cards" id="cards"></div>`;
  const render = () => {
    const q = F.q.trim().toLowerCase();
    const r = D.filter(p => (!q||p.nome.toLowerCase().includes(q)) && (!F.casa||p.casa===F.casa) && (!F.uf||p.uf===F.uf) && (!F.partido||p.partido===F.partido) && (!F.situacao||p.situacao===F.situacao) && (!F.ocupacao||(p.ocupacoes||[]).includes(F.ocupacao)) && (!F.tema||(p.areas||[]).includes(F.tema))).sort((a,b)=>(b.pronto-a.pronto)||a.nome.localeCompare(b.nome,"pt"));
    $("#clr").classList.toggle("inativo", !Object.values(F).some(v => v));
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
  if (!p) { view.innerHTML = `${voltarPara()}<h1>Perfil não encontrado</h1>`; return; }
  const link = (u,t) => safeUrl(u) ? `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">${t}</a>` : "—";
  const cab = voltarPara();
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
    ${sel("s_casa",CASAS,"Congresso Nacional",S.casa)}${sel("s_partido",PRONTOS.map(p=>p.partido),"Partido",S.partido)}${sel("s_uf",PRONTOS.map(p=>p.uf),"UF",S.uf)}${sel("s_situacao",PRONTOS.map(p=>p.situacao),"Situação",S.situacao)}${sel("s_ocupacao",PRONTOS.flatMap(p=>p.ocupacoes||[]),"Ocupação",S.ocupacao)}${sel("s_tema",PRONTOS.flatMap(p=>p.areas),"Tema",S.tema)}
    <button class="clear${ativos?"":" inativo"}" id="s_clr" type="button">Limpar filtros</button></div>
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

const SOBRE_NOS = [
  "Somos um grupo de estudantes de Ciência Política que acredita na importância do acesso à informação para o fortalecimento da participação política e da democracia.",
  "A partir dessa convicção, desenvolvemos, por iniciativa própria, uma plataforma independente e gratuita com o objetivo de reunir, organizar e tornar acessíveis informações sobre os parlamentares que irão compor o Congresso Nacional a partir de 2027.",
  "Nosso projeto reúne perfis de deputados federais e senadores, apresentando suas trajetórias pessoais e políticas, principais temas de interesse e áreas de atuação. Também disponibilizamos conteúdos explicativos sobre a política brasileira e o funcionamento de suas instituições.",
  "A iniciativa nasceu da percepção de que informações sobre nossos representantes, embora estejam disponíveis em diferentes fontes, nem sempre são de fácil acesso ou consulta. Por isso, buscamos concentrá-las em um único espaço, de maneira clara, objetiva e organizada.",
  "Queremos que a plataforma seja uma ferramenta de consulta tanto para cidadãos interessados em conhecer melhor seus representantes quanto para estudantes, pesquisadores, jornalistas, consultorias e profissionais que acompanham o Poder Legislativo.",
  "Nosso compromisso é com a divulgação de informações de caráter apartidário, a partir de fontes públicas, contribuindo para aproximar a sociedade das instituições políticas brasileiras.",
  "Acreditamos que conhecer quem nos representa é essencial para compreender, acompanhar e participar da política."
];
const sobre = () => view.innerHTML = `<h1>Sobre e metodologia</h1>
  <h2>Sobre nós</h2>
  <div class="texto-sobre">${SOBRE_NOS.map(t => `<p>${esc(t)}</p>`).join("")}</div>
  <h2>Metodologia</h2>
  <div class="card"><h3>Como um perfil chega ao site</h3><p>Cada perfil é produzido por uma pessoa do grupo, marcado como <b>Feito</b> e conferido por outra pessoa (<b>Revisão</b>). Perfis ainda não revisados aparecem com o selo “Em revisão”. Toda informação tem fonte linkada.</p></div>
  <h2>Equipe</h2><p class="lead">[a preencher]</p><h2>Contato</h2><p class="lead">[a preencher]</p>`;
// ---------- Processo legislativo (conteúdo explicativo, baseado na Constituição Federal de 1988, arts. 44 a 69) ----------
const N_SENADO = 81;
const quorum = n => ({ absoluta: Math.floor(n/2) + 1, tresQuintos: Math.ceil(n*3/5), doisTercos: Math.ceil(n*2/3), umTerco: Math.ceil(n/3) });
const PASSOS = [
  ["Iniciativa", "Alguém apresenta o projeto. Podem propor: deputados e senadores (individualmente ou por comissão), o Presidente da República, o STF, os tribunais superiores, o Procurador-Geral da República e os cidadãos (iniciativa popular, com assinaturas de 1% do eleitorado nacional distribuídas em pelo menos cinco estados). Alguns temas só podem ser propostos pelo Presidente, como a criação de cargos no serviço público federal."],
  ["Casa iniciadora", "Projetos do Presidente, do Judiciário e de iniciativa popular começam na Câmara dos Deputados. Os de deputados começam na Câmara e os de senadores, no Senado. A Casa onde o projeto começa é a <b>iniciadora</b>."],
  ["Comissões", "O projeto vai para comissões temáticas (saúde, educação, economia etc.) e para a Comissão de Constituição e Justiça (CCJ), que confere se ele respeita a Constituição. Um <b>relator</b> escreve o parecer e as comissões podem propor emendas. Em alguns casos, as comissões decidem sozinhas (caráter conclusivo na Câmara; decisão terminativa no Senado), a menos que haja recurso para levar o tema ao plenário."],
  ["Plenário", "Todos os parlamentares da Casa debatem e votam. O presidente da Casa, ouvidos os líderes dos partidos, define a <b>pauta</b>, ou seja, o que será votado e quando. A aprovação exige a maioria necessária para aquele tipo de norma (veja a tabela abaixo)."],
  ["Casa revisora", "O projeto segue para a outra Casa, que repete o caminho (comissões e plenário). Se for aprovado sem mudanças, vai à sanção. Se for alterado, volta à Casa iniciadora, que decide se aceita ou não as mudanças e tem a palavra final sobre o texto. Se a Casa revisora rejeitar o projeto, ele é arquivado."],
  ["Sanção ou veto", "O Presidente da República tem 15 dias úteis para <b>sancionar</b> (concordar) ou <b>vetar</b> (discordar), no todo ou em parte, por considerar o texto inconstitucional ou contrário ao interesse público. Se não responder no prazo, há sanção tácita."],
  ["Análise do veto", "Se houve veto, deputados e senadores se reúnem em sessão conjunta e têm 30 dias para analisá-lo. Para derrubar o veto é preciso a maioria absoluta das duas Casas: __VETO__. Se o veto é mantido, vale a decisão do Presidente sobre aquele trecho."],
  ["Promulgação e publicação", "A lei é promulgada e publicada no Diário Oficial da União. Só depois da publicação ela passa a valer."]
];
const TIPOS_NORMA = [
  ["Emenda à Constituição (PEC)", "Altera o texto da Constituição (não pode abolir as cláusulas pétreas, como os direitos e garantias individuais).", "1/3 dos deputados ou dos senadores, Presidente da República ou mais da metade das Assembleias Legislativas.", "Dois turnos em cada Casa, com 3/5 dos votos: __TRES5__.", "Não. É promulgada pelas Mesas da Câmara e do Senado."],
  ["Lei complementar", "Regulamenta temas que a Constituição manda tratar por esse tipo de lei (por exemplo, normas gerais de direito tributário).", "Deputados, senadores, Presidente, STF, tribunais superiores, PGR e iniciativa popular.", "Maioria absoluta em cada Casa: __ABS__.", "Sim."],
  ["Lei ordinária", "É a regra geral para os temas do dia a dia: criar benefícios, definir crimes e penas, instituir programas.", "Mesmos autores da lei complementar.", "Maioria simples: a maioria dos presentes, desde que presente a maioria dos membros da Casa.", "Sim."],
  ["Medida provisória (MP)", "Ato do Presidente, com força de lei, para casos de relevância e urgência.", "Presidente da República.", "Vale desde a edição por 60 dias, prorrogáveis por mais 60. Precisa ser aprovada pela Câmara e pelo Senado nesse prazo, senão perde a eficácia.", "Já nasce em vigor. Se o Congresso aprovar mudanças, o texto vai à sanção."],
  ["Lei delegada", "Elaborada pelo Presidente, depois que o Congresso autoriza por resolução e define os limites.", "Presidente da República.", "O Congresso aprova a delegação por resolução.", "Não se aplica."],
  ["Decreto legislativo", "Temas de competência exclusiva do Congresso, como aprovar tratados internacionais ou sustar atos do Executivo que extrapolem seus poderes.", "Deputados, senadores e comissões.", "Maioria simples, em regra.", "Não. É promulgado pelo Presidente do Congresso."],
  ["Resolução", "Assuntos internos de cada Casa ou do Congresso, como regimentos e organização administrativa.", "Deputados, senadores e Mesas.", "Maioria simples, em regra.", "Não."]
];
const GLOSSARIO = [
  ["Bancada e bloco", "Bancada é o conjunto de parlamentares de um mesmo partido, de um estado ou de um tema (como a bancada ruralista). Bloco é a união de partidos para atuar juntos na votação e na divisão de cargos."],
  ["Comissão", "Grupo menor de parlamentares que analisa os projetos por tema antes do plenário. Podem ser permanentes (como a CCJ) ou temporárias (como as CPIs)."],
  ["CPI (Comissão Parlamentar de Inquérito)", "Comissão temporária que investiga um fato determinado, por prazo certo. Para ser criada, precisa do pedido de 1/3 dos membros da Casa."],
  ["Emenda", "Proposta de alteração em um projeto que já está em discussão. Pode acrescentar, retirar ou modificar trechos."],
  ["Legislatura", "Período de quatro anos entre uma eleição e outra para o Congresso. A próxima, de 2027 a 2031, é a 58ª legislatura."],
  ["Maioria absoluta e maioria simples", "Maioria absoluta é mais da metade de todos os membros da Casa, estejam presentes ou não. Maioria simples é mais da metade dos presentes na votação, desde que haja quórum para votar."],
  ["Pauta", "A lista do que será discutido e votado. Quem decide é o presidente da Casa, em conversa com os líderes dos partidos."],
  ["Plenário", "Reunião de todos os parlamentares de uma Casa, onde ocorrem os debates e as votações finais."],
  ["Promulgação", "Ato que declara que a lei existe e deve ser cumprida. É seguida pela publicação no Diário Oficial."],
  ["Quórum", "Número mínimo de parlamentares necessário para abrir uma sessão ou para aprovar determinada matéria."],
  ["Relator", "Parlamentar escolhido para estudar um projeto e escrever o parecer que orienta a votação."],
  ["Sanção e veto", "A sanção é a concordância do Presidente com o projeto aprovado pelo Congresso. O veto é a discordância, total ou parcial."],
  ["Sessão legislativa", "Período anual de trabalho do Congresso: de 2 de fevereiro a 17 de julho e de 1º de agosto a 22 de dezembro."],
  ["Urgência", "Regime que acelera a votação de um projeto. O Presidente pode pedir urgência para projetos seus: Câmara e Senado têm 45 dias cada, e depois disso a pauta da Casa fica trancada."]
];

const processo = () => {
  const c = quorum(R.camara.total), s = quorum(N_SENADO);
  const par = (k, ca, se) => `<b>${ca[k]} deputados e ${se[k]} senadores</b>`;
  const sub = t => t.replace("__VETO__", par("absoluta", c, s)).replace("__TRES5__", par("tresQuintos", c, s)).replace("__ABS__", par("absoluta", c, s));
  view.innerHTML = `<h1>Processo legislativo</h1>
  <p class="lead">Como uma ideia vira lei no Brasil, quem decide em cada etapa e quantos votos são necessários. Um guia simples para acompanhar o trabalho de deputados e senadores.</p>

  <h2>Como o Congresso é organizado</h2>
  <p class="texto-proc">O Poder Legislativo federal é exercido pelo <b>Congresso Nacional</b>, formado por duas Casas que trabalham juntas: a Câmara dos Deputados e o Senado Federal. Elas têm três funções principais: <b>fazer leis</b> (inclusive mudar a Constituição), <b>fiscalizar o Executivo</b> e <b>representar a sociedade</b>.</p>
  <div class="casas">
    <div class="casa-card" style="--c:var(--verde-forte)"><h3>Câmara dos Deputados</h3>
      <ul><li><b>${R.camara.total} deputados federais</b>, que representam o povo.</li><li>Mandato de <b>4 anos</b>; a eleição renova toda a Casa.</li><li>Eleitos pelo sistema <b>proporcional</b>: cada estado tem número de vagas proporcional à população (mínimo de 8 e máximo de 70).</li></ul></div>
    <div class="casa-card" style="--c:var(--blue)"><h3>Senado Federal</h3>
      <ul><li><b>${N_SENADO} senadores</b>, 3 por estado e 3 pelo Distrito Federal, que representam os estados.</li><li>Mandato de <b>8 anos</b>.</li><li>Eleição <b>majoritária</b>, com renovação alternada de 1/3 e de 2/3 das vagas a cada 4 anos. Em 2026, foram renovadas 54 vagas (2/3).</li></ul></div>
  </div>

  <h2>Do projeto à lei: passo a passo</h2>
  <p class="texto-proc">Este é o caminho de um projeto de lei ordinária. Cada Casa tem seu regimento interno, mas a Constituição fixa as regras gerais.</p>
  <ol class="passos">${PASSOS.map(([t,x],i) => `<li class="passo"><span class="n">${i+1}</span><div><h3>${t}</h3><p>${sub(x)}</p></div></li>`).join("")}</ol>

  <h2>Que tipos de norma existem?</h2>
  <p class="texto-proc">Nem tudo precisa dos mesmos votos. Quanto mais importante o tema, maior a maioria exigida.</p>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tipo</th><th>Para que serve</th><th>Quem pode propor</th><th>Como é votada</th><th>Vai à sanção?</th></tr></thead>
    <tbody>${TIPOS_NORMA.map(l => `<tr>${l.map((x,i) => `<${i?"td":"th scope=\"row\""}>${sub(x)}</${i?"td":"th"}>`).join("")}</tr>`).join("")}</tbody></table></div>

  <h2>Quórum em números</h2>
  <p class="texto-proc">Com as ${R.camara.total} cadeiras da Câmara e as ${N_SENADO} do Senado, estes são os números que aparecem nas votações.</p>
  <div class="quorum">${[
    ["Maioria absoluta","absoluta","Leis complementares e derrubada de veto"],
    ["Três quintos (3/5)","tresQuintos","Emendas à Constituição"],
    ["Dois terços (2/3)","doisTercos","Abrir processo de impeachment (Câmara) e condenar (Senado)"],
    ["Um terço (1/3)","umTerco","Criar uma CPI e propor emenda à Constituição"]
  ].map(([t,k,u]) => `<div class="q-card"><h3>${t}</h3><div class="q-nums"><span><b>${c[k]}</b> deputados</span><span><b>${s[k]}</b> senadores</span></div><p>${u}</p></div>`).join("")}</div>

  <h2>Além de fazer leis: fiscalização</h2>
  <ul class="lista-proc">
    <li><b>CPIs:</b> investigam fatos determinados e podem convocar pessoas para depor.</li>
    <li><b>Convocação e pedidos de informação:</b> ministros e autoridades podem ser chamados a prestar esclarecimentos.</li>
    <li><b>Controle de atos do Executivo:</b> o Congresso pode sustar, por decreto legislativo, atos que extrapolem o poder de regulamentar.</li>
    <li><b>Contas públicas:</b> o Congresso julga as contas do Presidente da República, com o auxílio técnico do Tribunal de Contas da União (TCU), e aprova o orçamento federal.</li>
    <li><b>Impeachment:</b> a Câmara autoriza a abertura do processo (2/3 dos deputados) e o Senado julga e pode condenar (2/3 dos senadores).</li>
  </ul>

  <h2>Glossário</h2>
  <div class="glos">${GLOSSARIO.map(([t,x]) => `<details><summary>${t}</summary><p>${x}</p></details>`).join("")}</div>

  <p class="nota" style="margin-top:28px">Conteúdo informativo e simplificado, com base na Constituição Federal de 1988 (arts. 44 a 69) e nos regimentos internos das duas Casas. Para o texto completo, consulte a
  <a href="https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">Constituição Federal</a>, o site da
  <a href="https://www.camara.leg.br/" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">Câmara dos Deputados</a> e o do
  <a href="https://www.senado.leg.br/" target="_blank" rel="noopener noreferrer" style="color:var(--blue)">Senado Federal</a>.</p>`;
};

// ---------- Câmara e Senado: Mesa Diretora, lideranças e comissões (dados de data/orgaos.js, gerados pelas APIs oficiais) ----------
const ORG = window.ORGAOS;
const normNome = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
const INDICE_PERFIL = {}; TODOS.forEach(p => (INDICE_PERFIL[normNome(p.nome)] = INDICE_PERFIL[normNome(p.nome)] || []).push(p));
// liga a pessoa ao perfil do site só quando o nome (e a UF) batem com um único parlamentar da mesma Casa
const perfilDe = (pe, casa) => { const c = (INDICE_PERFIL[normNome(pe.nome)] || []).filter(p => p.casa === casa && (!pe.uf || !p.uf || p.uf === pe.uf)); return c.length === 1 ? c[0] : null; };
const vago = pe => !pe || /^vago$/i.test((pe.nome || "").trim());
const nomeLink = (pe, casa) => { if (vago(pe)) return `<span class="vago">Vaga em aberto</span>`; const p = perfilDe(pe, casa); return p ? `<a href="#/parlamentar/${esc(p.id)}">${esc(pe.nome)}</a>` : esc(pe.nome); };
const seloPe = pe => !vago(pe) && (pe.partido || pe.uf) ? `<span class="chip partido"${pe.partido ? ` style="--c:${corP(pe.partido)}"` : ""}>${[pe.partido, pe.uf].filter(Boolean).map(esc).join("/")}</span>` : "";
// foto: a do perfil do site, se houver; senão a foto oficial baixada pelo script; senão as iniciais
const fotoPe = (pe, casa) => { const p = perfilDe(pe, casa); return (p && p.foto) || (pe.fid ? `assets/fotos-casas/${pe.fid}.jpg` : ""); };
const avPe = (pe, casa, tam = "") => { const f = vago(pe) ? "" : fotoPe(pe, casa); return `<span class="av pe ${tam}"><span>${vago(pe) ? "?" : esc(ini(pe.nome))}</span>${f ? `<img src="${esc(f)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`; };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const COMISSAO_BUSCA = {camara: "", senado: ""};
const COM_ESTADO = {};
const CASA_DE = {camara: "Câmara dos Deputados", senado: "Senado Federal"};
const COR_CASA = {camara: "var(--verde-forte)", senado: "var(--blue)"};
const linkComissao = (chave, sigla) => `#/comissao/${chave}/${encodeURIComponent(sigla)}`;
const membrosTitulares = c => (c.membros || []).filter(m => m.tipo !== "Suplente");

function casas(qual){
  const chave = qual === "senado" ? "senado" : "camara", casa = CASA_DE[chave], d = ORG[chave], cor = COR_CASA[chave];
  const cardPessoa = (rotulo, pe) => `<div class="org-card"><small>${esc(rotulo)}</small><div class="org-linha">${avPe(pe, casa)}<div class="org-txt"><b>${nomeLink(pe, casa)}</b>${seloPe(pe)}</div></div></div>`;
  const cardLider = g => `<div class="org-card"><small>${esc(g.nome)}</small><div class="org-linha">${avPe(g.lider, casa)}<div class="org-txt"><b>${nomeLink(g.lider, casa)}</b>${seloPe(g.lider)}${g.vices ? `<em>${plural(g.vices, "vice-líder", "vice-líderes")}</em>` : ""}</div></div></div>`;
  const grade = (titulo, itens, ajuda) => itens.length ? `<h3 class="org-sub">${titulo}</h3>${ajuda ? `<p class="nota" style="margin:-6px 0 12px">${ajuda}</p>` : ""}<div class="org-grid">${itens.join("")}</div>` : "";
  const l = d.liderancas;
  view.innerHTML = `<h1>Câmara e Senado</h1>
  <p class="lead">Quem comanda cada Casa do Congresso: Mesa Diretora, lideranças e comissões permanentes.</p>
  <div class="seg abas-casa"><a href="#/casas/camara" class="${chave === "camara" ? "on camara" : ""}">Câmara dos Deputados</a><a href="#/casas/senado" class="${chave === "senado" ? "on senado" : ""}">Senado Federal</a></div>
  <p class="aviso-org"><b>Composição atual</b> (${esc(ORG.legislatura)}), conforme os dados abertos oficiais de ${esc(ORG.geradoEm)}. A Mesa Diretora, as lideranças e as presidências de comissões devem ser renovadas no início da próxima legislatura, em fevereiro de 2027.</p>
  <div style="--c:${cor}">
  <h2>Mesa Diretora</h2>
  <p class="texto-proc">A Mesa dirige os trabalhos legislativos e a administração da Casa. É eleita pelos próprios parlamentares, para mandato de dois anos, e o presidente da Casa comanda as sessões.</p>
  <div class="org-grid">${d.mesa.map(m => cardPessoa(m.cargo, m)).join("")}</div>

  <h2>Lideranças</h2>
  <p class="texto-proc">Os líderes falam em nome dos partidos, dos blocos e do governo e, reunidos, ajudam a definir a pauta de votações.</p>
  ${grade(chave === "senado" ? "Governo, maioria, minoria e oposição" : "Governo", l.governo.map(cardLider))}
  ${grade("Blocos e federações", l.blocos.map(cardLider), "Partidos que atuam juntos nas votações.")}
  ${grade("Partidos", l.partidos.map(cardLider))}

  <h2>Comissões permanentes</h2>
  <p class="texto-proc">Analisam os projetos por tema antes de irem ao plenário. Presidente e vice-presidentes são escolhidos pelos membros de cada comissão. Clique em uma comissão para ver todos os parlamentares que participam dela.</p>
  <div class="filters"><input id="busca-com" type="search" placeholder="Buscar comissão, sigla ou presidente…" value="${esc(COMISSAO_BUSCA[chave])}"></div>
  <div class="count" id="cnt-com"></div><div class="org-grid com-grid" id="lista-com"></div></div>
  <p class="nota" style="margin-top:28px">Fonte: ${chave === "senado" ? "Dados Abertos do Senado Federal (legis.senado.leg.br/dadosabertos)" : "Dados Abertos da Câmara dos Deputados (dadosabertos.camara.leg.br)"}. Nomes ligados a um perfil levam à ficha do parlamentar.</p>`;
  const desenhar = () => {
    const q = normNome(COMISSAO_BUSCA[chave]);
    const r = d.comissoes.filter(c => !q || normNome(`${c.sigla} ${c.nome} ${c.presidente ? c.presidente.nome : ""}`).includes(q));
    $("#cnt-com").textContent = plural(r.length, "comissão", "comissões");
    $("#lista-com").innerHTML = r.map(c => { const nt = c.membros ? membrosTitulares(c).length : c.titulares, ns = c.membros ? c.membros.length - nt : c.suplentes;
      return `<div class="org-card com"><div class="com-topo"><span class="chip">${esc(c.sigla)}</span><em>${plural(nt, "titular", "titulares")} · ${plural(ns, "suplente", "suplentes")}</em></div>
      <b><a class="com-nome" href="${linkComissao(chave, c.sigla)}">${esc(c.nome)}</a></b>
      <div class="com-pres"><small>Presidente</small>${c.presidente ? `<div class="org-linha">${avPe(c.presidente, casa, "xs")}<div class="org-txt"><span>${nomeLink(c.presidente, casa)}</span>${seloPe(c.presidente)}</div></div>` : "<span>—</span>"}</div>
      ${c.vices.length ? `<div class="com-vice"><small>${c.vices.length > 1 ? "Vice-presidentes" : "Vice-presidente"}</small>${c.vices.map(v => `<span>${nomeLink(v, casa)} ${seloPe(v)}</span>`).join("")}</div>` : ""}
      <a class="com-ver" href="${linkComissao(chave, c.sigla)}">Ver todos os membros →</a></div>`; }).join("") || `<p class="lead">Nenhuma comissão encontrada.</p>`;
  };
  desenhar();
  $("#busca-com").oninput = e => { COMISSAO_BUSCA[chave] = e.target.value; desenhar(); };
}

function comissao(qual, sigla){
  const chave = qual === "senado" ? "senado" : "camara", casa = CASA_DE[chave], cor = COR_CASA[chave];
  const c = ORG[chave].comissoes.find(x => x.sigla === sigla);
  if (!c) { view.innerHTML = `${voltarPara()}<h1>Comissão não encontrada</h1>`; return; }
  const membros = c.membros || [], direcao = membros.filter(m => m.tipo !== "Titular" && m.tipo !== "Suplente"), tit = membros.filter(m => m.tipo === "Titular"), sup = membros.filter(m => m.tipo === "Suplente");
  const nTit = direcao.length + tit.length;
  const E = COM_ESTADO[chave + "/" + sigla] = COM_ESTADO[chave + "/" + sigla] || {q: "", partido: ""};
  const partidos = [...new Set(membros.map(m => m.partido).filter(Boolean))].sort((x, y) => x.localeCompare(y, "pt"));
  const cardMembro = m => `<div class="org-card membro"><div class="org-linha">${avPe(m, casa)}<div class="org-txt"><b>${nomeLink(m, casa)}</b>${seloPe(m)}${m.tipo !== "Titular" && m.tipo !== "Suplente" ? `<em>${esc(m.tipo)}</em>` : ""}</div></div></div>`;
  view.innerHTML = `${voltarPara()}
  <div style="--c:${cor}">
  <h1>${esc(c.nome)}</h1>
  <div><span class="chip">${esc(c.sigla)}</span><span class="chip">${esc(casa)}</span><span class="chip">${plural(nTit, "membro titular", "membros titulares")}</span><span class="chip">${plural(sup.length, "suplente", "suplentes")}</span>${c.vagas ? `<span class="chip">${plural(c.vagas, "vaga em aberto", "vagas em aberto")}</span>` : ""}</div>
  <p class="aviso-org">Composição atual, conforme os dados abertos oficiais de ${esc(ORG.geradoEm)}. Nomes ligados a um perfil levam à ficha do parlamentar.</p>
  ${direcao.length ? `<h2>Direção</h2><div class="org-grid">${direcao.map(cardMembro).join("")}</div>` : ""}
  <h2>Composição por partido</h2>
  <div class="card" style="max-width:640px">${bars(count(membros.filter(m => m.tipo !== "Suplente"), m => m.partido), k => corP(k))}<p class="nota">Considera os membros titulares (incluindo a direção).</p></div>
  <h2>Membros</h2>
  <div class="filters"><input id="busca-mem" type="search" placeholder="Buscar parlamentar…" value="${esc(E.q)}">
    <select id="par-mem" class="${E.partido ? "ativo" : ""}"><option value="">Partido</option>${partidos.map(p => `<option${p === E.partido ? " selected" : ""}>${esc(p)}</option>`).join("")}</select>
    <button class="clear inativo" id="lim-mem" type="button">Limpar filtros</button></div>
  <div id="membros-com"></div></div>`;
  const desenhar = () => {
    const q = normNome(E.q), ok = m => (!q || normNome(m.nome).includes(q)) && (!E.partido || m.partido === E.partido);
    const bloco = (titulo, lista) => { const f = lista.filter(ok); return lista.length ? `<h3 class="org-sub">${titulo} (${f.length}${f.length !== lista.length ? " de " + lista.length : ""})</h3>${f.length ? `<div class="org-grid">${f.map(cardMembro).join("")}</div>` : `<p class="lead">Ninguém encontrado.</p>`}` : ""; };
    $("#membros-com").innerHTML = bloco("Titulares", tit) + bloco("Suplentes", sup) || `<p class="lead">Esta comissão não tem membros listados.</p>`;
    $("#lim-mem").classList.toggle("inativo", !E.q && !E.partido); $("#par-mem").classList.toggle("ativo", !!E.partido);
  };
  desenhar();
  $("#busca-mem").oninput = e => { E.q = e.target.value; desenhar(); };
  $("#par-mem").onchange = e => { E.partido = e.target.value; desenhar(); };
  $("#lim-mem").onclick = () => { E.q = ""; E.partido = ""; $("#busca-mem").value = ""; $("#par-mem").value = ""; desenhar(); };
}

const wip = () => view.innerHTML = `<h1>Análises</h1><p class="lead">Cruzamentos e recortes temáticos.</p><div class="wip">🚧 Em construção — volte em breve.</div>`;

let rotaAtual = location.hash || "#/"; const origemDe = {}, rolagem = {};
const ehDetalhe = r => /^#\/(parlamentar|comissao)\//.test(r);
const ORIGENS = [["#/casas", "Câmara e Senado"], ["#/noticias", "Notícias"], ["#/estatisticas", "Estatísticas"], ["#/processo", "Processo legislativo"], ["#/parlamentares", "Parlamentares"], ["#/", "Panorama"]];
// botão "voltar" dos detalhes (perfil, comissão): leva à tela de onde a pessoa veio
const voltarPara = () => {
  const o = origemDe[rotaAtual] || (rotaAtual.startsWith("#/comissao/") ? `#/casas/${rotaAtual.split("/")[2]}` : "#/parlamentares");
  let rotulo = (ORIGENS.find(([p]) => o === p || o.startsWith(p + "/")) || ["", "Parlamentares"])[1];
  if (o.startsWith("#/comissao/")) { const [, , qual, sigla] = o.split("/"); const c = (ORG[qual] || {comissoes: []}).comissoes.find(x => x.sigla === decodeURIComponent(sigla || "")); rotulo = c ? `Comissão ${c.sigla}` : "Comissão"; }
  return `<a class="back" href="${esc(o)}">← ${esc(rotulo)}</a>`;
};
function route(){
  const anterior = rotaAtual; rolagem[anterior] = window.scrollY; rotaAtual = location.hash || "#/";
  if (rotaAtual.startsWith("#/parlamentar/") && !anterior.startsWith("#/parlamentar/")) origemDe[rotaAtual] = anterior;
  else if (rotaAtual.startsWith("#/comissao/") && !ehDetalhe(anterior)) origemDe[rotaAtual] = anterior;
  const voltandoDoPerfil = origemDe[anterior] === rotaAtual;
  const h = location.hash.replace(/^#\/?/,"").split("/");
  const r = h[0] || "home";
  ({home, parlamentares:lista, parlamentar:()=>ficha(decodeURIComponent(h[1]||"")), sobre, estatisticas, noticias, processo, casas:()=>casas(h[1]), comissao:()=>comissao(h[1], decodeURIComponent(h[2]||"")), analises:wip}[r] || home)();
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("on", a.dataset.nav === (r==="parlamentar"?"lista":r==="parlamentares"?"lista":r==="comissao"?"casas":r)));
  tip.hidden = true;
  if(mob.matches) menu(false);
  window.scrollTo(0, voltandoDoPerfil ? (rolagem[rotaAtual] || 0) : 0); // ao voltar de um perfil, retoma o ponto da página onde a pessoa estava
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
