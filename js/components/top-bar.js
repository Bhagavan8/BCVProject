import { auth } from '../firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";// Top bar functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize edition selector
    const initEditionSelector = () => {
        const editionItems = document.querySelectorAll('.edition-menu .dropdown-item');
        if (editionItems) {
            editionItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const edition = this.dataset.edition;
                    const img = this.querySelector('img');
                    const text = this.querySelector('span');
                    
                    if (img && text) {
                        const btnContent = document.querySelector('.edition-btn > div');
                        if (btnContent) {
                            btnContent.innerHTML = `
                                <img src="${img.src}" alt="${img.alt}" width="${img.width}" height="${img.height}">
                                <span>${text.textContent}</span>
                            `;
                        }
                    }
                });
            });
        }
    };

    // Initialize language selector
    const initLanguageSelector = () => {
        const langItems = document.querySelectorAll('.language-menu .dropdown-item');
        if (langItems) {
            langItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const lang = e.target.dataset.lang;
                    const text = e.target.textContent;
                    const langBtn = document.querySelector('.lang-btn');
                    if (langBtn) {
                        langBtn.textContent = text.toUpperCase();
                    }
                });
            });
        }
    };

    // Initialize date time display
    const initDateTime = () => {
        

        // Update datetime
        function updateDateTime() {
            const dateTimeElement = document.getElementById('currentDateTime');
            if (dateTimeElement) {
                const now = new Date();
                const options = { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit'
                };
                dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
            }
        }

        // Handle sign out
        window.handleSignOut = async function() {
            try {
                await signOut(auth);
                sessionStorage.removeItem('userData'); // Clear session data
                window.location.href = '/pages/login.html'; // Redirect to login page
            } catch (error) {
                console.error("Error signing out:", error);
                Toastify({
                    text: "Error signing out. Please try again.",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: { background: "linear-gradient(to right, #ff416c, #ff4b2b)" }
                }).showToast();
            }
        };

        // Initialize
        updateDateTime();
        setInterval(updateDateTime, 60000); // Update every minute
    };

    // Remove the separate initialization and modify loadTopBar
    const loadTopBar = async () => {
        try {
            const response = await fetch('/components/top-bar.html');
            const html = await response.text();
            const container = document.getElementById('top-bar-container');
            container.innerHTML = html;
            
            // Wait for a brief moment to ensure DOM is updated
            setTimeout(() => {
                const dateTimeInterval = initDateTime();
                initEditionSelector();
                initLanguageSelector();
                
                // Cleanup on page unload
                window.addEventListener('unload', () => clearInterval(dateTimeInterval));
            }, 100);
            
        } catch (error) {
            console.error('Error loading top bar:', error);
        }
    };

    // Start loading
    loadTopBar();
});

// Language handling
function changeLanguage(langCode, langName) {
    // Update button text
    document.getElementById('currentLang').textContent = langName;
    
    // Store the language preference
    localStorage.setItem('preferredLanguage', langCode);
    
    // Create a custom event for language change
    const event = new CustomEvent('languageChanged', { 
        detail: { language: langCode } 
    });
    document.dispatchEvent(event);
    
    // Reload content in new language
    loadTranslations(langCode);
}

// Load translations based on language code
async function loadTranslations(langCode) {
    try {
        // Fetch translations from your backend or JSON file
        const response = await fetch(`/api/translations/${langCode}`);
        const translations = await response.json();
        
        // Update all translatable elements
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });
        
        // Show success message
        showToast(`Language changed to ${document.getElementById('currentLang').textContent}`);
    } catch (error) {
        console.error('Error loading translations:', error);
        showToast('Error changing language', 'error');
    }
}

// Helper function to show toast notifications
function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: type === 'success' ? "#28a745" : "#dc3545"
    }).showToast();
}

// Initialize language from stored preference
document.addEventListener('DOMContentLoaded', () => {
    const storedLang = localStorage.getItem('preferredLanguage');
    if (storedLang) {
        const langElement = document.querySelector(`[data-lang="${storedLang}"]`);
        if (langElement) {
            changeLanguage(storedLang, langElement.textContent);
        }
    }
});