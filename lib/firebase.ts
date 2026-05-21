import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDuO3kYOeCEhawq-53zsm0-SlyeOzG-FO0",
  authDomain: "pocket-heist-artsem.firebaseapp.com",
  projectId: "pocket-heist-artsem",
  storageBucket: "pocket-heist-artsem.firebasestorage.app",
  messagingSenderId: "330645484634",
  appId: "1:330645484634:web:934052acab217289d01463",
}

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth: Auth = getAuth(firebaseApp)
export const db: Firestore = getFirestore(firebaseApp)
