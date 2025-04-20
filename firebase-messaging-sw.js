importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD9XVaB4VMsipGQ4fQ45TX7PxbM3Du5_XE",
    authDomain: "bcvworld-cc40e.firebaseapp.com",
    projectId: "bcvworld-cc40e",
    storageBucket: "bcvworld-cc40e.firebasestorage.app",
    messagingSenderId: "1083295808227",
    appId: "1:1083295808227:web:8070d080beb7e9a819a3d6",
    measurementId: "G-FVTSKKNJBH"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/assets/images/logo.png',
        badge: '/assets/images/badge.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});