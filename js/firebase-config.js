import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Encrypted configuration (properly encoded)
const encryptedConfig = "eyJhcGlLZXkiOiJBSXphU3lEOVhWYUI0Vk1zaXBHUTRmUTQ1VFg3UHhiTTNEdTVfWEUiLCJhdXRoRG9tYWluIjoiYmN2d29ybGQtY2M0MGUuZmlyZWJhc2VhcHAuY29tIiwicHJvamVjdElkIjoiYmN2d29ybGQtY2M0MGUiLCJzdG9yYWdlQnVja2V0IjoiYmN2d29ybGQtY2M0MGUuZmlyZWJhc2VzdG9yYWdlLmFwcCIsIm1lc3NhZ2luZ1NlbmRlcklkIjoiMTA4MzI5NTgwODIyNyIsImFwcElkIjoiMToxMDgzMjk1ODA4MjI3OndlYjo4MDcwZDA4MGJlYjdlOWE4MTlhM2Q2IiwibWVhc3VyZW1lbnRJZCI6IkctRlZUU0tLTkpCSCJ9";

// Decrypt configuration with error handling
const decryptConfig = (encrypted) => {
    try {
        const decoded = atob(encrypted);
        const config = JSON.parse(decoded);
        
        // Validate required fields
        if (!config.apiKey || !config.authDomain || !config.projectId) {
            throw new Error('Missing required configuration fields');
        }
        
        return config;
    } catch (e) {
        console.error('Configuration error:', e);  
    }
};

let db, auth;
try {
    const firebaseConfig = decryptConfig(encryptedConfig);
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error('Initialization error:', error);
}

export { db, auth };

