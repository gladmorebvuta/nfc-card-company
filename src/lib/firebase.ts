import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Same Firebase project as BrandaptOS — shared auth, shared Firestore
const firebaseConfig = {
  apiKey: "AIzaSyCWwldeA6VuZN31GM5xoaEWGhgdA5MyXm4",
  authDomain: "brandaptos-v2.firebaseapp.com",
  projectId: "brandaptos-v2",
  storageBucket: "brandaptos-v2.firebasestorage.app",
  messagingSenderId: "561453413325",
  appId: "1:561453413325:web:bb19a9891cb2e45c588a84"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
