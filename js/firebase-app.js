import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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

// Phone Auth DOM Elements
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

const phoneTabLogin = document.getElementById("phone-tab-login");
const phoneTabSignup = document.getElementById("phone-tab-signup");
const phoneNameField = document.getElementById("phone-name-field");
const loginPhoneNameInp = document.getElementById("login-phone-name");
const phoneViewTitle = document.getElementById("phone-view-title");
const phoneViewSub = document.getElementById("phone-view-sub");
const phoneDisplaySent = document.getElementById("phone-display-sent");
const btnPhoneEditNumber = document.getElementById("btn-phone-edit-number");
const btnPhoneResend = document.getElementById("btn-phone-resend");
const authEnvNotice = document.getElementById("auth-env-notice");

let recaptchaVerifier = null;
let confirmationResult = null;
let resendTimer = null;

const btnLogout = document.getElementById("btn-logout");
const loginModal = document.getElementById("m-login");

// =====================================================
// ENVIRONMENT & CONFIGURATION CHECK
// =====================================================

function checkAuthEnvironment() {
  if (window.location.hostname === "127.0.0.1") {
    // Automatically redirect 127.0.0.1 to localhost so Firebase's authorized domain list matches perfectly
    window.location.hostname = "localhost";
    return;
  }
  if (!authEnvNotice) return;
  if (window.location.protocol === "file:") {
    authEnvNotice.innerHTML = `⚠️ <strong>Note:</strong> Firebase Authentication (Phone SMS & Google Sign-In) cannot run via <code>file://</code> URLs due to browser security restrictions. Please run via a local web server (e.g. <code>http://localhost:5505</code> via VS Code Live Server).`;
    authEnvNotice.style.background = "rgba(239, 68, 68, 0.15)";
    authEnvNotice.style.border = "1px solid rgba(239, 68, 68, 0.35)";
    authEnvNotice.style.color = "#f87171";
    authEnvNotice.style.display = "block";
  }
}
checkAuthEnvironment();

// Auto-detect default country code by timezone
try {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const countryCodeSelect = document.getElementById("login-country-code");
  if (countryCodeSelect) {
    if (timeZone.includes("Calcutta") || timeZone.includes("Kolkata") || timeZone.includes("India")) {
      countryCodeSelect.value = "+91";
    } else if (timeZone.includes("New_York") || timeZone.includes("Los_Angeles") || timeZone.includes("Chicago") || timeZone.includes("Denver")) {
      countryCodeSelect.value = "+1";
    } else if (timeZone.includes("London")) {
      countryCodeSelect.value = "+44";
    } else if (timeZone.includes("Sydney") || timeZone.includes("Melbourne")) {
      countryCodeSelect.value = "+61";
    } else if (timeZone.includes("Dubai")) {
      countryCodeSelect.value = "+971";
    }
  }
} catch (e) {}

// =====================================================
// GOOGLE LOGIN
// =====================================================

if (btnLogin && auth) {
  btnLogin.addEventListener("click", async () => {
    const errEl = document.getElementById("login-error");
    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }

    try {
      btnLogin.disabled = true;
      btnLogin.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Signing in...';

      await signInWithPopup(auth, provider);
      console.log("Google sign-in successful");
    } catch (error) {
      console.error("Google login failed:", error);
      if (errEl) {
        errEl.textContent = "Login failed: " + getAuthErrorMessage(error);
        errEl.style.display = "block";
      }
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
  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }

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

  // Phone view tabs
  if (phoneTabLogin) {
    if (isLogin) {
      phoneTabLogin.classList.add('prim');
      phoneTabLogin.style.background = '';
      phoneTabLogin.style.borderColor = '';
      phoneTabLogin.style.color = '';
    } else {
      phoneTabLogin.classList.remove('prim');
      phoneTabLogin.style.background = 'var(--glass)';
      phoneTabLogin.style.borderColor = 'var(--gb)';
      phoneTabLogin.style.color = 'var(--tp)';
    }
  }
  if (phoneTabSignup) {
    if (!isLogin) {
      phoneTabSignup.classList.add('prim');
      phoneTabSignup.style.background = '';
      phoneTabSignup.style.borderColor = '';
      phoneTabSignup.style.color = '';
    } else {
      phoneTabSignup.classList.remove('prim');
      phoneTabSignup.style.background = 'var(--glass)';
      phoneTabSignup.style.borderColor = 'var(--gb)';
      phoneTabSignup.style.color = 'var(--tp)';
    }
  }

  // Email view elements
  if (loginPasswordConfirmInp) loginPasswordConfirmInp.style.display = isLogin ? 'none' : 'block';
  if (btnAuthAction) btnAuthAction.innerHTML = isLogin ? 'Sign In' : 'Sign Up';
  if (btnPhoneStart) btnPhoneStart.innerHTML = `<i class="ri-phone-fill" style="color:var(--accent);"></i> ${isLogin ? 'Sign in with Phone' : 'Sign up with Phone'}`;

  // Phone view elements
  if (phoneNameField) phoneNameField.style.display = isLogin ? 'none' : 'block';
  if (phoneViewTitle) phoneViewTitle.textContent = isLogin ? 'Mobile Sign In' : 'Mobile Sign Up';
  if (phoneViewSub) phoneViewSub.textContent = isLogin
    ? 'Enter your mobile number to sign in with an SMS code.'
    : 'Enter your name and mobile number to create your planner account.';
  if (btnPhoneSend) btnPhoneSend.innerHTML = isLogin ? 'Send SMS Code' : 'Send Verification Code';
  if (btnPhoneVerify) btnPhoneVerify.innerHTML = isLogin ? 'Verify & Sign In' : 'Verify & Create Account';
}

if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
if (tabSignup) tabSignup.addEventListener('click', () => setAuthMode('signup'));
if (phoneTabLogin) phoneTabLogin.addEventListener('click', () => setAuthMode('login'));
if (phoneTabSignup) phoneTabSignup.addEventListener('click', () => setAuthMode('signup'));

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
        errEl.textContent = getAuthErrorMessage(error);
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
// PHONE AUTHENTICATION HELPERS & LOGIC
// =====================================================

function clearRecaptcha() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (e) {
      console.warn("reCAPTCHA clear error:", e);
    }
    recaptchaVerifier = null;
  }
  const container = document.getElementById("recaptcha-container");
  if (container) {
    container.innerHTML = "";
  }
}

function getRecaptchaVerifier() {
  clearRecaptcha();
  const container = document.getElementById("recaptcha-container");
  if (!container || !auth) return null;

  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {
      console.log("reCAPTCHA solved");
    },
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Resetting...");
      clearRecaptcha();
    }
  });

  return recaptchaVerifier;
}

function formatPhoneNumber(countryCode, inputVal) {
  if (!inputVal) return null;
  let cleaned = inputVal.trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  cleaned = cleaned.replace(/^0+/, '');
  const codeDigits = countryCode.replace('+', '');
  if (cleaned.startsWith(codeDigits) && cleaned.length > codeDigits.length + 5) {
    return '+' + cleaned;
  }
  return countryCode + cleaned;
}

function getAuthErrorMessage(error) {
  if (!error) return "An unexpected error occurred.";
  const code = error.code || "";
  const msg = error.message || "";

  if (code === "auth/invalid-phone-number") {
    return "Invalid mobile number format. Please check your country code and digits.";
  }
  if (code === "auth/missing-phone-number") {
    return "Please enter a valid mobile number.";
  }
  if (code === "auth/quota-exceeded") {
    return "SMS quota for this project has been exceeded. Please try again later or sign in with Google / Email.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many requests. Please wait a few minutes before trying again.";
  }
  if (code === "auth/captcha-check-failed") {
    return "reCAPTCHA verification failed. Please try again.";
  }
  if (code === "auth/invalid-verification-code") {
    return "Invalid 6-digit verification code. Please check your SMS and try again.";
  }
  if (code === "auth/code-expired") {
    return "Verification code has expired. Please click 'Resend Code'.";
  }
  if (code === "auth/network-request-failed") {
    return "Network connection error. Please check your internet connection.";
  }
  if (code === "auth/invalid-credential") {
    return "Invalid credentials. Please verify your details.";
  }
  if (code === "auth/email-already-in-use") {
    return "Email already in use. Please sign in.";
  }
  if (code === "auth/operation-not-allowed" || msg.includes("SMS unable to be sent until this region enabled")) {
    return "SMS sending is restricted by Firebase SMS Region Policy. In Firebase Console > Authentication > Settings > SMS region policy, allow your country (e.g. India) and ensure Phone provider is enabled in Sign-in method.";
  }
  if (code === "auth/operation-not-supported-in-this-environment" || code === "auth/unauthorized-domain") {
    return "Phone login requires running on http://localhost or an authorized domain. It cannot run directly from file:// due to browser security restrictions.";
  }
  return msg || "Authentication failed. Please try again.";
}

function startResendCountdown(seconds = 30) {
  if (resendTimer) clearInterval(resendTimer);
  if (!btnPhoneResend) return;

  btnPhoneResend.disabled = true;
  let remaining = seconds;
  btnPhoneResend.innerHTML = `Resend code in <span id="resend-timer">${remaining}</span>s`;

  resendTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(resendTimer);
      btnPhoneResend.disabled = false;
      btnPhoneResend.innerHTML = `<i class="ri-refresh-line"></i> Resend Code`;
    } else {
      const timerSpan = document.getElementById("resend-timer");
      if (timerSpan) timerSpan.textContent = remaining;
    }
  }, 1000);
}

async function sendPhoneVerificationCode() {
  const errEl = document.getElementById("login-error");
  if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

  const countryCodeSelect = document.getElementById("login-country-code");
  const countryCode = countryCodeSelect ? countryCodeSelect.value : "+91";
  const rawPhone = loginPhoneInp ? loginPhoneInp.value : "";
  const fullPhone = formatPhoneNumber(countryCode, rawPhone);

  if (!fullPhone || !/^\+[1-9]\d{6,14}$/.test(fullPhone)) {
    if (errEl) {
      errEl.textContent = "Please enter a valid mobile number (e.g. 9876543210).";
      errEl.style.display = "block";
    }
    if (loginPhoneInp) loginPhoneInp.focus();
    return;
  }

  // If in sign up mode, validate name
  if (authMode === "signup" && loginPhoneNameInp) {
    const nameVal = loginPhoneNameInp.value.trim();
    if (!nameVal) {
      if (errEl) {
        errEl.textContent = "Please enter your full name to create an account.";
        errEl.style.display = "block";
      }
      loginPhoneNameInp.focus();
      return;
    }
  }

  try {
    if (btnPhoneSend) {
      btnPhoneSend.disabled = true;
      btnPhoneSend.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Sending SMS...';
    }
    if (btnPhoneResend) {
      btnPhoneResend.disabled = true;
    }

    const appVerifier = getRecaptchaVerifier();
    if (!appVerifier) throw new Error("Could not initialize reCAPTCHA verifier.");

    confirmationResult = await signInWithPhoneNumber(auth, fullPhone, appVerifier);
    console.log("SMS sent successfully to", fullPhone);

    if (phoneDisplaySent) {
      phoneDisplaySent.textContent = fullPhone;
    }

    if (phoneStep1) phoneStep1.style.display = "none";
    if (phoneStep2) phoneStep2.style.display = "flex";
    if (loginPhoneCodeInp) {
      loginPhoneCodeInp.value = "";
      loginPhoneCodeInp.focus();
    }

    startResendCountdown(30);

  } catch (error) {
    console.error("SMS sending failed:", error);
    clearRecaptcha();
    if (errEl) {
      errEl.textContent = getAuthErrorMessage(error);
      errEl.style.display = "block";
    }
  } finally {
    if (btnPhoneSend) {
      btnPhoneSend.disabled = false;
      btnPhoneSend.innerHTML = authMode === 'login' ? 'Send SMS Code' : 'Send Verification Code';
    }
  }
}

// Phone Start Button (from main view)
if (btnPhoneStart) {
  btnPhoneStart.addEventListener('click', () => {
    if (authEmailGoogleView) authEmailGoogleView.style.display = 'none';
    if (authPhoneView) authPhoneView.style.display = 'flex';
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
    
    if (phoneStep1) phoneStep1.style.display = 'flex';
    if (phoneStep2) phoneStep2.style.display = 'none';
    if (loginPhoneCodeInp) loginPhoneCodeInp.value = '';
    
    setAuthMode(authMode);
    if (authMode === 'signup' && loginPhoneNameInp && !loginPhoneNameInp.value) {
      loginPhoneNameInp.focus();
    } else if (loginPhoneInp) {
      loginPhoneInp.focus();
    }
  });
}

// Back to Email/Google Button
if (btnPhoneBack) {
  btnPhoneBack.addEventListener('click', () => {
    if (authPhoneView) authPhoneView.style.display = 'none';
    if (authEmailGoogleView) authEmailGoogleView.style.display = 'block';
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
    clearRecaptcha();
    if (resendTimer) clearInterval(resendTimer);
  });
}

// Edit Phone Number Button (from step 2)
if (btnPhoneEditNumber) {
  btnPhoneEditNumber.addEventListener('click', () => {
    if (phoneStep2) phoneStep2.style.display = 'none';
    if (phoneStep1) phoneStep1.style.display = 'flex';
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
    clearRecaptcha();
    if (loginPhoneInp) loginPhoneInp.focus();
  });
}

// Resend Code Button
if (btnPhoneResend) {
  btnPhoneResend.addEventListener('click', () => {
    sendPhoneVerificationCode();
  });
}

// Send SMS Button
if (btnPhoneSend && auth) {
  btnPhoneSend.addEventListener('click', () => {
    sendPhoneVerificationCode();
  });
}

// Verify Code Button
if (btnPhoneVerify && auth) {
  btnPhoneVerify.addEventListener('click', async () => {
    const errEl = document.getElementById("login-error");
    if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

    const code = loginPhoneCodeInp ? loginPhoneCodeInp.value.trim() : "";
    if (!code || code.length < 6) {
      if (errEl) {
        errEl.textContent = "Please enter the complete 6-digit verification code.";
        errEl.style.display = "block";
      }
      if (loginPhoneCodeInp) loginPhoneCodeInp.focus();
      return;
    }

    if (!confirmationResult) {
      if (errEl) {
        errEl.textContent = "Session expired. Please click 'Change' and send the code again.";
        errEl.style.display = "block";
      }
      return;
    }

    try {
      btnPhoneVerify.disabled = true;
      btnPhoneVerify.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Verifying...';

      const userCredential = await confirmationResult.confirm(code);
      const user = userCredential.user;
      console.log("Phone sign-in successful for UID:", user.uid);

      // If user provided a name during Sign Up, update displayName
      const enteredName = loginPhoneNameInp ? loginPhoneNameInp.value.trim() : "";
      if (enteredName) {
        try {
          await updateProfile(user, { displayName: enteredName });
          console.log("Updated displayName to:", enteredName);
        } catch (profileErr) {
          console.warn("Could not update displayName:", profileErr);
        }
        if (window.D) {
          window.D.profile = window.D.profile || {};
          window.D.profile.name = enteredName;
        }
        const uNameEl = document.getElementById("u-name");
        if (uNameEl) uNameEl.textContent = enteredName;
      }

      clearRecaptcha();
      if (resendTimer) clearInterval(resendTimer);

    } catch (error) {
      console.error("Phone verification failed:", error);
      if (errEl) {
        errEl.textContent = getAuthErrorMessage(error);
        errEl.style.display = "block";
      }
    } finally {
      btnPhoneVerify.disabled = false;
      btnPhoneVerify.innerHTML = authMode === 'login' ? 'Verify & Sign In' : 'Verify & Create Account';
    }
  });
}

// Enter key and input handling
if (loginPhoneInp) {
  loginPhoneInp.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (btnPhoneSend) btnPhoneSend.click();
    }
  });
}

if (loginPhoneNameInp) {
  loginPhoneNameInp.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (loginPhoneInp) loginPhoneInp.focus();
    }
  });
}

if (loginPhoneCodeInp) {
  loginPhoneCodeInp.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (btnPhoneVerify) btnPhoneVerify.click();
    }
  });

  loginPhoneCodeInp.addEventListener("input", () => {
    const errEl = document.getElementById("login-error");
    if (errEl) errEl.style.display = "none";
    if (loginPhoneCodeInp.value.trim().length === 6) {
      if (btnPhoneVerify) btnPhoneVerify.click();
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
          user.email || user.phoneNumber || user.uid
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
            user.displayName ||
            (window.D && window.D.profile && window.D.profile.name && window.D.profile.name !== 'Explorer' ? window.D.profile.name : null) ||
            user.phoneNumber ||
            "User";

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
                if (window.D.profile.name) {
                  const nameEl = document.getElementById("u-name");
                  if (nameEl) nameEl.textContent = window.D.profile.name;
                }
                if (window.D.profile.avatar && typeof window.updateAvatarUI === 'function') {
                  window.updateAvatarUI(window.D.profile.avatar);
                }
              }

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
        if (loginPhoneInp) loginPhoneInp.value = '';
        if (loginPhoneCodeInp) loginPhoneCodeInp.value = '';
        if (loginPhoneNameInp) loginPhoneNameInp.value = '';
        clearRecaptcha();
        if (resendTimer) clearInterval(resendTimer);

        if (btnPhoneVerify) {
          btnPhoneVerify.disabled = false;
          btnPhoneVerify.innerHTML = authMode === 'login' ? 'Verify & Sign In' : 'Verify & Create Account';
        }

        if (btnLogout) btnLogout.disabled = false;

      }

    }
  );

}