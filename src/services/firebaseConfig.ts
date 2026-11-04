
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import { getAuth, initializeAuth } from 'firebase/auth';

// Firebase's published TypeScript declarations omit this
// React Native-specific export.
 // @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsNmaLnBLgJe_OEynNRpE_rk0WCEjJ4OA',
  authDomain: 'fixit-project-ii.firebaseapp.com',
  projectId: 'fixit-project-ii',
  storageBucket: 'fixit-project-ii.firebasestorage.app',
  messagingSenderId: '353736019567',
  appId: '1:353736019567:web:93ba5901c91d41650f079a',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export default app;
