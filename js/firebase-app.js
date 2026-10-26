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
let pendingPhoneDisplayName = "";

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
// AUTH ERROR HELPERS & RECAPTCHA MANAGEMENT
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

function recreateRecaptcha() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (e) {
      console.warn("reCAPTCHA clear error:", e);
    }
    recaptchaVerifier = null;
  }
  const oldContainer = document.getElementById("recaptcha-container");
  if (oldContainer && oldContainer.parentNode) {
    const newContainer = document.createElement("div");
    newContainer.id = "recaptcha-container";
    newContainer.style.margin = "8px auto 0";
    newContainer.style.minHeight = "1px";
    oldContainer.parentNode.replaceChild(newContainer, oldContainer);
  }
}

function clearRecaptcha() {
  recreateRecaptcha();
}

function resetRecaptchaWidget() {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.render().then((widgetId) => {
        if (typeof grecaptcha !== "undefined" && grecaptcha.reset) {
          grecaptcha.reset(widgetId);
        }
      }).catch(() => {
        recreateRecaptcha();
      });
    } catch (e) {
      recreateRecaptcha();
    }
  } else {
    recreateRecaptcha();
  }
}

function getRecaptchaVerifier() {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  const container = document.getElementById("recaptcha-container");
  if (!container || !auth) return null;

  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {
        console.log("reCAPTCHA solved");
      },
      "expired-callback": () => {
        console.warn("reCAPTCHA expired. Resetting...");
        resetRecaptchaWidget();
      }
    });
    return recaptchaVerifier;
  } catch (err) {
    console.warn("RecaptchaVerifier init error, recreating container:", err);
    recreateRecaptcha();
    try {
      recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible"
      });
      return recaptchaVerifier;
    } catch (err2) {
      console.error("Critical reCAPTCHA init failure:", err2);
      return null;
    }
  }
}

function formatPhoneNumber(countryCode, inputVal) {
  if (!inputVal) return null;
  const val = inputVal.trim();
  if (val.startsWith("+")) {
    const digits = val.replace(/\D/g, "");
    return digits ? "+" + digits : null;
  }

  // Strip leading zeros
  let digits = val.replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return null;

  const codeDigits = countryCode.replace(/\D/g, "");

  // If user typed full number including country code without plus sign
  // e.g. for India (91): 12 digits (91XXXXXXXXXX)
  // for US/CA (1): 11 digits (1XXXXXXXXXX)
  if (digits.startsWith(codeDigits)) {
    if (codeDigits === "91" && digits.length === 12) {
      return "+" + digits;
    }
    if (codeDigits === "1" && digits.length === 11) {
      return "+" + digits;
    }
    if (digits.length >= codeDigits.length + 9) {
      return "+" + digits;
    }
  }

  return countryCode + digits;
}

function getAuthErrorMessage(error) {
  if (!error) return "An unexpected error occurred.";
  const code = (error.code || "").toLowerCase();
  const rawMsg = (error.message || "");
  let serialized = "";
  try { serialized = JSON.stringify(error); } catch (e) {}
  const fullErrorStr = (code + " " + rawMsg + " " + serialized).toUpperCase();

  // 1. BILLING NOT ENABLED (Firebase Blaze plan requirement for live SMS)
  if (
    fullErrorStr.includes("BILLING_NOT_ENABLED") ||
    fullErrorStr.includes("BILLING-NOT-ENABLED") ||
    (code === "auth/internal-error" && (fullErrorStr.includes("BILLING") || fullErrorStr.includes("INTERNAL-ERROR")))
  ) {
    return `
      <div style="font-size:0.85rem; line-height:1.45;">
        <div style="font-weight:700; color:#ef4444; margin-bottom:5px; display:flex; align-items:center; gap:6px;">
          <i class="ri-error-warning-fill" style="font-size:1.15rem;"></i> Firebase Blaze Plan Required for Live SMS
        </div>
        <p style="margin:0 0 8px 0; color:var(--ts);">
          Google Firebase enforces that sending real SMS to mobile numbers requires upgrading to the <strong>Blaze (Pay-as-you-go) Plan</strong> in your Firebase Console.
        </p>
        <div style="background:rgba(255,255,255,0.06); padding:9px 12px; border-radius:6px; border:1px solid var(--gb);">
          <strong style="color:var(--tp); display:block; margin-bottom:4px;">Free Instant Testing (No Credit Card Needed):</strong>
          You can test and log in immediately for free by adding a Test Phone Number in Firebase:
          <ol style="margin:4px 0 0 18px; padding:0; color:var(--ts); line-height:1.5;">
            <li>Open <a href="https://console.firebase.google.com/project/elevate-8d5c4/authentication/providers" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:underline;">Firebase Console > Auth > Sign-in method</a></li>
            <li>Click <strong>Phone</strong> and expand <strong>Phone numbers for testing</strong></li>
            <li>Add a test number (e.g. <code>+91 9999999999</code> with OTP <code>123456</code>)</li>
            <li>Enter that test number here in ELEVATE to sign in or create an account immediately!</li>
          </ol>
        </div>
      </div>
    `;
  }

  // 2. REGION NOT ALLOWED (SMS Region Policy)
  if (
    code === "auth/operation-not-allowed" ||
    fullErrorStr.includes("SMS UNABLE TO BE SENT UNTIL THIS REGION ENABLED") ||
    fullErrorStr.includes("SMS_REGION_POLICY")
  ) {
    return `
      <div style="font-size:0.85rem; line-height:1.45;">
        <div style="font-weight:700; color:#f59e0b; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
          <i class="ri-shield-user-fill"></i> SMS Region Policy Restriction
        </div>
        <p style="margin:0 0 6px 0; color:var(--ts);">
          SMS to this country is restricted by your Firebase project's SMS Region Policy or the Phone sign-in provider is disabled.
        </p>
        <div style="background:rgba(255,255,255,0.06); padding:8px 10px; border-radius:6px; border:1px solid var(--gb);">
          Go to <a href="https://console.firebase.google.com/project/elevate-8d5c4/authentication/settings" target="_blank" rel="noopener noreferrer" style="color:var(--accent); text-decoration:underline;">Firebase Console > Authentication > Settings > SMS region policy</a> and allow your country, or add a test phone number.
        </div>
      </div>
    `;
  }

  // 3. RUNNING VIA file:// OR UNAUTHORIZED DOMAIN
  if (
    code === "auth/operation-not-supported-in-this-environment" ||
    code === "auth/unauthorized-domain" ||
    window.location.protocol === "file:"
  ) {
    return `
      <div style="font-size:0.85rem; line-height:1.45;">
        <div style="font-weight:700; color:#ef4444; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
          <i class="ri-global-line"></i> Local Web Server Required
        </div>
        <p style="margin:0; color:var(--ts);">
          Firebase Phone & Google Authentication cannot run directly from <code>file://</code> URLs due to browser security restrictions. Please launch this project through VS Code Live Server (e.g. <code>http://localhost:5505</code>) or a local web server.
        </p>
      </div>
    `;
  }

  if (code === "auth/invalid-phone-number") {
    return "Invalid mobile number format. Please check your country code and digits.";
  }
  if (code === "auth/missing-phone-number") {
    return "Please enter a valid mobile number.";
  }
  if (code === "auth/quota-exceeded") {
    return "SMS quota for this project has been exceeded. Please try again later or add free test phone numbers in Firebase Console.";
  }
  if (code === "auth/too-many-requests") {
    return "Too many requests. Please wait a few minutes before trying again or test with test numbers.";
  }
  if (code === "auth/captcha-check-failed") {
    return "reCAPTCHA verification failed. Please try again.";
  }
  if (code === "auth/invalid-verification-code") {
    return "Invalid 6-digit verification code. Please check your code and try again.";
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

  // If user toggles tabs while in step 2, reset to step 1 so they can view and update fields
  if (phoneStep2 && phoneStep2.style.display !== 'none') {
    phoneStep2.style.display = 'none';
    if (phoneStep1) phoneStep1.style.display = 'flex';
  }
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
// PHONE AUTHENTICATION HELPERS & LOGIC
// =====================================================

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
  hideAuthError();

  if (window.location.protocol === "file:") {
    showAuthError(`
      <div style="font-size:0.85rem; line-height:1.45;">
        <strong style="color:#ef4444;">⚠️ Cannot run via file://</strong><br>
        Firebase Phone Authentication requires an HTTP/HTTPS origin. Please open this page via a local web server (e.g. <code>http://localhost:5505</code> via VS Code Live Server).
      </div>
    `);
    return;
  }

  const countryCodeSelect = document.getElementById("login-country-code");
  const countryCode = countryCodeSelect ? countryCodeSelect.value : "+91";
  const rawPhone = loginPhoneInp ? loginPhoneInp.value : "";
  const fullPhone = formatPhoneNumber(countryCode, rawPhone);

  if (!fullPhone || !/^\+[1-9]\d{6,14}$/.test(fullPhone)) {
    showAuthError("Please enter a valid mobile number (e.g. 9876543210).");
    if (loginPhoneInp) loginPhoneInp.focus();
    return;
  }

  // If in sign up mode, validate name
  if (authMode === "signup" && loginPhoneNameInp) {
    const nameVal = loginPhoneNameInp.value.trim();
    if (!nameVal) {
      showAuthError("Please enter your full name to create an account.");
      loginPhoneNameInp.focus();
      return;
    }
    pendingPhoneDisplayName = nameVal;
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
    resetRecaptchaWidget();
    showAuthError(getAuthErrorMessage(error));
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
    hideAuthError();
    
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
    hideAuthError();
    recreateRecaptcha();
    if (resendTimer) clearInterval(resendTimer);
  });
}

// Edit Phone Number Button (from step 2)
if (btnPhoneEditNumber) {
  btnPhoneEditNumber.addEventListener('click', () => {
    if (phoneStep2) phoneStep2.style.display = 'none';
    if (phoneStep1) phoneStep1.style.display = 'flex';
    hideAuthError();
    resetRecaptchaWidget();
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
    hideAuthError();

    const code = loginPhoneCodeInp ? loginPhoneCodeInp.value.trim() : "";
    if (!code || code.length < 6) {
      showAuthError("Please enter the complete 6-digit verification code.");
      if (loginPhoneCodeInp) loginPhoneCodeInp.focus();
      return;
    }

    if (!confirmationResult) {
      showAuthError("Session expired. Please click 'Change' and send the code again.");
      return;
    }

    try {
      btnPhoneVerify.disabled = true;
      btnPhoneVerify.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Verifying...';

      const enteredName = (loginPhoneNameInp && authMode === 'signup') ? loginPhoneNameInp.value.trim() : (pendingPhoneDisplayName || "");
      if (enteredName) {
        pendingPhoneDisplayName = enteredName;
        if (window.D) {
          window.D.profile = window.D.profile || {};
          window.D.profile.name = enteredName;
        }
      }

      const userCredential = await confirmationResult.confirm(code);
      const user = userCredential.user;
      console.log("Phone sign-in successful for UID:", user.uid);

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
        const pNameInp = document.getElementById("p-name");
        if (pNameInp) pNameInp.value = enteredName;
        if (typeof window.updateGreeting === "function") window.updateGreeting();
        if (window.saveToFirestore) window.saveToFirestore();
      }

      recreateRecaptcha();
      if (resendTimer) clearInterval(resendTimer);

    } catch (error) {
      console.error("Phone verification failed:", error);
      showAuthError(getAuthErrorMessage(error));
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

  // Auto-detect country code if pasted with + prefix
  loginPhoneInp.addEventListener("input", () => {
    hideAuthError();
    const val = loginPhoneInp.value.trim();
    if (val.startsWith("+")) {
      const countryCodeSelect = document.getElementById("login-country-code");
      if (countryCodeSelect) {
        const options = Array.from(countryCodeSelect.options);
        let matchedOpt = null;
        for (const opt of options) {
          if (val.startsWith(opt.value)) {
            if (!matchedOpt || opt.value.length > matchedOpt.value.length) {
              matchedOpt = opt;
            }
          }
        }
        if (matchedOpt) {
          countryCodeSelect.value = matchedOpt.value;
          loginPhoneInp.value = val.slice(matchedOpt.value.length).trim();
        }
      }
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
    hideAuthError();
    loginPhoneCodeInp.value = loginPhoneCodeInp.value.replace(/\D/g, '').slice(0, 6);
    if (loginPhoneCodeInp.value.length === 6) {
      if (btnPhoneVerify) btnPhoneVerify.click();
    }
  });
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