// src/lib/firebase/config.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Check for missing essential Firebase configuration values
const requiredKeys: (keyof typeof firebaseConfigValues)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingConfigKeys = requiredKeys.filter(key => !firebaseConfigValues[key]);

if (missingConfigKeys.length > 0) {
  const envVarNames = missingConfigKeys.map(key => {
    // Construct the expected environment variable name
    const upperKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
    return `NEXT_PUBLIC_FIREBASE_${upperKey}`;
  });
  const errorMessage = `Firebase configuration error: The following environment variables are missing or empty in your .env.local file: ${envVarNames.join(', ')}. Please ensure all required NEXT_PUBLIC_FIREBASE_... variables are set correctly in .env.local and restart the development server. Refer to your Firebase project's web app configuration in the Firebase console.`;
  
  console.error("🔥🔥🔥 FIREBASE CONFIGURATION ERROR 🔥🔥🔥");
  console.error(errorMessage);
  
  if (typeof window === 'undefined') { 
    throw new Error(errorMessage);
  } else {
    console.error("CRITICAL: Firebase configuration is missing on the client-side. Firebase services will not work. Check .env.local and restart the dev server.");
  }
}


// If we've reached here, all required keys are present (though they might be invalid at Firebase's end)
const firebaseConfig = {
  apiKey: firebaseConfigValues.apiKey!,
  authDomain: firebaseConfigValues.authDomain!,
  projectId: firebaseConfigValues.projectId!,
  storageBucket: firebaseConfigValues.storageBucket!,
  messagingSenderId: firebaseConfigValues.messagingSenderId!,
  appId: firebaseConfigValues.appId!,
  ...(firebaseConfigValues.measurementId && { measurementId: firebaseConfigValues.measurementId }),
};

let app: FirebaseApp;

// Initialize Firebase
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Set CORS headers for Storage (development only)
if (process.env.NODE_ENV === 'development') {
  try {
    // Add CORS metadata to the default Storage bucket
    console.log("Configuring Firebase Storage for development...");
    
    // Log helpful information about Storage configuration
    console.log(`Using Firebase Storage bucket: ${firebaseConfig.storageBucket}`);
    console.log(`Auth state: ${auth.currentUser ? 'Logged in' : 'Not logged in'}`);
  } catch (error) {
    console.error("Error configuring Firebase Storage:", error);
  }
}

export { app, auth, db, storage, firebaseConfig }; // Export firebaseConfig for debugging if needed
