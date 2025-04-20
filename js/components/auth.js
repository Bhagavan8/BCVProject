import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Registration Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Get form elements with null checks
                const firstName = document.getElementById('firstName')?.value || '';
                const lastName = document.getElementById('lastName')?.value || '';
                const email = document.getElementById('signupEmail')?.value || '';
                const phone = document.getElementById('phone')?.value || '';
                const dob = document.getElementById('dob')?.value || '';
                const password = document.getElementById('signupPassword')?.value || '';

                // Validate required fields
                if (!firstName || !lastName || !email || !phone || !dob || !password) {
                    throw new Error('Please fill in all required fields');
                }

                // Create user in Firebase
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                
                // Add user details to Firestore
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    firstName,
                    lastName,
                    email,
                    phone: '+91' + phone,
                    dob,
                    createdAt: new Date(),
                    lastLogin: new Date()
                });

                // Show success message
                Toastify({
                    text: "Registration successful! Redirecting...",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
                }).showToast();

                // Redirect after successful registration
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 2000);

            } catch (error) {
                console.error("Registration error:", error);
                Toastify({
                    text: error.message,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "linear-gradient(to right, #ff416c, #ff4b2b)" }
                }).showToast();
            }
        });
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const email = document.getElementById('loginEmail')?.value;
                const password = document.getElementById('loginPassword')?.value;

                if (!email || !password) {
                    throw new Error('Please fill in all fields');
                }

                // Sign in with Firebase Auth
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Update last login
                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        ...userData,
                        lastLogin: new Date()
                    }, { merge: true });

                    // Store user data in session with firstName
                    const sessionData = {
                        ...userData,
                        uid: userCredential.user.uid,
                        displayName: userData.firstName // Add firstName for display
                    };
                    sessionStorage.setItem('userData', JSON.stringify(sessionData));

                    // Show success message
                    Toastify({
                        text: "Login successful! Redirecting...",
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
                    }).showToast();

                    // Redirect to index page
                    setTimeout(() => {
                        window.location.href = '/index.html';
                    }, 2000);
                } else {
                    throw new Error('User data not found');
                }

            } catch (error) {
                console.error("Login error:", error);
                let errorMessage = "Login failed. Please try again.";
                
                // Handle specific Firebase auth errors
                if (error.code === 'auth/wrong-password') {
                    errorMessage = "Incorrect password. Please try again.";
                } else if (error.code === 'auth/user-not-found') {
                    errorMessage = "No account found with this email.";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "Invalid email address.";
                }

                Toastify({
                    text: errorMessage,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "linear-gradient(to right, #ff416c, #ff4b2b)" }
                }).showToast();
            }
        });
    }

    // Add auth state observer
    auth.onAuthStateChanged((user) => {
        const userDropdown = document.getElementById('userDropdown');
        const authButtons = document.querySelector('.auth-buttons');
        const userName = document.getElementById('userName');

        if (user) {
            // Get user data from session storage
            const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            
            if (userDropdown && authButtons && userName) {
                // Update UI elements
                userDropdown.style.display = 'block';
                authButtons.style.display = 'none';
                userName.textContent = userData.displayName || userData.firstName || 'User';
            }
        } else {
            if (userDropdown && authButtons) {
                // Reset UI elements
                userDropdown.style.display = 'none';
                authButtons.style.display = 'block';
            }
        }
    });
});