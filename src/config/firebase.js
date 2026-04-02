// Configuration Firebase
// À FAIRE: Remplacez par votre configuration Firebase réelle depuis la Firebase Console
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD3vnVNvRoRT-ZrBw6nv_lDv05Lutfzh6w",
  authDomain: "maison-concours-6cc41.firebaseapp.com",
  projectId: "maison-concours-6cc41",
  storageBucket: "maison-concours-6cc41.firebasestorage.app",
  messagingSenderId: "670111254798",
  appId: "1:670111254798:web:a859136a761ea67ce52f5f"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser l'authentification Firebase
export const auth = getAuth(app);

// Initialiser Firestore
export const db = getFirestore(app);

export default app;
