/* Varal de polaroids — adaptado do Polaroid Line Carousel (ProfitizeBuild) para HTML puro.
 * As fotos ficam presas por pregadores num fio que cede no meio. Arrastar (ou as setas, ou ←/→) desliza as fotos
 * pelo fio, e elas balançam com a velocidade que a pessoa deu; paradas, balançam numa brisa. A do meio fica à vista.
 * A física é a mesma do componente: mola de amortecimento crítico (k = 70) e balanço com gravidade 38, atrito 4,2. */
(() => {
  const root = document.querySelector(".varal");
  if (!root) return;

  const cards = [...root.querySelectorAll(".varal-foto")];
  const n = cards.length;
  if (!n) return;
  const path = root.querySelector(".varal-fio path");
  const cap = root.querySelector(".varal-cap");
  const conta = root.querySelector(".varal-conta");
  const aviso = root.querySelector("[aria-live]");
  const SAG = 46, SWING = 1, AUTOPLAY = 4500, CARD_MAX = 300;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad2 = (k) => (k < 10 ? "0" + k : String(k));
  const stringY = (x, w, y0, sag) => { const t = clamp(x / w, 0, 1); return y0 + 4 * sag * t * (1 - t); };
  const springStep = (x, v, alvo, dt, k = 70) => { const c = 2 * Math.sqrt(k); const nv = v + (k * (alvo - x) - c * v) * dt; return [x + nv * dt, nv]; };
  const swingStep = (a, w, vel, dt, gain) => { const nw = w + (-38 * a - 4.2 * w + vel * 0.0034 * gain) * dt; return [clamp(a + nw * dt, -0.6, 0.6), nw]; };
  const nearestAt = (off, sp) => clamp(Math.round(off / sp), 0, n - 1);

  const reduzir = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const S = { off: 0, vel: 0, target: 0, a: new Array(n).fill(0), w: new Array(n).fill(0) };
  let W = 0, H = 0, cw = CARD_MAX, spacing = cw * 1.08, ativo = -1, drag = null, lastTouch = 0;

  const medir = () => {
    W = root.clientWidth; H = root.clientHeight;
    cw = Math.round(Math.max(150, Math.min(CARD_MAX, W * 0.42, H * 0.42)));
    root.style.setProperty("--varal-cw", cw + "px");
    const idx = Math.max(0, ativo);
    spacing = cw * 1.08;
    S.target = S.off = idx * spacing;
  };
  const goTo = (i) => { S.target = clamp(i, 0, n - 1) * spacing; };

  const mostrar = (i) => {
    ativo = i;
    cards.forEach((c, k) => { c.dataset.on = k === i ? "1" : "0"; c.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    const c = cards[i];
    const titulo = c.querySelector(".varal-nota").textContent;
    cap.innerHTML = "";
    const t = document.createElement("span"); t.className = "varal-titulo"; t.textContent = titulo;
    const l = document.createElement("span"); l.className = "varal-sub"; l.textContent = c.dataset.legenda || "";
    cap.append(t, l);
    conta.innerHTML = `<b>${pad2(i + 1)}</b> / ${pad2(n)}`;
    aviso.textContent = `Foto ${i + 1} de ${n}: ${titulo}`;
  };

  let visivel = true, raf = 0, prev = performance.now();
  const frame = (now) => {
    raf = 0;
    if (!visivel) return;
    const dt = Math.min(0.033, (now - prev) / 1000);
    prev = now;
    const y0 = Math.max(36, H * 0.08);
    let lineVel;
    if (drag && drag.moved) lineVel = drag.v * 1000;
    else { const antes = S.off; [S.off, S.vel] = springStep(S.off, S.vel, S.target, dt); lineVel = -(S.off - antes) / Math.max(dt, 1e-3); }
    const g = reduzir() ? 0 : SWING;
    const perto = nearestAt(S.off, spacing);
    for (let i = 0; i < n; i++) {
      const el = cards[i];
      const x = W / 2 + i * spacing - S.off;
      if (x < -cw * 1.5 || x > W + cw * 1.5) { el.style.visibility = "hidden"; continue; }
      el.style.visibility = "visible";
      let a = S.a[i], av = S.w[i];
      [a, av] = swingStep(a, av, lineVel, dt, g);
      if (g) a += Math.sin(now / 1300 + i * 1.7) * 0.0009 * g;
      S.a[i] = a; S.w[i] = av;
      const y = stringY(x, W, y0, SAG) - 6;
      el.style.transform = `translate(${(x - cw / 2).toFixed(1)}px,${y.toFixed(1)}px) rotate(${a.toFixed(4)}rad)`;
      el.style.zIndex = String(i === perto ? n + 1 : n - Math.abs(i - perto));
    }
    path.setAttribute("d", `M0 ${y0} Q${W / 2} ${y0 + 2 * SAG} ${W} ${y0}`);
    if (perto !== ativo) mostrar(perto);
    raf = requestAnimationFrame(frame);
  };
  const ligar = () => { if (!raf && visivel) { prev = performance.now(); raf = requestAnimationFrame(frame); } };

  new ResizeObserver(() => { medir(); ligar(); }).observe(root);
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; ligar(); }).observe(root);

  // Autoplay: anda sozinho só com o varal na tela e ninguém mexendo; volta à primeira depois da última
  setInterval(() => {
    if (!visivel || document.hidden || drag || reduzir() || performance.now() - lastTouch < AUTOPLAY) return;
    goTo(ativo >= n - 1 ? 0 : ativo + 1);
  }, AUTOPLAY);

  // Arrastar: o fio vai junto com o ponteiro; ao soltar, para na foto mais perto do meio (um puxão rápido vai mais longe)
  root.addEventListener("pointerdown", (e) => {
    if (e.button > 0 || e.target.closest(".varal-barra")) return;
    lastTouch = performance.now();
    drag = { x: e.clientX, off: S.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false };
  });
  root.addEventListener("pointermove", (e) => {
    const d = drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      root.dataset.drag = "1";
      try { root.setPointerCapture(e.pointerId); } catch (_) { /* o ponteiro já saiu */ }
    }
    if (!d.moved) return;
    const dtp = Math.max(1, e.timeStamp - d.lt);
    d.v = 0.7 * ((e.clientX - d.lx) / dtp) + 0.3 * d.v;
    d.lx = e.clientX; d.lt = e.timeStamp;
    const max = (n - 1) * spacing;
    let off = d.off - dx;
    if (off < 0) off *= 0.35;
    if (off > max) off = max + (off - max) * 0.35;
    S.off = off;
  });
  const soltar = (e) => {
    const d = drag;
    drag = null;
    lastTouch = performance.now();
    if (!d) return;
    if (d.moved) {
      root.dataset.drag = "0";
      S.vel = -d.v * 1000;
      goTo(nearestAt(S.off - d.v * 180, spacing));
      return;
    }
    const c = e.target.closest && e.target.closest(".varal-foto");
    if (c) goTo(cards.indexOf(c));
  };
  root.addEventListener("pointerup", soltar);
  root.addEventListener("pointercancel", soltar);

  const passo = (dir) => { lastTouch = performance.now(); goTo(ativo + dir); };
  root.querySelectorAll(".varal-btn").forEach((b) => b.addEventListener("click", () => passo(Number(b.dataset.dir))));
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") passo(1);
    else if (e.key === "ArrowLeft") passo(-1);
    else return;
    e.preventDefault();
  });

  root.classList.add("pronto");
  medir();
  mostrar(0);
  ligar();
})();
