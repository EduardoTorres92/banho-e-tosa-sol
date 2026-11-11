/* Rodapé com a palavra em retícula — adaptado do Halftone Wordmark Footer (ProfitizeBuild) para HTML puro.
 * A palavra (data-palavra no <footer>) é desenhada uma vez numa máscara e vira uma grade de pontos de 6 px, com a área
 * de cada ponto proporcional ao quanto a letra cobre a célula. O mouse empurra os pontos em molas, que esquentam de cor
 * conforme saem do lugar; o clique fora dos links solta uma onda de choque. Parado, o desenho dorme. */
(() => {
  const root = document.querySelector(".rodape-sol");
  const canvas = root && root.querySelector("canvas");
  const ctx = canvas && canvas.getContext("2d");
  if (!ctx) return;

  const css = getComputedStyle(document.documentElement);
  const cor = (v, reserva) => (css.getPropertyValue(v).trim() || reserva);
  const O = {
    palavra: root.dataset.palavra || "sol",
    fundo: cor("--fundo", "#080604"),
    tinta: cor("--acento", "#c9a24a"),
    quente: "#fff1c9",                 // o dourado clareia até o creme quando o ponto sai do lugar
    fonte: '"Fraunces", Georgia, serif',
    peso: 500,
    gap: 6, raio: 80, corte: 0.22, grao: 0.5,
  };

  const hex = (h) => { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((h || "").trim()); if (!m) return null; const s = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1]; return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
  const raioPonto = (cob, gap) => Math.sqrt(Math.max(0, Math.min(1, cob))) * gap * 0.56;
  const passo = (x, y, vx, vy, hx, hy, px, py, r) => {
    const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
    if (r > 0 && d2 < r * r) { const d = Math.sqrt(d2) + 0.001, f = (1 - d / r) * 2.6; vx += (dx / d) * f; vy += (dy / d) * f; }
    vx = (vx + (hx - x) * 0.05) * 0.84;
    vy = (vy + (hy - y) * 0.05) * 0.84;
    return [x + vx, y + vy, vx, vy];
  };
  const calor = (x, y, hx, hy, span) => Math.min(1, Math.hypot(x - hx, y - hy) / span);

  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tinta = hex(O.tinta) || [201, 162, 74];
  const quente = hex(O.quente) || [255, 241, 201];
  let w = 0, h = 0, dpr = 1, px = -1e5, py = -1e5, raf = 0, visivel = true, acordado = true;
  let anel = { x: 0, y: 0, t: -1 }, pontos = new Float32Array(0), total = 0, grao = null;

  const montar = () => {
    w = Math.max(1, root.clientWidth);
    h = Math.max(1, root.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const mask = document.createElement("canvas");
    mask.width = w; mask.height = h;
    const m = mask.getContext("2d", { willReadFrequently: true });
    m.font = `${O.peso} 100px ${O.fonte}`;
    const larg = m.measureText(O.palavra).width;
    // Preenche a largura (102%), mas sem passar de 62% da altura do rodapé: "sol" é curta e ficaria alta demais
    let tam = larg > 0 ? (w * 1.02 / larg) * 100 : 0;
    m.font = `${O.peso} ${tam}px ${O.fonte}`;
    let caixa = m.measureText(O.palavra);
    let alt = caixa.actualBoundingBoxAscent || tam * 0.72;
    // ...e sem subir por cima dos links: a parte visível cabe no espaço abaixo do filete
    const filete = root.querySelector(".rs-filete");
    const livre = filete ? h - (filete.offsetTop + filete.offsetHeight) - 24 : h * 0.62;
    const teto = Math.min(h * 0.62, livre);
    if (alt * (1 - O.corte) > teto) {
      tam *= teto / (alt * (1 - O.corte));
      m.font = `${O.peso} ${tam}px ${O.fonte}`;
      caixa = m.measureText(O.palavra);
      alt = caixa.actualBoundingBoxAscent || tam * 0.72;
    }
    m.fillStyle = "#000";
    m.textBaseline = "alphabetic";
    m.fillText(O.palavra, (w - caixa.width) / 2, h + alt * O.corte);
    const img = m.getImageData(0, 0, w, h).data;

    const gap = O.gap, cols = Math.ceil(w / gap), rows = Math.ceil(h / gap), tmp = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        let soma = 0;
        for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
          const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
          const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
          soma += img[(y * w + x) * 4 + 3];
        }
        const cob = soma / (9 * 255);
        if (cob < 0.06) continue;
        const hx = gx * gap + gap / 2, hy = gy * gap + gap / 2;
        tmp.push(hx, hy, 0, 0, hx, hy, raioPonto(cob, gap));
      }
    }
    pontos = new Float32Array(tmp);
    total = tmp.length / 7;

    grao = document.createElement("canvas");
    grao.width = grao.height = 256;
    const g = grao.getContext("2d");
    const id = g.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = Math.random() * 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = Math.random() < 0.5 ? 0 : 255;
    }
    g.putImageData(id, 0, 0);
    acordado = true;
  };

  const desenhar = (agora) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = O.fundo;
    ctx.fillRect(0, 0, w, h);
    const r = reduzir ? 0 : O.raio;
    const idade = anel.t < 0 ? 1e9 : agora - anel.t;
    const raioAnel = idade * 0.9;
    let mexendo = false;
    for (let i = 0; i < total; i++) {
      const j = i * 7;
      let x = pontos[j], y = pontos[j + 1], vx = pontos[j + 2], vy = pontos[j + 3];
      const hx = pontos[j + 4], hy = pontos[j + 5];
      if (!reduzir) {
        if (idade < 900) {
          const dx = hx - anel.x, dy = hy - anel.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const faixa = 1 - Math.min(1, Math.abs(d - raioAnel) / 26);
          if (faixa > 0) { const f = faixa * 3.2 * (1 - idade / 900); vx += (dx / d) * f; vy += (dy / d) * f; }
        }
        [x, y, vx, vy] = passo(x, y, vx, vy, hx, hy, px, py, r);
        if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) mexendo = true;
        else { x = hx; y = hy; vx = 0; vy = 0; }
        pontos[j] = x; pontos[j + 1] = y; pontos[j + 2] = vx; pontos[j + 3] = vy;
      }
      const k = calor(x, y, hx, hy, 28);
      ctx.fillStyle = k > 0.02
        ? `rgb(${Math.round(tinta[0] + (quente[0] - tinta[0]) * k)},${Math.round(tinta[1] + (quente[1] - tinta[1]) * k)},${Math.round(tinta[2] + (quente[2] - tinta[2]) * k)})`
        : O.tinta;
      ctx.beginPath();
      ctx.arc(x, y, pontos[j + 6], 0, 6.2832);
      ctx.fill();
    }
    if (grao && O.grao > 0) {
      ctx.globalAlpha = O.grao * 0.09;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = ctx.createPattern(grao, "repeat");
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    acordado = mexendo || idade < 900 || px > -1e4;
  };

  const laco = (agora) => { raf = 0; if (!visivel) return; desenhar(agora); if (acordado) raf = requestAnimationFrame(laco); };
  const acordar = () => { acordado = true; if (!raf && visivel) raf = requestAnimationFrame(laco); };
  const local = (e) => { const b = canvas.getBoundingClientRect(); return [((e.clientX - b.left) * w) / (b.width || w), ((e.clientY - b.top) * h) / (b.height || h)]; };

  root.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; [px, py] = local(e); acordar(); });
  root.addEventListener("pointerleave", () => { px = py = -1e5; acordar(); });
  root.addEventListener("pointerdown", (e) => {
    if (reduzir || e.target.closest("a,button")) return;
    const [x, y] = local(e);
    anel = { x, y, t: performance.now() };
    acordar();
  });

  montar();
  desenhar(performance.now());
  acordar();
  new ResizeObserver(() => { montar(); acordar(); }).observe(root);
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (visivel) acordar(); }).observe(root);
  // A Fraunces chega depois do primeiro desenho: refaz a palavra na fonte certa
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { montar(); acordar(); });
})();
