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

  frames: {
    total: 128, // quadros fatiados de fonte/olhar.mp4 (16 fps)
    desktop: "assets/frames/desktop/f_{n}.webp",
    mobile: "assets/frames/mobile/f_{n}.webp",
  },
};
