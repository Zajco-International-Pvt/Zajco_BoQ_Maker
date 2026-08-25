import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC3ZI_H8ooxOtcvnozAf4SWR1GhK5lozJ4",
  authDomain: "boq-maker.firebaseapp.com",
  projectId: "boq-maker",
  storageBucket: "boq-maker.firebasestorage.app",
  messagingSenderId: "84814554879",
  appId: "1:84814554879:web:25af4afb7a70a10baf8eca",
  measurementId: "G-VTEMEVT5R7"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
