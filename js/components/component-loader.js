document.addEventListener('DOMContentLoaded', async () => {
    const components = [
        { id: 'top-bar-container', path: '/components/top-bar.html' },
        { id: 'header-container', path: '/components/header.html' },
        { id: 'navigation-container', path: '/components/navigation.html' },
        { id: 'breaking-news-container', path: '/components/breaking-news.html' },
        { id: 'modal-container', path: '/components/subscribe-modal.html' },
        { id: 'footer-container', path: '/components/footer.html' }
    ];

    try {
        await Promise.all(components.map(async (component) => {
            const container = document.getElementById(component.id);
            if (container) {
                const response = await fetch(component.path);
                const html = await response.text();
                container.innerHTML = html;
            }
        }));

        // Dispatch event after components are loaded
        document.dispatchEvent(new CustomEvent('componentsLoaded'));
    } catch (error) {
        console.error('Error loading components:', error);
    }
});


export async function loadComponents() {
    try {
        const components = {
            'header-container': '/components/header.html',
            'navigation-container': '/components/navigation.html'
        };

        for (const [id, path] of Object.entries(components)) {
            const element = document.getElementById(id);
            if (element) {
                const response = await fetch(path);
                if (response.ok) {
                    element.innerHTML = await response.text();
                }
            }
        }
    } catch (error) {
        console.error('Error loading components:', error);
        toastr.error('Failed to load page components');
    }
}


function loadComponent(containerId, componentPath) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';
    
    fetch(componentPath)
        .then(response => response.text())
        .then(html => {
            container.innerHTML = html;
        })
        .catch(error => console.error('Error loading component:', error));
}