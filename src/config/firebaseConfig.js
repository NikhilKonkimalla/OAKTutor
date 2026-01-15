// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBgL_Iq4adZgaD1eZOqrGaIj2T4yN_OWSw",
  authDomain: "oaktutor-16c22.firebaseapp.com",
  projectId: "oaktutor-16c22",
  storageBucket: "oaktutor-16c22.firebasestorage.app",
  messagingSenderId: "700363828057",
  appId: "1:700363828057:web:d4570532941b6f3bf43a48",
  measurementId: "G-0BY5VDTQ7J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
    console.log("✅ Firebase Analytics initialized");
  } catch (error) {
    console.warn("⚠️ Firebase Analytics initialization failed:", error);
  }
}

// Export the config and analytics
export default firebaseConfig;
export { analytics };