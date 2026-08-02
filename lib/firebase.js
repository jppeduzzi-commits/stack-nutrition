import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDnEhZ-EHleBeSpC5fuVKSRghDbmCE9jSg",
  authDomain: "stack-nutrition.firebaseapp.com",
  projectId: "stack-nutrition",
  storageBucket: "stack-nutrition.firebasestorage.app",
  messagingSenderId: "636600967536",
  appId: "1:636600967536:web:9e2803915b9ef400102fb5",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
