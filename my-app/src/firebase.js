import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = { //config taken from firebase
  apiKey: "AIzaSyAg-gs_AxvdBVEbOkfa7oxmXxkEwRLqJ4g",
  authDomain: "neu-lost-and-hound.firebaseapp.com",
  projectId: "neu-lost-and-hound",
  storageBucket: "neu-lost-and-hound.firebasestorage.app",
  messagingSenderId: "52596626845",
  appId: "1:52596626845:web:e2cd1b89f0412e9a7f4b74",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);