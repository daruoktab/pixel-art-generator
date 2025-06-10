// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics"; // Analytics can be added if needed
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBZiL44IHw57bbKvA3FSuC7-kjNPwDDg4E",
  authDomain: "pixel-art-generator-3071a.firebaseapp.com",
  projectId: "pixel-art-generator-3071a",
  storageBucket: "pixel-art-generator-3071a.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "762846537877",
  appId: "1:762846537877:web:eedc0ccdaa613e55b9939c",
  measurementId: "G-JFK5SW62ER"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Analytics can be initialized if needed

export { app, firebaseConfig }; // Export the initialized app and the config
