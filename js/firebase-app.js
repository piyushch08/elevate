import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";


// =====================================================
// FIREBASE CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyBJ9jzkBl3zLcS2nu-O5AZL7oN_pcj68-k",
  authDomain: "elevate-8d5c4.firebaseapp.com",
  projectId: "elevate-8d5c4",
  storageBucket: "elevate-8d5c4.firebasestorage.app",
  messagingSenderId: "585275355133",
  appId: "1:585275355133:web:551755e08cc5e2c75d7394",
  measurementId: "G-WY38RFZ4FX"
};


// =====================================================
// INITIALIZE FIREBASE
// =====================================================

let app;
let auth;
let db;
let provider;

try {

  app = initializeApp(firebaseConfig);

  auth = getAuth(app);

  db = getFirestore(app);

  provider = new GoogleAuthProvider();

  console.log("Firebase initialized successfully");

} catch (error) {

  console.error("Firebase initialization failed:", error);

  const errEl = document.getElementById("login-error");

  if (errEl) {
    errEl.textContent =
      "Firebase initialization failed: " + error.message;

    errEl.style.display = "block";
  }
}


// =====================================================
// CURRENT USER
// =====================================================

let currentUser = null;


// =====================================================
// FIRESTORE SAVE FUNCTION
// =====================================================
//
// app.js calls this from its normal save() function.
//

window.saveToFirestore = async function () {

  if (!currentUser) {
    return;
  }

  if (!db) {
    console.error("Firestore is not initialized.");
    return;
  }

  if (!window.D) {
    console.error("Planner data D is not available.");
    return;
  }

  try {

    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        planner: window.D,
        updatedAt: new Date().toISOString()
      }
    );

    console.log("Planner saved to Firestore");

  } catch (error) {

    console.error(
      "Error saving planner to Firestore:",
      error
    );

  }

};


// =====================================================
// DOM ELEMENTS
// =====================================================

const btnLogin =
  document.getElementById("btn-login");

const btnEmailLogin =
  document.getElementById("btn-email-login");

const btnEmailSignup =
  document.getElementById("btn-email-signup");

const loginEmailInp =
  document.getElementById("login-email");

const loginPasswordInp =
  document.getElementById("login-password");

const btnLogout =
  document.getElementById("btn-logout");

const loginModal =
  document.getElementById("m-login");


// =====================================================
// GOOGLE LOGIN
// =====================================================

if (btnLogin && auth) {

  btnLogin.addEventListener("click", async () => {

    const errEl =
      document.getElementById("login-error");

    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }

    try {

      btnLogin.disabled = true;

      btnLogin.innerHTML =
        '<i class="ri-loader-4-line ri-spin"></i> Signing in...';

      await signInWithPopup(
        auth,
        provider
      );

      console.log("Google sign-in successful");

    } catch (error) {

      console.error(
        "Google login failed:",
        error
      );

      if (errEl) {

        errEl.textContent =
          "Login failed: " + error.message;

        errEl.style.display = "block";

      }

      btnLogin.disabled = false;

      btnLogin.innerHTML =
        '<i class="ri-google-fill"></i> Sign in with Google';

    }

  });

}


// =====================================================
// EMAIL / PASSWORD LOGIN
// =====================================================

if (btnEmailLogin && auth) {
  btnEmailLogin.addEventListener("click", async () => {
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

    const email = loginEmailInp ? loginEmailInp.value.trim() : "";
    const password = loginPasswordInp ? loginPasswordInp.value : "";

    if (!email || !password) {
      if (errEl) { errEl.textContent = "Please enter email and password."; errEl.style.display = "block"; }
      return;
    }

    try {
      btnEmailLogin.disabled = true;
      btnEmailLogin.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Signing in...';

      await signInWithEmailAndPassword(auth, email, password);
      console.log("Email sign-in successful");
    } catch (error) {
      console.error("Email login failed:", error);
      if (errEl) {
        errEl.textContent = "Login failed: " + error.message;
        errEl.style.display = "block";
      }
      btnEmailLogin.disabled = false;
      btnEmailLogin.innerHTML = 'Sign In';
    }
  });

  if (loginPasswordInp) {
    loginPasswordInp.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        btnEmailLogin.click();
      }
    });
  }

  if (loginEmailInp) {
    loginEmailInp.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (loginPasswordInp) loginPasswordInp.focus();
      }
    });
  }
}

// =====================================================
// EMAIL / PASSWORD SIGNUP
// =====================================================

if (btnEmailSignup && auth) {
  btnEmailSignup.addEventListener("click", async () => {
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

    const email = loginEmailInp ? loginEmailInp.value.trim() : "";
    const password = loginPasswordInp ? loginPasswordInp.value : "";

    if (!email || !password) {
      if (errEl) { errEl.textContent = "Please enter email and password."; errEl.style.display = "block"; }
      return;
    }

    try {
      btnEmailSignup.disabled = true;
      btnEmailSignup.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Signing up...';

      await createUserWithEmailAndPassword(auth, email, password);
      console.log("Email sign-up successful");
    } catch (error) {
      console.error("Email sign-up failed:", error);
      if (errEl) {
        errEl.textContent = "Sign-up failed: " + error.message;
        errEl.style.display = "block";
      }
      btnEmailSignup.disabled = false;
      btnEmailSignup.innerHTML = 'Sign Up';
    }
  });
}


// =====================================================
// LOGOUT
// =====================================================

if (btnLogout && auth) {

  btnLogout.addEventListener("click", async () => {

    try {

      btnLogout.disabled = true;

      await signOut(auth);

      console.log("User logged out");
      try { localStorage.removeItem("elevate2"); } catch (e) {}
      window.location.reload();

    } catch (error) {

      console.error(
        "Logout failed:",
        error
      );

      btnLogout.disabled = false;

    }

  });

}


// =====================================================
// AUTH STATE
// =====================================================

if (auth) {

  onAuthStateChanged(
    auth,
    async (user) => {

      // =================================================
      // USER IS LOGGED IN
      // =================================================

      if (user) {

        currentUser = user;
        window.currentUserUid = user.uid;

        console.log(
          "Authenticated user:",
          user.email
        );


        // Hide login modal

        if (loginModal) {
          loginModal.style.display = "none";
        }


        // Update username

        const uNameEl =
          document.getElementById("u-name");

        if (uNameEl) {

          uNameEl.textContent =
            user.displayName || "User";

        }


        // Update avatar

        const avatarEl =
          document.querySelector(".s-avatar");

        if (avatarEl && user.photoURL) {

          avatarEl.innerHTML = `
            <img
              src="${user.photoURL}"
              alt="Profile"
              style="
                width:100%;
                height:100%;
                border-radius:50%;
                object-fit:cover;
              "
            >
          `;

        }


        // LOAD USER DATA FROM FIRESTORE
        try {
          const userRef = doc(db, "users", user.uid);

          if (window.unsubSnapshot) {
            window.unsubSnapshot();
          }

          window.unsubSnapshot = onSnapshot(userRef, async (snapshot) => {
            // Existing user
            if (snapshot.exists()) {
              const remoteData = snapshot.data();
              console.log("Planner data loaded from Firestore");

              if (remoteData && remoteData.planner && window.D) {
                Object.assign(window.D, remoteData.planner);
              }
              
              // Apply daily reset logic based on incoming cloud data
              if (window.checkNewDay && window.checkNewDay()) {
                if (window.saveToFirestore) window.saveToFirestore();
              }

              // Update local copy
              try { localStorage.setItem("elevate2", JSON.stringify(window.D)); } catch (e) { }

              // Refresh UI
              if (typeof window.renderAll === "function") window.renderAll();
              if (typeof window.updateGreeting === "function") window.updateGreeting();
            } 
            // New user
            else {
              console.log("New user. Creating Firestore profile...");

              // Prevent data leak from another authenticated user
              if (window.D && window.D.lastUid && window.D.lastUid !== 'guest' && window.D.lastUid !== user.uid) {
                console.log("Wiping leftover data from previous user.");
                Object.assign(window.D, {
                  goals: { study: 120, cal: 2200, prot: 150, carb: 250, water: 2000, weeklyWorkouts: 0 },
                  today: { study: 0, cal: 0, prot: 0, carb: 0, water: 0 },
                  tasks: [], events: [], deadlines: [], studyLog: [], meals: [],
                  exercises: [{ name: 'Bench Press', sets: '4×8', done: false }, { name: 'Overhead Press', sets: '3×10', done: false }, { name: 'Tricep Pushdown', sets: '3×12', done: false }],
                  streak: [0, 0, 0, 0, 0, 0, 0], habits: [], notes: [],
                  filter: 'all', theme: 'space',
                  calY: new Date().getFullYear(), calM: new Date().getMonth(), calEvents: {},
                  timerSec: 25 * 60, timerBase: 25 * 60, timerOn: false, workoutOn: false,
                  editNoteId: null, noteColor: '#00f2fe',
                  lastUid: user.uid, lastActiveDate: new Date().toDateString()
                });
              } else if (window.D) {
                window.D.lastUid = user.uid;
              }

              await setDoc(userRef, {
                planner: window.D,
                updatedAt: new Date().toISOString()
              });

              console.log("New user profile created");
            }
          }, (error) => {
            console.error("Error in onSnapshot:", error);
          });

        } catch (error) {
          console.error("Error setting up Firestore listener:", error);
        }


        // Restore login button

        if (btnLogin) {

          btnLogin.disabled = false;

          btnLogin.innerHTML =
            '<i class="ri-google-fill"></i> Sign in with Google';

        }

        if (btnEmailLogin) {
          btnEmailLogin.disabled = false;
          btnEmailLogin.innerHTML = 'Sign In';
        }

        if (btnEmailSignup) {
          btnEmailSignup.disabled = false;
          btnEmailSignup.innerHTML = 'Sign Up';
        }

      }


      // =================================================
      // USER IS LOGGED OUT
      // =================================================

      else {

        if (window.unsubSnapshot) {
          window.unsubSnapshot();
          window.unsubSnapshot = null;
        }

        currentUser = null;
        window.currentUserUid = null;

        console.log(
          "No authenticated user"
        );


        if (loginModal) {
          loginModal.style.display = "flex";
        }

        const uNameEl = document.getElementById("u-name");
        if (uNameEl) {
          uNameEl.textContent = "Guest";
        }

        const avatarEl = document.querySelector(".s-avatar");
        if (avatarEl) {
          avatarEl.innerHTML = '<i class="ri-user-smile-line"></i>';
        }

        if (btnLogin) {
          btnLogin.disabled = false;
          btnLogin.innerHTML = '<i class="ri-google-fill"></i> Sign in with Google';
        }

        if (btnEmailLogin) {
          btnEmailLogin.disabled = false;
          btnEmailLogin.innerHTML = 'Sign In';
        }

        if (btnEmailSignup) {
          btnEmailSignup.disabled = false;
          btnEmailSignup.innerHTML = 'Sign Up';
        }

        if (loginEmailInp) loginEmailInp.value = '';
        if (loginPasswordInp) loginPasswordInp.value = '';

        if (btnLogout) btnLogout.disabled = false;

      }

    }
  );

}