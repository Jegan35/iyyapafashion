// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIC_6b9GIUPDT4igpZPScP8wPEgg_lR5o",
  authDomain: "iyyapafashion.firebaseapp.com",
  projectId: "iyyapafashion",
  storageBucket: "iyyapafashion.firebasestorage.app",
  messagingSenderId: "552261771556",
  appId: "1:552261771556:web:bab16674e351eb585893b1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
