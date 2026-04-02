import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAkbKl4P0R8nqhWnEpQpQp5nQp5nQp5nQp5", // À remplacer par votre vraie clé
  authDomain: "mme-mayer-app.firebaseapp.com",
  projectId: "mme-mayer-app",
  storageBucket: "mme-mayer-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    const email = 'sourdin.aloys@gmail.com';
    const password = 'As05082008*';
    
    console.log('Creating admin user...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    console.log('Creating Firestore document...');
    await setDoc(doc(db, 'users', uid), {
      username: 'sourdin.aloys',
      firstName: 'Sourdin',
      lastName: 'Aloys',
      email: email,
      role: 'admin',
      createdAt: new Date(),
    });
    
    console.log('✅ Admin account created successfully!');
    console.log('UID:', uid);
    console.log('Email:', email);
    console.log('Username: sourdin.aloys');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
