/* Configuração da nuvem (Firebase).

   DEIXE COMO ESTÁ para rodar em MODO DEMONSTRAÇÃO: o painel usa uma nuvem
   embutida no navegador, com os dados fictícios de assets/demo/.

   Para usar a nuvem de verdade, crie um projeto no Firebase (Firestore +
   Authentication com e-mail/senha), copie a configuração do app web e
   substitua o null abaixo, por exemplo:

   window.PP_FIREBASE_CONFIG = {
     apiKey: "...",
     authDomain: "seu-projeto.firebaseapp.com",
     projectId: "seu-projeto",
     storageBucket: "seu-projeto.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };

   Publique também as regras de acesso de firestore.rules. */
window.PP_FIREBASE_CONFIG = null;
