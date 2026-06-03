import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver, 
  indexedDBLocalPersistence,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  sendEmailVerification,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { initializeFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to bypass potential proxy/iframe issues
console.log("Initializing Firestore with Database ID:", firebaseConfig.firestoreDatabaseId);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
  useFetchStreams: false,
} as any, firebaseConfig.firestoreDatabaseId);

// Initialize Auth with multi-persistence and explicit resolver for better iframe/preview support
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const googleProvider = new GoogleAuthProvider();
// Force selecting account and add scopes that might help with identification
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('profile');
googleProvider.addScope('email');

export const storage = getStorage(app, firebaseConfig.storageBucket);

// Auth helpers
let isSignInInProgress = false;

/**
 * Handle Google sign-in with popup recovery and diagnostic logging
 */
export const signIn = async () => {
  if (isSignInInProgress) {
    console.warn("Sign-in already in progress.");
    return;
  }
  isSignInInProgress = true;
  try {
    // Explicitly pass the resolver to the call as well for maximum compatibility
    return await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  } catch (error: any) {
    console.error("Login Error (Raw):", error);
    
    // Diagnostic info for the user console
    const currentDomain = window.location.hostname;
    const isIframe = window.self !== window.top;
    
    if (error.code === 'auth/network-request-failed') {
      console.error("Firebase Auth Network Error Diagnostic:");
      console.error(`- Current Domain: ${currentDomain}`);
      console.error(`- Running in Iframe: ${isIframe}`);
      console.error(`- Auth Domain: ${firebaseConfig.authDomain}`);
      console.error("REQUIRED ACTION: Go to Firebase Console > Auth > Settings > Authorized domains");
      console.error(`AND ADD THIS DOMAIN: ${currentDomain}`);
      
      if (isIframe) {
        console.error("TIP: Try opening the application in a NEW TAB to bypass iframe restrictions.");
      }
    }
    
    throw error;
  } finally {
    isSignInInProgress = false;
  }
};

/**
 * Handle user sign out
 */
export const logOut = () => signOut(auth);

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email: string, pass: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(userCredential.user, { displayName: name });
  return userCredential;
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export { sendEmailVerification };

// Firestore error handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const isOffline = error instanceof Error && error.message.includes('the client is offline');
  
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || 'GUEST_USER',
      email: currentUser?.email || 'NO_EMAIL',
      emailVerified: currentUser?.emailVerified || false,
      isAnonymous: currentUser?.isAnonymous || false,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  if (isOffline) {
    console.warn('Firestore is operating in offline mode:', path);
    return; // Don't throw for offline errors, just log it
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo, null, 2));
  console.log('Current Auth State:', {
    isAuthenticated: !!currentUser,
    uid: currentUser?.uid,
    email: currentUser?.email,
    emailVerified: currentUser?.emailVerified
  });
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    console.log("Testing connection to Firestore database:", firebaseConfig.firestoreDatabaseId || "(default)");
    // Use getDoc instead of getDocFromServer to be less aggressive
    await getDoc(doc(db, 'test', 'connection'));
    console.log("Firestore connection check initiated.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      console.warn("Firestore connection reached, but permission denied for /test/connection. This is expected if rules are strict.");
    } else {
      console.error("Firestore connection test failed:", error);
    }
  }
}
testConnection();
