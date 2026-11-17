// Source for vendor/firebase.js (the parts of the Firebase SDK that Adonis uses).
// Rebuild after a Firebase upgrade, from any empty folder:
//   npm i firebase@13.4.0 esbuild
//   npx esbuild path/to/tools/firebase-entry.js --bundle --format=iife --global-name=AdonisFB --minify --target=es2019 --outfile=path/to/vendor/firebase.js
// Firestore "lite" is the small REST version: no live listeners, which Adonis doesn't need (it keeps its own copy on the phone).
export { initializeApp } from "firebase/app";
export {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser
} from "firebase/auth";
export {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, writeBatch, query, where, orderBy,
  serverTimestamp, Timestamp
} from "firebase/firestore/lite";
