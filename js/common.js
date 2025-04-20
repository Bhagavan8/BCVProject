// Toast configuration
$(document).ready(function () {
    toastr.options = {
        "closeButton": true,
        "debug": false,
        "newestOnTop": true,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "preventDuplicates": false,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "5000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    };
});

// Component loading functionality
async function loadComponents() {
    try {
        const containers = {
            'header-container': 'components/header.html',
            'navigation-container': 'components/navigation.html',
            'top-bar-container': 'components/top-bar.html'
        };

        for (const [containerId, componentPath] of Object.entries(containers)) {
            const container = document.getElementById(containerId);
            if (container) {
                try {
                    const response = await fetch(componentPath);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const content = await response.text();
                    container.innerHTML = content;
                } catch (error) {
                    console.error(`Error loading ${componentPath}:`, error);
                    container.innerHTML = `<div class="alert alert-danger">Failed to load component</div>`;
                }
            }
        }
    } catch (error) {
        console.error('Error in loadComponents:', error);
    }
}

// Initialize components on DOM load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await import('./firebase-config.js');
        await loadComponents();
    } catch (error) {
        console.error('Initialization error:', error);
        toastr.error('Failed to initialize application');
    }
});

// Add error handling for missing elements
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: type === 'success' ? "#28a745" : "#dc3545"
    }).showToast();
}

// Export utility functions
export { safeGetElement };