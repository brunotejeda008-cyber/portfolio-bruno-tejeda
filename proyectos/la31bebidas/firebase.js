import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  projectId: "pedidosbebidas-b8b6c",
  appId: "1:49124258706:web:92f2a0f0ff8b42b82a874b",
  storageBucket: "pedidosbebidas-b8b6c.firebasestorage.app",
  apiKey: "AIzaSyC-cL7e5wgQr7BOqLbX1A_wdHqzp_h6Amc",
  authDomain: "pedidosbebidas-b8b6c.firebaseapp.com",
  messagingSenderId: "49124258706",
  measurementId: "G-X1YBEWDKWS",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
