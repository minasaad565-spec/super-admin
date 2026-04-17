import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAAjwDrDj7iAFtK7iuxA8yjRBvrLyTYSGM",
  authDomain: "maison-soyeuse.firebaseapp.com",
  projectId: "maison-soyeuse",
  storageBucket: "maison-soyeuse.firebasestorage.app",
  messagingSenderId: "553879878024",
  appId: "1:553879878024:web:b7e148c575514ff081223d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const messaging = getMessaging(app);
export const storage = getStorage(app);
export { getToken, onMessage };
export const VAPID_KEY = "BLifHOKGu8CfR-yma9LyLSssvG_DvfFgIT88g6LArk-kLKJk9LHC9f5aFOxtbUIAclzV7Vfqd1poFF3-rusojPs";
