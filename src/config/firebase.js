import firebase from "firebase/app";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDHDiN6XMt6hoA1r-xXri1S1r-doj_9ajU",
  authDomain: "rtccall-38176.firebaseapp.com",
  projectId: "rtccall-38176",
  storageBucket: "rtccall-38176.appspot.com",
  messagingSenderId: "393334268097",
  appId: "1:393334268097:web:918bb61c3522a9df323440",
  measurementId: "G-9EDYJ8E81C"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

export { app, db };
