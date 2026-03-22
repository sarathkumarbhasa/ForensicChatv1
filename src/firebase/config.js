import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC8B57jAmN1u9exWyumdrhrIq82ljD85j4",
  authDomain: "forensicchat-b0622.firebaseapp.com",
  projectId: "forensicchat-b0622",
  storageBucket: "forensicchat-b0622.firebasestorage.app",
  messagingSenderId: "254812256865",
  appId: "1:254812256865:web:54934d30d00da1cfab8820",
  measurementId: "G-VK2DXKPFL1",
  // Adding the default Realtime Database URL based on the project ID
  databaseURL: "https://forensicchat-b0622-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

