import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
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
// LOGOUT
// =====================================================

if (btnLogout && auth) {

  btnLogout.addEventListener("click", async () => {

    try {

      btnLogout.disabled = true;

      await signOut(auth);

      console.log("User logged out");

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


        // =================================================
        // LOAD USER DATA FROM FIRESTORE
        // =================================================

        try {

          const userRef =
            doc(db, "users", user.uid);

          const snapshot =
            await getDoc(userRef);


          // Existing user

          if (snapshot.exists()) {

            const remoteData =
              snapshot.data();

            console.log(
              "Planner data loaded from Firestore"
            );


            if (
              remoteData &&
              remoteData.planner &&
              window.D
            ) {

              Object.assign(
                window.D,
                remoteData.planner
              );

            }


            // Update local copy

            try {

              localStorage.setItem(
                "elevate2",
                JSON.stringify(window.D)
              );

            } catch (e) { }


            // Refresh UI

            if (
              typeof window.renderAll ===
              "function"
            ) {

              window.renderAll();

            }

            if (
              typeof window.updateGreeting ===
              "function"
            ) {

              window.updateGreeting();

            }

          }


          // =================================================
          // NEW USER
          // =================================================

          else {

            console.log(
              "New user. Creating Firestore profile..."
            );


            await setDoc(
              userRef,
              {
                planner: window.D,
                updatedAt:
                  new Date().toISOString()
              }
            );


            console.log(
              "New user profile created"
            );

          }

        } catch (error) {

          console.error(
            "Error loading Firestore data:",
            error
          );

        }


        // Restore login button

        if (btnLogin) {

          btnLogin.disabled = false;

          btnLogin.innerHTML =
            '<i class="ri-google-fill"></i> Sign in with Google';

        }

      }


      // =================================================
      // USER IS LOGGED OUT
      // =================================================

      else {

        currentUser = null;

        console.log(
          "No authenticated user"
        );


        if (loginModal) {

          loginModal.style.display =
            "flex";

        }


        if (btnLogin) {

          btnLogin.disabled = false;

          btnLogin.innerHTML =
            '<i class="ri-google-fill"></i> Sign in with Google';

        }

      }

    }
  );

}