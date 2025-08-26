import { boot } from 'quasar/wrappers'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyAVGea3zZgaGWxrR75L0MFTAE-aV30SJUc',
  authDomain: 'badminton-scoreboard-a54b5.firebaseapp.com',
  projectId: 'badminton-scoreboard-a54b5',
  storageBucket: 'badminton-scoreboard-a54b5.firebasestorage.app',
  messagingSenderId: '53326271975',
  appId: '1:53326271975:web:12d1bc6bcf5d84d6041942'
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Firebase services used in the app
const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db }

// Ensure this file is treated as a Quasar boot file
export default boot(() => {
  // No-op: services are initialized above and exported for direct import
})
