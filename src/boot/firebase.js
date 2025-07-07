import { boot } from 'quasar/wrappers'
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVGea3zZgaGWxrR75L0MFTAE-aV30SJUc",
  authDomain: "badminton-scoreboard-a54b5.firebaseapp.com",
  projectId: "badminton-scoreboard-a54b5",
  storageBucket: "badminton-scoreboard-a54b5.firebasestorage.app",
  messagingSenderId: "53326271975",
  appId: "1:53326271975:web:12d1bc6bcf5d84d6041942"
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig)

// Initialize Firebase Auth
const auth = getAuth(firebaseApp)

// Initialize Firestore
const db = getFirestore(firebaseApp)

export default boot(async (/* { app, router, ... } */) => {
  // Set up Firebase services
})

export { auth, db }
