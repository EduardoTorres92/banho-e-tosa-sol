window.SITE = {
  nome: "Banho e Tosa Sol",

  whatsapp: {
    numero: "5515991268383", // só dígitos, com DDI
    mensagem: "Olá! Quero agendar um horário para o meu cão.",
  },

  contato: {
    email: "eduardotorres.nexus@gmail.com",
    // Opcional: chave do Web3Forms (https://web3forms.com). Se vazio, usa FormSubmit.
    web3formsChave: "",
    assunto: "Novo contato pelo site Banho e Tosa Sol",
  },

  // Medição: deixe vazio para desligar. O código só carrega se tiver ID.
  medicao: {
    pixelMeta: "",        // 15–16 dígitos, do Gerenciador de Eventos da Meta
    googleAnalytics: "",  // "G-XXXXXXX", do GA4 → Administrador → Fluxos de dados
  },

  // Mural dos tutores. Troque pelos recados reais (do Google, do Instagram, do WhatsApp, com a permissão do tutor)
  // e apague o "exemplo: true". Enquanto algum tiver exemplo: true, o mural só aparece no computador
  // (localhost) e nas prévias do Netlify (endereço com "--"): no site publicado ele fica escondido.
  depoimentos: [
    { foto: "assets/img/galeria/p05.webp", texto: "[Recado do tutor: uma ou duas frases sobre o banho, a tosa ou o atendimento.]", nome: "[Nome do tutor]", cao: "[nome do cão]", exemplo: true },
    { foto: "assets/img/galeria/p01.webp", texto: "[Recado do tutor]", nome: "[Nome do tutor]", cao: "[nome do cão]", exemplo: true },
    { foto: "assets/img/galeria/p09.webp", texto: "[Recado do tutor: o que mais gostou na Soraia e no salão.]", nome: "[Nome do tutor]", cao: "[nome do cão]", exemplo: true },
    { foto: "assets/img/galeria/p04.webp", texto: "[Recado do tutor]", nome: "[Nome do tutor]", cao: "[nome do cão]", exemplo: true },
    { foto: "assets/img/galeria/p19.webp", texto: "[Recado do tutor: sobre o táxi dog, a creche ou o hotelzinho.]", nome: "[Nome do tutor]", cao: "[nome do cão]", exemplo: true },
    { foto: "assets/img/galeria/p21.webp", texto: "[Recado do tutor]", nome: "[Nome do tutor]", cao: "[nome do cão]", exemplo: true },
  ],

  frames: {
    total: 128, // quadros fatiados de fonte/olhar.mp4 (16 fps)
    desktop: "assets/frames/desktop/f_{n}.webp",
    mobile: "assets/frames/mobile/f_{n}.webp",
  },
};
