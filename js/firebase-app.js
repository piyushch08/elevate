import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBJ9jzkBl3zLcS2nu-O5AZL7oN_pcj68-k",
  authDomain: "elevate-8d5c4.firebaseapp.com",
  projectId: "elevate-8d5c4",
  storageBucket: "elevate-8d5c4.firebasestorage.app",
  messagingSenderId: "585275355133",
  appId: "1:585275355133:web:551755e08cc5e2c75d7394",
  measurementId: "G-WY38RFZ4FX"
};

// Initialize Firebase
let app, auth, db, provider;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  provider = new GoogleAuthProvider();
} catch (e) {
  console.error("Firebase initialization failed. Please update firebaseConfig in js/firebase-app.js", e);
  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.textContent = "Firebase is not configured. Please open js/firebase-app.js and insert your config.";
    errEl.style.display = "block";
  }
}

let currentUser = null;

// Override global save to also sync with Firestore
const originalSave = window.save;
window.save = async function () {
  // Always save locally first
  if (typeof originalSave === 'function') originalSave();
  else {
    try { localStorage.setItem('elevate2', JSON.stringify(window.D)); } catch (e) { }
  }

  // Then sync to Firestore if logged in
  if (currentUser && db) {
    try {
      await setDoc(doc(db, "users", currentUser.uid), window.D);
    } catch (error) {
      console.error("Error syncing to Firestore:", error);
    }
  }
};

// DOM Elements
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const loginModal = document.getElementById("m-login");

// Auth State Observer
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      if (loginModal) loginModal.style.display = "none";

      // Update UI with user info
      const uNameEl = document.getElementById("u-name");
      const sAvatarEl = document.querySelector(".s-avatar");
      if (uNameEl) uNameEl.textContent = user.displayName || "User";
      if (sAvatarEl && user.photoURL) {
        sAvatarEl.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      }

      // Fetch user data from Firestore
      try {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          // Merge data into global D state
          const remoteData = docSnap.data();
          Object.assign(window.D, remoteData);

          // Trigger UI re-render
          if (typeof window.renderAll === "function") window.renderAll();
        } else {
          // New user, save initial local state to Firestore
          await setDoc(doc(db, "users", user.uid), window.D);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    } else {
      // User is signed out
      currentUser = null;
      if (loginModal) loginModal.style.display = "flex";
    }
  });
}

// Login
if (btnLogin) {
  btnLogin.addEventListener("click", () => {
    const errEl = document.getElementById("login-error");
    if (firebaseConfig.apiKey === "YOUR_API_KEY" || !auth) {
      // Mock login for demonstration
      currentUser = {
        uid: "mock-user-123",
        displayName: "Guest User",
        photoURL: "https://ui-avatars.com/api/?name=Guest+User&background=0D8ABC&color=fff"
      };

      if (loginModal) loginModal.style.display = "none";
      const uNameEl = document.getElementById("u-name");
      const sAvatarEl = document.querySelector(".s-avatar");
      if (uNameEl) uNameEl.textContent = currentUser.displayName;
      if (sAvatarEl) {
        sAvatarEl.innerHTML = `<img src="${currentUser.photoURL}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      }

      if (window.toast) window.toast("Logged in as Guest (Cloud Sync disabled)", "info");
      return;
    }

    signInWithPopup(auth, provider).catch((error) => {
      console.error("Login failed", error);
      errEl.textContent = "Login failed: " + error.message;
      errEl.style.display = "block";
    });
  });
}

// Logout
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    if (firebaseConfig.apiKey === "YOUR_API_KEY" || !auth) {
      currentUser = null;
      localStorage.removeItem("elevate2");
      window.location.reload();
      return;
    }

    signOut(auth).then(() => {
      localStorage.removeItem("elevate2");
      window.location.reload();
    });
  });
}
