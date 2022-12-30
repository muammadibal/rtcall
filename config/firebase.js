// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDHDiN6XMt6hoA1r-xXri1S1r-doj_9ajU",
  authDomain: "rtccall-38176.firebaseapp.com",
  projectId: "rtccall-38176",
  storageBucket: "rtccall-38176.appspot.com",
  messagingSenderId: "393334268097",
  appId: "1:393334268097:web:918bb61c3522a9df323440",
  measurementId: "G-9EDYJ8E81C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { app, db, analytics };
