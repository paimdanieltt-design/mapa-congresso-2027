// Animação do fundo: pulsos de luz correm pelas linhas que ligam as pessoas, passando de uma para outra.
// Desenha só num <canvas> por cima da imagem de fundo (assets/rede.webp), usando as posições de data/rede-grafo.js.
// Respeita "reduzir movimento" do sistema e pausa quando a faixa não está visível ou a aba está em segundo plano.
(() => {
  const G = window.REDE_GRAFO;
  if (!G || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const COR_NUCLEO = "31,79,216", COR_BRILHO = "143,176,255", COR_NO = "101,165,156"; // azul da marca, azul claro, verde-água
  const RAIO_AVATAR = 24;   // a luz "sai" da borda de cada pessoa, não do centro
  const adj = G.nos.map(() => []);
  G.arestas.forEach(([a, b], i) => { adj[a].push(i); adj[b].push(i); });

  function iniciar(el, posY) {
    const cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, esc = 1, ox = 0, oy = 0, visiveis = [], pulsos = [], aneis = [], ultimo = 0, rodando = false, proximoNascimento = 0;

    // mesmo enquadramento do CSS "background-size: cover" (posX centro; posY 0.5 = centro, 1 = base)
    const medir = () => {
      const r = el.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      esc = Math.max(W / G.w, H / G.h); ox = (W - G.w * esc) / 2; oy = (H - G.h * esc) * posY;
      const P = i => [ox + G.nos[i][0] * esc, oy + G.nos[i][1] * esc];
      visiveis = G.arestas.map(([a, b], i) => i).filter(i => { const [a, b] = G.arestas[i], [x1, y1] = P(a), [x2, y2] = P(b);
        return Math.max(x1, x2) > -10 && Math.min(x1, x2) < W + 10 && Math.max(y1, y2) > -10 && Math.min(y1, y2) < H + 10; });
      pulsos = []; aneis = [];
    };
    const pos = i => [ox + G.nos[i][0] * esc, oy + G.nos[i][1] * esc];
    const maxPulsos = () => (W < 600 ? 5 : 10);

    const brilhou = new Map();   // aresta -> quando brilhou pela última vez
    const recente = (i, ms) => performance.now() - (brilhou.get(i) || -1e9) < ms;
    const escolher = () => {  // espalha os clarões por toda a rede: dá mais chance às linhas que brilharam há mais tempo e evita as perto de outro clarão
      const agora = performance.now();
      const ativos = pulsos.map(p => { const [x1, y1] = pos(p.inicio), [x2, y2] = pos(p.fim), k = Math.min(1, p.t / p.comp); return [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k]; });
      const pesos = visiveis.map(i => {
        const [a, b] = G.arestas[i], [xa, ya] = pos(a), [xb, yb] = pos(b), mx = (xa + xb) / 2, my = (ya + yb) / 2;
        const idade = agora - (brilhou.get(i) ?? -1e9);
        if (idade < 6000) return 0.001;                                                  // acabou de brilhar: descansa
        const justo = Math.min(idade, 30000) / 30000;                                    // quanto mais tempo apagada, mais chance
        const dmin = ativos.length ? Math.min(...ativos.map(([x, y]) => Math.hypot(x - mx, y - my))) : 1e9;
        return (0.03 + justo * justo) * (0.15 + 0.85 * Math.min(1, dmin / (240 * esc)));            // longe de outros clarões
      });
      let r = Math.random() * pesos.reduce((x, y) => x + y, 0);
      for (let k = 0; k < pesos.length; k++) { r -= pesos[k]; if (r <= 0) return visiveis[k]; }
      return visiveis[visiveis.length - 1];
    };
    function novoPulso(aresta, de) {
      brilhou.set(aresta, performance.now());
      const [a, b] = G.arestas[aresta], inicio = de ?? (Math.random() < 0.5 ? a : b), fim = inicio === a ? b : a;
      const [x1, y1] = pos(inicio), [x2, y2] = pos(fim), comp = Math.hypot(x2 - x1, y2 - y1);
      pulsos.push({ aresta, inicio, fim, t: 0, comp, vel: (210 + Math.random() * 140) * esc, cauda: (46 + Math.random() * 26) * esc });
    }
    function seguir(p) {  // ao chegar numa pessoa, acende o nó e segue por outra linha (quase sempre)
      aneis.push({ no: p.fim, t: 0 });
      const todas = adj[p.fim].filter(i => i !== p.aresta && visiveis.includes(i)), frescas = todas.filter(i => !recente(i, 9000)), opcoes = frescas.length ? frescas : todas;
      if (opcoes.length && Math.random() < 0.5) novoPulso(opcoes[Math.floor(Math.random() * opcoes.length)], p.fim);
    }

    function quadro(agora) {
      if (!rodando) return;
      const dt = Math.min(0.05, (agora - ultimo) / 1000 || 0.016); ultimo = agora;
      if (pulsos.length < maxPulsos() && visiveis.length && agora > proximoNascimento) {
        novoPulso(escolher()); proximoNascimento = agora + 160 + Math.random() * 320;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.lineCap = "round";
      for (const a of aneis) a.t += dt;
      aneis = aneis.filter(a => a.t < 0.6);
      for (const a of aneis) { const [x, y] = pos(a.no), k = a.t / 0.6;
        ctx.strokeStyle = `rgba(${COR_NO},${0.6 * (1 - k) ** 1.5})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(x, y, 14 + 16 * k, 0, 2 * Math.PI); ctx.stroke(); }
      const vivos = [];
      for (const p of pulsos) {
        p.t += p.vel * dt;
        const [x1, y1] = pos(p.inicio), [x2, y2] = pos(p.fim), ux = (x2 - x1) / p.comp, uy = (y2 - y1) / p.comp;
        const ini = RAIO_AVATAR * esc, fimUtil = p.comp - ini;                       // trecho livre da linha, entre as duas pessoas
        const cabeca = p.t, c0 = Math.max(ini, cabeca - p.cauda), c1 = Math.min(fimUtil, cabeca);
        if (c1 > c0 + 0.5) {                                                        // só desenha o pedaço do feixe que está dentro da linha
          const xa = x1 + ux * c0, ya = y1 + uy * c0, xb = x1 + ux * c1, yb = y1 + uy * c1;
          const gr = ctx.createLinearGradient(xa, ya, xb, yb);
          gr.addColorStop(0, `rgba(${COR_NUCLEO},0)`); gr.addColorStop(0.65, `rgba(${COR_NUCLEO},0.7)`); gr.addColorStop(1, `rgba(${COR_BRILHO},1)`);
          ctx.shadowColor = `rgba(${COR_NUCLEO},0.75)`; ctx.shadowBlur = 8; ctx.strokeStyle = gr; ctx.lineWidth = 2.6;
          ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.shadowBlur = 0;
          if (cabeca <= fimUtil) { ctx.fillStyle = `rgba(${COR_BRILHO},0.95)`; ctx.beginPath(); ctx.arc(xb, yb, 2.8, 0, 2 * Math.PI); ctx.fill(); }
        }
        if (!p.chegou && cabeca >= fimUtil) { p.chegou = true; seguir(p); }          // a luz chegou na pessoa: acende o nó e segue por outra linha
        if (cabeca - p.cauda < fimUtil) vivos.push(p);                              // o feixe some assim que o rabo sai da linha
      }
      pulsos = vivos;
      requestAnimationFrame(quadro);
    }

    const ligar = ligado => { if (ligado && !rodando && !document.hidden) { rodando = true; ultimo = performance.now(); requestAnimationFrame(quadro); } else if (!ligado) { rodando = false; ctx.clearRect(0, 0, W, H); } };
    let naTela = true;
    new ResizeObserver(medir).observe(el); medir();
    new IntersectionObserver(([e]) => { naTela = e.isIntersecting; ligar(naTela); }).observe(el);
    document.addEventListener("visibilitychange", () => ligar(naTela && !document.hidden));
    ligar(true);
  }

  document.querySelectorAll(".rede-topo").forEach(el => iniciar(el, 0.5));
  document.querySelectorAll(".rede-fim").forEach(el => iniciar(el, 1));
})();
