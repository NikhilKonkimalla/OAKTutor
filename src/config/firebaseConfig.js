import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import loadFirebaseEnvConfig from "../util/loadFirebaseEnvConfig";

// Default config used for local development.
// In CI/CD builds the REACT_APP_FIREBASE_CONFIG secret overrides these values.
const firebaseConfig = {
  apiKey: "AIzaSyBgL_Iq4adZgaD1eZOqrGaIj2T4yN_OWSw",
  authDomain: "oaktutor-16c22.firebaseapp.com",
  projectId: "oaktutor-16c22",
  storageBucket: "oaktutor-16c22.firebasestorage.app",
  messagingSenderId: "700363828057",
  appId: "1:700363828057:web:d4570532941b6f3bf43a48",
  measurementId: "G-0BY5VDTQ7J"
};

// Override with environment config if REACT_APP_FIREBASE_CONFIG is set at build time
loadFirebaseEnvConfig(firebaseConfig);

// Initialize Firebase once with the resolved config
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

export { app };
export default firebaseConfig;
export { analytics };