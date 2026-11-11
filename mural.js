/* Mural dos tutores — adaptado da seção "Mural do balcão" da landing page Shari (ProfitizeBuild).
 * Seis polaroids espalhadas e inclinadas caem girando quando o mural entra na tela (só depois das fotos carregadas,
 * para nada cair vazio). Com mouse, cada uma se arrasta e vem para a frente; ao soltar, assenta com um giro novo.
 * No celular viram duas colunas desencontradas, sem arrastar. Os recados vêm de config.js (depoimentos). */
(() => {
  const S = window.SITE || {};
  const lista = (S.depoimentos || []).filter((d) => d && d.texto);
  const secao = document.querySelector(".secao--mural");
  const mural = secao && secao.querySelector(".mural");
  if (!mural || !lista.length) return;

  // Recado de exemplo nunca vai para o ar: só aparece no computador e nas prévias do Netlify (endereço com "--")
  const h = location.hostname;
  const ensaio = !h || h === "localhost" || h === "127.0.0.1" || h.includes("--");
  if (lista.some((d) => d.exemplo) && !ensaio) return;
  secao.hidden = false;

  // Lugar e giro de cada polaroid no mural (x e y de 0 a 1, giro em graus); repete se houver mais de seis
  const LUGARES = [[0.0, 0.04, -6], [0.36, 0.0, 4], [0.72, 0.06, -3], [0.18, 0.96, 5], [0.54, 0.92, -5], [0.92, 1.0, 3]];
  const reduzir = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mouse = matchMedia("(hover: hover) and (pointer: fine)");
  const largo = matchMedia("(min-width: 861px)");

  const itens = lista.slice(0, 8).map((d, i) => {
    const li = document.createElement("li");
    li.className = "recado";
    const [x, y, r] = LUGARES[i % LUGARES.length];
    li.style.setProperty("--x", x);
    li.style.setProperty("--y", y);
    li.style.setProperty("--r", r + "deg");
    const fig = document.createElement("figure");
    if (d.foto) {
      const moldura = document.createElement("div");
      moldura.className = "recado-img";
      const img = document.createElement("img");
      img.src = d.foto;
      img.alt = d.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.draggable = false;
      moldura.append(img);
      fig.append(moldura);
    }
    const q = document.createElement("blockquote");
    q.textContent = d.texto;
    const quem = document.createElement("figcaption");
    const nome = document.createElement("strong");
    nome.textContent = d.nome || "";
    quem.append(nome);
    if (d.cao) quem.append(document.createTextNode(` · tutor do ${d.cao}`));
    fig.append(q, quem);
    li.append(fig);
    if (d.exemplo) {
      const selo = document.createElement("span");
      selo.className = "recado-selo";
      selo.textContent = "exemplo";
      li.append(selo);
    }
    mural.append(li);
    return { li, r, dx: 0, dy: 0 };
  });

  const giro = (it) => (largo.matches ? it.r : it.r * 0.4);
  const pousar = (it) => { it.li.style.transform = `translate(${it.dx}px, ${it.dy}px) rotate(${giro(it)}deg)`; };
  itens.forEach(pousar);

  // A queda: espera as fotos (limite de 1,5 s para a rede lenta) e solta uma por uma
  const fotos = () => Promise.race([
    Promise.all(itens.map((it) => { const img = it.li.querySelector("img"); return img && img.decode ? img.decode().catch(() => {}) : null; })),
    new Promise((ok) => setTimeout(ok, 1500)),
  ]);
  let caiu = false;
  const cair = () => {
    if (caiu) return;
    caiu = true;
    mural.classList.add("caindo");
    itens.forEach((it, i) => {
      if (reduzir()) return;
      const solto = it.r + (i % 2 ? 38 : -42);
      it.li.animate(
        largo.matches
          ? [{ transform: `translate(0, -110vh) rotate(${solto}deg)`, opacity: 1 }, { transform: `translate(0, 0) rotate(${it.r}deg)`, opacity: 1 }]
          : [{ transform: `translate(0, -40px) rotate(${giro(it) - 6}deg)`, opacity: 0 }, { transform: `translate(0, 0) rotate(${giro(it)}deg)`, opacity: 1 }],
        { duration: largo.matches ? 950 : 600, delay: i * 110, easing: "cubic-bezier(.2, 1.25, .4, 1)", fill: "backwards" },
      );
    });
    mural.classList.add("caiu");
  };
  // Pede as fotos uma tela e meia antes e solta quando o mural aparece
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    itens.forEach((it) => { const img = it.li.querySelector("img"); if (img) img.loading = "eager"; });
    const pronto = fotos();
    new IntersectionObserver(([v], o2) => {
      if (!v.isIntersecting) return;
      o2.disconnect();
      pronto.then(cair);
    }, { threshold: 0.2 }).observe(mural);
  }, { rootMargin: "150% 0px" }).observe(mural);

  // Arrastar (só com mouse e no mural largo): a polaroid vem para a frente e assenta com um giro novo
  let topo = itens.length + 1, pega = null;
  mural.addEventListener("pointerdown", (e) => {
    if (!mouse.matches || !largo.matches || e.button !== 0) return;
    const li = e.target.closest(".recado");
    const it = li && itens.find((x) => x.li === li);
    if (!it) return;
    e.preventDefault();
    li.style.zIndex = ++topo;
    li.classList.add("pega");
    pega = { it, x: e.clientX, y: e.clientY, dx: it.dx, dy: it.dy };
    li.setPointerCapture(e.pointerId);
  });
  mural.addEventListener("pointermove", (e) => {
    if (!pega) return;
    const { it } = pega;
    const caixa = mural.getBoundingClientRect(), card = it.li.getBoundingClientRect();
    const nx = pega.dx + e.clientX - pega.x, ny = pega.dy + e.clientY - pega.y;
    // não deixa sair do mural
    const base = { l: card.left - caixa.left - it.dx, t: card.top - caixa.top - it.dy };
    it.dx = Math.max(-base.l, Math.min(caixa.width - card.width - base.l, nx));
    it.dy = Math.max(-base.t - 40, Math.min(caixa.height - card.height - base.t + 40, ny));
    pousar(it);
  });
  const soltar = () => {
    if (!pega) return;
    const { it } = pega;
    pega = null;
    it.li.classList.remove("pega");
    it.r = Math.round((Math.random() * 16 - 8) * 10) / 10;
    pousar(it);
  };
  mural.addEventListener("pointerup", soltar);
  mural.addEventListener("pointercancel", soltar);

  // Voltando ao celular, as polaroids saem da posição arrastada
  largo.addEventListener("change", () => itens.forEach((it) => { it.dx = it.dy = 0; pousar(it); }));
})();
