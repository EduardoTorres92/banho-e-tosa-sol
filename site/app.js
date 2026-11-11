(() => {
  const S = window.SITE || {};
  const mqReduzir = matchMedia("(prefers-reduced-motion: reduce)");
  let reduzir = mqReduzir.matches;
  mqReduzir.addEventListener("change", (e) => { reduzir = e.matches; document.dispatchEvent(new Event("reduzir-mudou")); });

  /* ── Medição: Pixel da Meta e Google Analytics, só se houver ID no config ── */
  const M = S.medicao || {};
  if (/^\d{15,16}$/.test(M.pixelMeta || "")) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", M.pixelMeta);
    fbq("track", "PageView");
  }
  if (/^G-[A-Z0-9]+$/.test(M.googleAnalytics || "")) {
    const g = document.createElement("script");
    g.async = true;
    g.src = `https://www.googletagmanager.com/gtag/js?id=${M.googleAnalytics}`;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", M.googleAnalytics);
  }


  /* ── Palco: a rolagem toca o olhar do cachorro e revela os serviços ─────── */
  const palco = document.querySelector(".palco");
  const canvas = palco && palco.querySelector(".cao-canvas");
  if (palco && canvas && S.frames && S.frames.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const mqCel = matchMedia("(max-width: 860px)");
    const padrao = () => (mqCel.matches ? S.frames.mobile : S.frames.desktop);
    let base = padrao();
    const src = (i) => base.replace("{n}", String(i + 1).padStart(4, "0"));
    let quadros = new Array(total);
    const fundo = getComputedStyle(document.documentElement).getPropertyValue("--fundo").trim() || "#080604";

    const abertura = palco.querySelector(".abertura");
    const servicos = palco.querySelector(".servicos");
    const itens = [...palco.querySelectorAll(".servico")];
    let alvo = 0, atual = 0, desenhado = -1;

    // Linha do tempo (progresso da rolagem 0–1 → posição no vídeo 0–1).
    // 0–0.14: abertura, ele olha para o título. 0.14–0.80: olhos descem com os cards.
    // 0.80–0.96: ele vira e olha para quem está vendo.
    // Os cards se espalham entre 0.2 e 0.76, seja qual for a quantidade de serviços.
    const P_SERV = 0.14, P_CARD0 = 0.2, P_CARD_FIM = 0.76;
    const P_CARD_PASSO = itens.length > 1 ? (P_CARD_FIM - P_CARD0) / (itens.length - 1) : 0;
    const mapa = [[0, 0], [0.14, 0.02], [0.80, 0.62], [0.96, 1], [1, 1]];
    const video = (p) => {
      for (let k = 1; k < mapa.length; k++) {
        const [p0, v0] = mapa[k - 1], [p1, v1] = mapa[k];
        if (p <= p1) return v0 + (v1 - v0) * ((p - p0) / (p1 - p0 || 1));
      }
      return 1;
    };

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };
    // Só o 1º quadro baixa ao abrir; o resto espera o primeiro sinal de rolagem.
    // Quem não rola não gasta o plano de dados com o vídeo inteiro.
    let liberado = scrollY > 0;
    if (!liberado) {
      const sinais = ["scroll", "wheel", "touchstart", "keydown", "pointerdown"];
      const liberar = () => {
        if (liberado) return;
        liberado = true;
        sinais.forEach((s) => removeEventListener(s, liberar));
        carregarTudo();
      };
      sinais.forEach((s) => addEventListener(s, liberar, { passive: true }));
    }
    const carregarTudo = () => {
      carregar(0);
      if (reduzir || !liberado) return;
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    };
    carregarTudo();

    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    const ajustar = () => {
      const novo = padrao();
      if (novo !== base) { base = novo; quadros = new Array(total); carregarTudo(); }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1;
      desenhar(Math.round(atual), true);
      setTimeout(() => seguir(ultimoAtivo), 0); // seguir é definido mais abaixo
    };

    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
      let s, x, y;
      if (mqCel.matches) {
        // celular: caixa larga e baixa → preenche a largura e mostra a cabeça
        const empe = ch / cw > 1.3;
        // em pé: um pouco maior e com a cabeça mais alta, para os olhos ficarem acima dos cards
        // sem sobrar faixa vazia embaixo
        s = Math.max(cw / iw, ch / ih) * (empe ? 1.14 : 1);
        x = (cw - iw * s) / 2;
        y = empe ? -ih * s * 0.12 : Math.max(ch - ih * s, -ih * s * 0.1);
      } else {
        // desktop: retrato inteiro na altura, encostado à direita
        s = Math.max(ch / ih, (cw * 0.62) / iw);
        x = Math.max(0, cw - iw * s - cw * 0.05);
        y = Math.min(0, (ch - ih * s) * 0.3);
      }
      ctx.fillStyle = fundo;
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, iw * s, ih * s);
      // dissolve as laterais do retrato no fundo (nunca um retângulo visível)
      const w = iw * s, h = ih * s, f = w * 0.24;
      if (y > -h * 0.2) { // topo do retrato também se dissolve
        const ft = Math.min(h * 0.14, ch * 0.2);
        const g = ctx.createLinearGradient(0, Math.max(y, 0), 0, Math.max(y, 0) + ft);
        g.addColorStop(0, fundo); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fillRect(0, Math.max(y, 0) - 1, cw, ft + 1);
      }
      if (x > 0 || !mqCel.matches) {
        let g = ctx.createLinearGradient(x, 0, x + f, 0);
        g.addColorStop(0, fundo); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 1, 0, f + 1, ch);
        g = ctx.createLinearGradient(x + w, 0, x + w - f, 0);
        g.addColorStop(0, fundo); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fillRect(x + w - f, 0, f + 1, ch);
      }
      desenhado = j;
    }

    const progresso = () => {
      const r = palco.getBoundingClientRect();
      const curso = palco.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / (curso || 1)));
    };

    let ultimoAtivo = -2;
    const lista = palco.querySelector(".lista-servicos");
    // Se a lista não cabe na tela, ela rola sozinha para o card atual ficar à vista.
    const seguir = (n) => {
      if (!lista) return;
      const sobra = lista.scrollHeight - lista.clientHeight;
      lista.classList.toggle("transborda", sobra > 4);
      if (sobra <= 4) return;
      // espera a descrição do card atual abrir antes de medir
      setTimeout(() => {
        const el = itens[Math.max(n, 0)];
        const alvoTopo = n < 0 ? 0 : Math.min(lista.scrollHeight - lista.clientHeight, Math.max(0, el.offsetTop + el.offsetHeight - lista.clientHeight + 24));
        lista.scrollTo({ top: alvoTopo, behavior: reduzir ? "auto" : "smooth" });
      }, 120);
    };
    lista && lista.addEventListener("scroll", () => {
      lista.classList.toggle("no-topo", lista.scrollTop < 2);
      lista.classList.toggle("no-fim", lista.scrollTop > lista.scrollHeight - lista.clientHeight - 2);
    }, { passive: true });
    const atualizarTexto = (p) => {
      const fora = p >= P_SERV - 0.02, dentro = p >= P_SERV;
      if (abertura.classList.contains("fora") !== fora) { abertura.classList.toggle("fora", fora); abertura.inert = fora; }
      servicos.classList.toggle("dentro", dentro);
      let n = -1;
      itens.forEach((el, k) => { const on = p >= P_CARD0 + k * P_CARD_PASSO; el.classList.toggle("ativo", on); if (on) n = k; });
      servicos.classList.toggle("completa", n === itens.length - 1);
      if (n !== ultimoAtivo) { itens.forEach((el, k) => el.classList.toggle("atual", k === n)); ultimoAtivo = n; seguir(n); }
      palco.classList.toggle("andou", p > 0.02);
    };

    let rodando = false;
    const quadro = () => {
      if (reduzir) { rodando = false; return; } // movimento reduzido: para o motor
      const p = progresso();
      alvo = video(p) * (total - 1);
      atual += (alvo - atual) * 0.2; // suaviza: sensação de filme, não de slide
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      atualizarTexto(p);
      requestAnimationFrame(quadro);
    };

    addEventListener("resize", ajustar);
    ajustar();
    // Movimento reduzido decidido ao vivo, nas duas direções
    const aplicarModo = () => {
      if (reduzir) {
        atual = alvo = 0; desenhar(0, true);           // o cachorro fica parado no primeiro quadro
        atualizarTexto(1); itens.forEach((el) => el.classList.add("ativo"));
        abertura.inert = false;                         // tudo fica visível e navegável
      } else {
        carregarTudo();
        if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
      }
    };
    document.addEventListener("reduzir-mudou", aplicarModo);
    aplicarModo();

    // Link "Ver serviços" leva ao ponto da rolagem em que os serviços já estão na tela
    document.querySelectorAll('a[href="#servicos"]').forEach((a) => a.addEventListener("click", (ev) => {
      if (reduzir) return;
      ev.preventDefault();
      const curso = palco.offsetHeight - innerHeight;
      scrollTo({ top: palco.offsetTop + curso * 0.5, behavior: "smooth" });
    }));
  }

  /* ── Parallax leve nas artes ──────────────────────────────────────────── */
  const artes = reduzir ? [] : [...document.querySelectorAll(".arte")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    // no celular em pé, o botão flutuante espera o palco do cachorro acabar (a abertura já tem o próprio botão)
    const palcoEl = document.querySelector(".palco");
    const noPalco = palcoEl && matchMedia("(max-width: 860px) and (orientation: portrait)").matches && palcoEl.getBoundingClientRect().bottom > innerHeight * 0.5;
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela && !noPalco);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));



  /* ── Capítulos: o cômodo abre e as patinhas caminham com a rolagem ─────── */
  const caps = [...document.querySelectorAll(".cap")];
  if (caps.length) {
    const trilhas = caps.map((cap, n) => {
      const t = cap.querySelector(".trilha");
      const N = 9, volta = n % 2 === 1; // cômodos alternados caminham no sentido contrário
      const patas = [];
      for (let i = 0; i < N; i++) {
        const u = (i + 0.5) / N;
        const x = 6 + u * 88, ang = Math.atan2(0.9, 1) * 180 / Math.PI; // leve descida
        const y = 18 + u * 70 + Math.sin(u * Math.PI * 1.6) * 16;        // caminho em curva, descendo
        const lado = i % 2 ? 1 : -1;                                     // pé esquerdo/direito
        const el = document.createElement("span");
        el.className = "pata";
        el.style.left = `${volta ? 100 - x : x}%`;
        el.style.top = `calc(${y}% + ${lado * 12}px)`;
        el.style.transform = `rotate(${(volta ? -90 : 90) + (volta ? -1 : 1) * (ang - 45) + lado * 6}deg)`;
        el.innerHTML = '<svg viewBox="0 0 40 40"><use href="#pata"/></svg>';
        t.appendChild(el);
        patas.push(el);
      }
      return { cap, patas, ultimo: -1, inset: -1, m: null, capsula: cap.querySelector(".cap-capsula"), pilulas: [...cap.querySelectorAll(".cap-pilula")] };
    });
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("dentro");
      setTimeout(() => e.target.classList.add("assentou"), 1100);
      io.unobserve(e.target);
    }), { threshold: 0.3 });
    caps.forEach((c) => io.observe(c));

    let pendente = false;
    const passo = () => {
      pendente = false;
      const H = innerHeight;
      for (const tr of trilhas) {
        const r = tr.cap.getBoundingClientRect();
        if (r.top > H || r.bottom < 0) continue;
        // patinhas: cada uma pisa conforme o topo do cômodo sobe pela tela (vai e volta)
        const p = reduzir ? 1 : Math.min(1, Math.max(0, (H * 0.98 - r.top) / (H * 0.75)));
        const n = Math.floor(p * tr.patas.length + 0.001);
        if (n !== tr.ultimo) { tr.patas.forEach((el, i) => el.classList.toggle("pisou", i < n)); tr.ultimo = n; }
        // o cômodo "abre" das laterais até ocupar a largura toda
        const q = reduzir ? 1 : Math.min(1, Math.max(0, (H - r.top) / (H * 0.55)));
        const ins = Math.round((1 - q) * 5 * 10) / 10;
        // formas: a cápsula gira e desliza, as pílulas flutuam em velocidades diferentes (vai e volta)
        const m = reduzir ? 0 : Math.max(-1, Math.min(1, (r.top + r.height / 2 - H / 2) / H));
        const mr = Math.round(m * 100) / 100;
        if (mr !== tr.m) {
          tr.m = mr;
          if (tr.capsula) tr.capsula.style.transform = `translate3d(${(mr * -40).toFixed(1)}px, ${(mr * 70).toFixed(1)}px, 0) rotate(${(-38 + mr * 22).toFixed(1)}deg)`;
          tr.pilulas.forEach((el, i) => { const v = [90, -60, 130][i] || 80; el.style.transform = `translate3d(0, ${(mr * v).toFixed(1)}px, 0) rotate(${(-38 + mr * (i % 2 ? -30 : 30)).toFixed(1)}deg)`; });
        }
        if (ins !== tr.inset) { tr.cap.style.clipPath = ins > 0 ? `inset(0 ${ins}vw 0 ${ins}vw round var(--raio-cap) var(--raio-cap) 0 0)` : ""; tr.inset = ins; }
      }
    };
    const agendar = () => { if (!pendente) { pendente = true; requestAnimationFrame(passo); } };
    addEventListener("scroll", agendar, { passive: true });
    addEventListener("resize", agendar);
    document.addEventListener("reduzir-mudou", agendar);
    passo();
  }

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    const link = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
    document.querySelectorAll("[data-whats]").forEach((a) => {
      a.href = a.dataset.msg ? `https://wa.me/${num}?text=${encodeURIComponent(a.dataset.msg)}` : link;
      a.target = "_blank"; a.rel = "noopener";
      // Conversão: avisa o Pixel e o Analytics antes de abrir a conversa (se estiverem ligados no config.js)
      a.addEventListener("click", () => {
        if (window.fbq) fbq("track", "Contact");
        if (window.gtag) gtag("event", "generate_lead", { method: "whatsapp" });
      });
    });
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confira os campos destacados.", "falha");

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Enviando…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        if (window.fbq) fbq("track", "Lead");
        if (window.gtag) gtag("event", "generate_lead", { method: "formulario" });
        avisar("Recebemos seu contato. Em breve falamos com você.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Chame a gente no WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }
})();
