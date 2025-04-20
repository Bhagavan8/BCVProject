import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadNavigation();
        initializeEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Initialize event listeners
function initializeEventListeners() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
}

// Handle contact form submission
async function handleContactSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    try {
        const contactRef = collection(db, 'contact_messages');
        await addDoc(contactRef, {
            name,
            email,
            subject,
            message,
            timestamp: serverTimestamp()
        });

        // Show success message
        alert('Thank you for your message. We will get back to you soon!');
        e.target.reset();
    } catch (error) {
        console.error('Error submitting contact form:', error);
        alert('There was an error sending your message. Please try again.');
    }
}

// Load navigation
async function loadNavigation() {
    const nav = document.getElementById('navigation');
    if (nav) {
        const response = await fetch('components/navigation.html');
        nav.innerHTML = await response.text();
    }
}