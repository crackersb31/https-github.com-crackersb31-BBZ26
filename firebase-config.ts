
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";

// --- IMPORTANT ---
// Remplacez cet objet par la configuration de votre propre projet Firebase.
// Vous pouvez trouver ces informations dans la console Firebase,
// dans les paramètres de votre projet -> SDK setup and configuration.
const firebaseConfig = {
  apiKey: "AIzaSyCCEdvEIfb9jrQquWPdiNVcifXzyuQnSNc",
  authDomain: "bbz-2026.firebaseapp.com",
  projectId: "bbz-2026",
  storageBucket: "bbz-2026.appspot.com",
  messagingSenderId: "267533151391",
  appId: "1:267533151391:web:c8c5a25ca605e58b0906aa"
};

// Initialise Firebase with Compat API
const app = firebase.initializeApp(firebaseConfig);

// Exporte l'instance de la base de données Firestore (Compat)
export const db = app.firestore();
