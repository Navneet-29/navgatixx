/// <reference lib="webworker" />

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

declare const self: ServiceWorkerGlobalScope;

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!getApps().length) {
    initializeApp(firebaseConfig);
}

const messaging = getMessaging();

onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Navgatix';
    const body = payload.notification?.body || 'You have a new update.';

    self.registration.showNotification(title, {
        body,
        icon: '/logo.png',
        data: payload.data,
    });
});
