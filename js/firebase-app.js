import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
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

const btnLogout = document.getElementById("btn-logout");
const loginModal = document.getElementById("m-login");
const authEnvNotice = document.getElementById("auth-env-notice");

// =====================================================
// ENVIRONMENT & CONFIGURATION CHECK
// =====================================================

function checkAuthEnvironment() {
  if (window.location.hostname === "127.0.0.1") {
    // Automatically redirect 127.0.0.1 to localhost for authorized domain consistency
    window.location.hostname = "localhost";
    return;
  }
  if (!authEnvNotice) return;
  if (window.location.protocol === "file:") {
    authEnvNotice.innerHTML = `⚠️ <strong>Note:</strong> Firebase Authentication (Google Sign-In) cannot run via <code>file://</code> URLs due to browser security restrictions. Please run via a local web server (e.g. <code>http://localhost:5505</code> via VS Code Live Server).`;
    authEnvNotice.style.background = "rgba(239, 68, 68, 0.15)";
    authEnvNotice.style.border = "1px solid rgba(239, 68, 68, 0.35)";
    authEnvNotice.style.color = "#f87171";
    authEnvNotice.style.display = "block";
  }
}
checkAuthEnvironment();

// =====================================================
// AUTH ERROR HELPERS
// =====================================================

function showAuthError(content) {
  const errEl = document.getElementById("login-error");
  if (!errEl) return;
  if (!content) {
    errEl.style.display = "none";
    errEl.innerHTML = "";
    return;
  }
  errEl.innerHTML = content;
  errEl.style.display = "block";
}

function hideAuthError() {
  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.style.display = "none";
    errEl.innerHTML = "";
  }
}

function getAuthErrorMessage(error) {
  if (!error) return "An unexpected error occurred.";
  const code = (error.code || "").toLowerCase();
  const rawMsg = error.message || "";

  if (
    code === "auth/operation-not-supported-in-this-environment" ||
    code === "auth/unauthorized-domain" ||
    window.location.protocol === "file:"
  ) {
    return "Firebase Google Authentication cannot run directly from file:// URLs. Please launch this project through VS Code Live Server (e.g. http://localhost:5505).";
  }
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Invalid email or password. Please verify your details.";
  }
  if (code === "auth/email-already-in-use") {
    return "This email is already registered. Please click 'Sign In' to log in.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Please choose at least 6 characters.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "Sign in popup was closed before completing.";
  }
  if (code === "auth/network-request-failed") {
    return "Network connection error. Please check your internet connection.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }

  return rawMsg || "Authentication failed. Please try again.";
}

// =====================================================
// GOOGLE LOGIN
// =====================================================

if (btnLogin && auth) {
  btnLogin.addEventListener("click", async () => {
    hideAuthError();

    try {
      btnLogin.disabled = true;
      btnLogin.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Signing in...';

      await signInWithPopup(auth, provider);
      console.log("Google sign-in successful");
    } catch (error) {
      console.error("Google login failed:", error);
      showAuthError("Login failed: " + getAuthErrorMessage(error));
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<i class="ri-google-fill"></i> Sign in with Google';
    }
  });
}

// =====================================================
// UI TABS FOR AUTH (LOGIN vs SIGN UP)
// =====================================================

function setAuthMode(mode) {
  authMode = mode;
  hideAuthError();

  const isLogin = mode === 'login';

  // Email view tabs
  if (tabLogin) {
    if (isLogin) {
      tabLogin.classList.add('prim');
      tabLogin.style.background = '';
      tabLogin.style.borderColor = '';
      tabLogin.style.color = '';
    } else {
      tabLogin.classList.remove('prim');
      tabLogin.style.background = 'var(--glass)';
      tabLogin.style.borderColor = 'var(--gb)';
      tabLogin.style.color = 'var(--tp)';
    }
  }
  if (tabSignup) {
    if (!isLogin) {
      tabSignup.classList.add('prim');
      tabSignup.style.background = '';
      tabSignup.style.borderColor = '';
      tabSignup.style.color = '';
    } else {
      tabSignup.classList.remove('prim');
      tabSignup.style.background = 'var(--glass)';
      tabSignup.style.borderColor = 'var(--gb)';
      tabSignup.style.color = 'var(--tp)';
    }
  }

  // Email view elements
  if (loginPasswordConfirmInp) loginPasswordConfirmInp.style.display = isLogin ? 'none' : 'block';
  if (btnAuthAction) btnAuthAction.innerHTML = isLogin ? 'Sign In' : 'Sign Up';
}

if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
if (tabSignup) tabSignup.addEventListener('click', () => setAuthMode('signup'));

// =====================================================
// EMAIL / PASSWORD ACTION
// =====================================================

if (btnAuthAction && auth) {
  btnAuthAction.addEventListener("click", async () => {
    hideAuthError();

    const email = loginEmailInp ? loginEmailInp.value.trim() : "";
    const password = loginPasswordInp ? loginPasswordInp.value : "";
    const passwordConfirm = loginPasswordConfirmInp ? loginPasswordConfirmInp.value : "";

    if (!email || !password) {
      showAuthError("Please enter email and password.");
      return;
    }

    if (authMode === 'signup') {
      if (password !== passwordConfirm) {
        showAuthError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        showAuthError("Password should be at least 6 characters.");
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
      showAuthError(getAuthErrorMessage(error));
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
// LOGOUT
// =====================================================

if (btnLogout && auth) {
  btnLogout.addEventListener("click", async () => {
    if (!currentUser) {
      // User is currently Guest, open login modal
      if (loginModal) loginModal.style.display = "flex";
      return;
    }
    try {
      btnLogout.disabled = true;
      await signOut(auth);
      console.log("User logged out");
      try { localStorage.removeItem("elevate2"); } catch (e) {}
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
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
          user.email || user.phoneNumber || user.uid
        );


        // Hide login modal

        if (loginModal) {
          loginModal.style.display = "none";
        }
        const appBody = document.getElementById('app-body');
        if (appBody) appBody.style.display = 'flex';


        // Update username
        const resolvedName = pendingPhoneDisplayName ||
          user.displayName ||
          (window.D && window.D.profile && window.D.profile.name && window.D.profile.name !== 'Explorer' ? window.D.profile.name : null) ||
          user.phoneNumber ||
          "User";

        if (window.D && window.D.profile && (pendingPhoneDisplayName || user.displayName)) {
          window.D.profile.name = pendingPhoneDisplayName || user.displayName;
        }

        const uNameEl = document.getElementById("u-name");
        if (uNameEl) {
          uNameEl.textContent = resolvedName;
        }

        const pNameInp = document.getElementById("p-name");
        if (pNameInp && resolvedName) {
          pNameInp.value = resolvedName;
        }

        if (btnLogout) {
          btnLogout.disabled = false;
          btnLogout.innerHTML = '<i class="ri-logout-box-r-line"></i> Logout';
          btnLogout.title = "Log out of your account";
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

              // Sync persistent profile data to UI
              if (window.D.profile) {
                if (pendingPhoneDisplayName && pendingPhoneDisplayName !== window.D.profile.name) {
                  window.D.profile.name = pendingPhoneDisplayName;
                  if (window.saveToFirestore) window.saveToFirestore();
                }
                if (window.D.profile.name) {
                  const nameEl = document.getElementById("u-name");
                  if (nameEl) nameEl.textContent = window.D.profile.name;
                  const pNameInp = document.getElementById("p-name");
                  if (pNameInp) pNameInp.value = window.D.profile.name;
                }
                if (window.D.profile.status) {
                  const statusEl = document.getElementById("u-status");
                  if (statusEl) statusEl.textContent = window.D.profile.status;
                  const pStatusInp = document.getElementById("p-status");
                  if (pStatusInp) pStatusInp.value = window.D.profile.status;
                }
                if (window.D.profile.avatar && typeof window.updateAvatarUI === 'function') {
                  window.updateAvatarUI(window.D.profile.avatar);
                }
              }

              if (typeof window.populatePersonalization === 'function') {
                window.populatePersonalization();
              }

              // Refresh UI
              if (typeof window.renderAll === "function") window.renderAll();
              if (typeof window.updateGreeting === "function") window.updateGreeting();
            } 
            // New user
            else {
              console.log("New user. Creating Firestore profile...");

              const newUserName = pendingPhoneDisplayName || user.displayName || 'Explorer';

              // Prevent data leak from another authenticated user
              if (window.D && window.D.lastUid && window.D.lastUid !== 'guest' && window.D.lastUid !== user.uid) {
                console.log("Wiping leftover data from previous user.");
                Object.assign(window.D, {
                  profile: { name: newUserName, status: 'On a roll today 🔥' },
                  goals: { study: 120, cal: 2200, prot: 150, carb: 250, water: 2000, weeklyWorkouts: 0 },
                  today: { study: 0, cal: 0, prot: 0, carb: 0, water: 0 },
                  tasks: [], events: [], deadlines: [], studyLog: [], meals: [],
                  exercises: [{ name: 'Bench Press', sets: '4×8', done: false }, { name: 'Overhead Press', sets: '3×10', done: false }, { name: 'Tricep Pushdown', sets: '3×12', done: false }],
                  streak: [0, 0, 0, 0, 0, 0, 0], habits: [], notes: [],
                  dailyStreak: 1, lastStreakDate: new Date().toDateString(),
                  filter: 'all', theme: 'dark',
                  calY: new Date().getFullYear(), calM: new Date().getMonth(), calEvents: {},
                  timerSec: 25 * 60, timerBase: 25 * 60, timerOn: false, workoutOn: false,
                  editNoteId: null, noteColor: '#00f2fe',
                  lastUid: user.uid, lastActiveDate: new Date().toDateString(),
                  subjects: ['Mathematics', 'Programming', 'Physics', 'Data Science', 'English', 'Other']
                });
              } else if (window.D) {
                window.D.lastUid = user.uid;
                window.D.profile = window.D.profile || {};
                if (newUserName !== 'Explorer') {
                  window.D.profile.name = newUserName;
                }
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
        if (loginPhoneInp) loginPhoneInp.value = '';
        if (loginPhoneCodeInp) loginPhoneCodeInp.value = '';
        if (loginPhoneNameInp) loginPhoneNameInp.value = '';
        clearRecaptcha();
        if (resendTimer) clearInterval(resendTimer);

        if (btnPhoneVerify) {
          btnPhoneVerify.disabled = false;
          btnPhoneVerify.innerHTML = authMode === 'login' ? 'Verify & Sign In' : 'Verify & Create Account';
        }

        if (btnLogout) {
          btnLogout.disabled = false;
          btnLogout.innerHTML = '<i class="ri-login-box-r-line"></i> Sign In';
          btnLogout.title = "Sign in or Create Account";
        }

      }

    }
  );

}