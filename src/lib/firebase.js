import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCSfz5U3Dar7hAgZzcTp6aWogei8MThXoA",
  authDomain: "promptlibrary-c9274.firebaseapp.com",
  projectId: "promptlibrary-c9274",
  storageBucket: "promptlibrary-c9274.firebasestorage.app",
  messagingSenderId: "541817610285",
  appId: "1:541817610285:web:3061c082b2721467a598a4",
  measurementId: "G-0PXGSWYS6N"
};

// Initialize App (prevent duplicate initializations in development)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

