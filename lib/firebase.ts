// filepath: /Users/codypaulmedia/ai-video-editor/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration (replace with your own)
const firebaseConfig = {
    apiKey: "AIzaSyDDW0v0SNfxTaAaFwhGSmbRFRjJUGWcfAM",
    authDomain: "ai-video-editor-196a9.firebaseapp.com",
    projectId: "ai-video-editor-196a9",
    storageBucket: "ai-video-editor-196a9.firebasestorage.app",
    messagingSenderId: "486161236675",
    appId: "1:486161236675:web:36447a993530ac71661876",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Export Firebase services
export { db, app, storage, auth };