import { initializeApp, getApps } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail,
    reload,
    signOut,
    type User,
} from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDlgoabXxTzGDeKLp71B-jKcVcK0jjuR5A',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'navgatix-2b4ae.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'navgatix-2b4ae',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'navgatix-2b4ae.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '787805365624',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:787805365624:web:2cf4593b473891f525d48d',
};

const getFirebaseApp = () => {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }

    return getApps()[0];
};

export const auth = getAuth(getFirebaseApp());
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const registerWithEmailPassword = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(credential.user);
    return credential.user;
};

export const resendVerificationEmail = async (user: User) => {
    await sendEmailVerification(user);
};

export const loginWithEmailPassword = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await reload(credential.user);
    return credential.user;
};

export const loginWithGooglePopup = async () => {
    await signOut(auth);
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
};

export const sendForgotPasswordEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
};

export const getFirebaseIdToken = async (user: User) => user.getIdToken(true);

export const logoutFirebaseAuth = async () => {
    await signOut(auth);
};
