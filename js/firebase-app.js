import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber
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

const btnLogin = document.getElementById("btn-login");
const loginEmailInp = document.getElementById("login-email");
const loginPasswordInp = document.getElementById("login-password");
const loginPasswordConfirmInp = document.getElementById("login-password-confirm");
const btnAuthAction = document.getElementById("btn-auth-action");
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
let authMode = 'login';

const btnPhoneStart = document.getElementById("btn-phone-start");
const authEmailGoogleView = document.getElementById("auth-email-google-view");
const authPhoneView = document.getElementById("auth-phone-view");
const btnPhoneBack = document.getElementById("btn-phone-back");
const loginPhoneInp = document.getElementById("login-phone");
const btnPhoneSend = document.getElementById("btn-phone-send");
const phoneStep1 = document.getElementById("phone-step-1");
const phoneStep2 = document.getElementById("phone-step-2");
const loginPhoneCodeInp = document.getElementById("login-phone-code");
const btnPhoneVerify = document.getElementById("btn-phone-verify");

let recaptchaVerifier = null;
let confirmationResult = null;

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
// UI TABS FOR AUTH
// =====================================================

function setAuthMode(mode) {
  authMode = mode;
  const errEl = document.getElementById("login-error");
  if (errEl) errEl.style.display = "none";

  if (mode === 'login') {
    if (tabLogin) { tabLogin.classList.add('prim'); tabLogin.style.background = ''; tabLogin.style.borderColor = ''; tabLogin.style.color = ''; }
    if (tabSignup) { tabSignup.classList.remove('prim'); tabSignup.style.background = 'var(--glass)'; tabSignup.style.borderColor = 'var(--gb)'; tabSignup.style.color = 'var(--tp)'; }
    if (loginPasswordConfirmInp) loginPasswordConfirmInp.style.display = 'none';
    if (btnAuthAction) btnAuthAction.innerHTML = 'Sign In';
  } else {
    if (tabSignup) { tabSignup.classList.add('prim'); tabSignup.style.background = ''; tabSignup.style.borderColor = ''; tabSignup.style.color = ''; }
    if (tabLogin) { tabLogin.classList.remove('prim'); tabLogin.style.background = 'var(--glass)'; tabLogin.style.borderColor = 'var(--gb)'; tabLogin.style.color = 'var(--tp)'; }
    if (loginPasswordConfirmInp) loginPasswordConfirmInp.style.display = 'block';
    if (btnAuthAction) btnAuthAction.innerHTML = 'Sign Up';
  }
}

if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
if (tabSignup) tabSignup.addEventListener('click', () => setAuthMode('signup'));

// =====================================================
// EMAIL / PASSWORD ACTION
// =====================================================

if (btnAuthAction && auth) {
  btnAuthAction.addEventListener("click", async () => {
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

    const email = loginEmailInp ? loginEmailInp.value.trim() : "";
    const password = loginPasswordInp ? loginPasswordInp.value : "";
    const passwordConfirm = loginPasswordConfirmInp ? loginPasswordConfirmInp.value : "";

    if (!email || !password) {
      if (errEl) { errEl.textContent = "Please enter email and password."; errEl.style.display = "block"; }
      return;
    }

    if (authMode === 'signup') {
      if (password !== passwordConfirm) {
        if (errEl) { errEl.textContent = "Passwords do not match."; errEl.style.display = "block"; }
        return;
      }
      if (password.length < 6) {
        if (errEl) { errEl.textContent = "Password should be at least 6 characters."; errEl.style.display = "block"; }
        return;
      }
    }

    try {
      btnAuthAction.disabled = true;
      btnAuthAction.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> ' + (authMode === 'login' ? 'Signing in...' : 'Signing up...');

      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Email sign-in successful");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("Email sign-up successful");
      }
    } catch (error) {
      console.error("Auth failed:", error);
      if (errEl) {
        let msg = error.message;
        if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";
        else if (error.code === 'auth/email-already-in-use') msg = "Email already in use. Please sign in.";
        errEl.textContent = "Error: " + msg;
        errEl.style.display = "block";
      }
      btnAuthAction.disabled = false;
      btnAuthAction.innerHTML = authMode === 'login' ? 'Sign In' : 'Sign Up';
    }
  });

  const submitOnEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnAuthAction.click();
    }
  };

  if (loginPasswordInp) loginPasswordInp.addEventListener("keypress", submitOnEnter);
  if (loginPasswordConfirmInp) loginPasswordConfirmInp.addEventListener("keypress", submitOnEnter);

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
// PHONE AUTHENTICATION
// =====================================================

function setupRecaptcha() {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response) => {
        // reCAPTCHA solved
      }
    });
  }
}

if (btnPhoneStart) {
  btnPhoneStart.addEventListener('click', () => {
    if (authEmailGoogleView) authEmailGoogleView.style.display = 'none';
    if (authPhoneView) authPhoneView.style.display = 'flex';
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
    
    if (phoneStep1) phoneStep1.style.display = 'flex';
    if (phoneStep2) phoneStep2.style.display = 'none';
    if (loginPhoneInp) loginPhoneInp.value = '';
    if (loginPhoneCodeInp) loginPhoneCodeInp.value = '';
    
    setupRecaptcha();
  });
}

if (btnPhoneBack) {
  btnPhoneBack.addEventListener('click', () => {
    if (authPhoneView) authPhoneView.style.display = 'none';
    if (authEmailGoogleView) authEmailGoogleView.style.display = 'block';
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
  });
}

if (btnPhoneSend && auth) {
  btnPhoneSend.addEventListener('click', async () => {
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

    const countryCodeSelect = document.getElementById("login-country-code");
    const countryCode = countryCodeSelect ? countryCodeSelect.value : "+1";
    const phoneInpVal = loginPhoneInp ? loginPhoneInp.value.trim() : "";
    
    if (!phoneInpVal) {
      if (errEl) { errEl.textContent = "Please enter a valid phone number."; errEl.style.display = "block"; }
      return;
    }

    const fullPhoneNumber = countryCode + phoneInpVal;

    try {
      btnPhoneSend.disabled = true;
      btnPhoneSend.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Sending...';

      if (!recaptchaVerifier) {
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
      }

      confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
      
      console.log("SMS sent successfully");
      
      if (phoneStep1) phoneStep1.style.display = 'none';
      if (phoneStep2) phoneStep2.style.display = 'flex';
      
    } catch (error) {
      console.error("SMS sending failed:", error);
      if (errEl) {
        errEl.textContent = "Failed to send SMS: " + error.message;
        errEl.style.display = "block";
      }
    } finally {
      btnPhoneSend.disabled = false;
      btnPhoneSend.innerHTML = 'Send SMS Code';
    }
  });
}

if (btnPhoneVerify && auth) {
  btnPhoneVerify.addEventListener('click', async () => {
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

    const code = loginPhoneCodeInp ? loginPhoneCodeInp.value.trim() : "";
    
    if (!code) {
      if (errEl) { errEl.textContent = "Please enter the 6-digit code."; errEl.style.display = "block"; }
      return;
    }

    try {
      btnPhoneVerify.disabled = true;
      btnPhoneVerify.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Verifying...';

      await confirmationResult.confirm(code);
      console.log("Phone sign-in successful");
      
    } catch (error) {
      console.error("Phone verification failed:", error);
      if (errEl) {
        let msg = error.message;
        if (error.code === 'auth/invalid-verification-code') msg = "Invalid code. Please try again.";
        errEl.textContent = "Error: " + msg;
        errEl.style.display = "block";
      }
      btnPhoneVerify.disabled = false;
      btnPhoneVerify.innerHTML = 'Verify & Login';
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
        const appBody = document.getElementById('app-body');
        if (appBody) appBody.style.display = 'flex';


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
                  filter: 'all', theme: 'dark',
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

        if (btnAuthAction) {
          btnAuthAction.disabled = false;
          btnAuthAction.innerHTML = authMode === 'login' ? 'Sign In' : 'Sign Up';
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
        const appBody = document.getElementById('app-body');
        if (appBody) appBody.style.display = 'none';
        
        if (authEmailGoogleView) authEmailGoogleView.style.display = 'block';
        if (authPhoneView) authPhoneView.style.display = 'none';

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

        if (btnAuthAction) {
          btnAuthAction.disabled = false;
          btnAuthAction.innerHTML = authMode === 'login' ? 'Sign In' : 'Sign Up';
        }

        if (loginEmailInp) loginEmailInp.value = '';
        if (loginPasswordInp) loginPasswordInp.value = '';

        if (btnLogout) btnLogout.disabled = false;

      }

    }
  );

}