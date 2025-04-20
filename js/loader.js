class PageLoader {
    constructor() {
        this.loaderElement = null;
        this.refreshInterval = 5 * 60 * 1000; // 5 minutes
        this.counterElement = null;
        this.refreshTimeout = null;
        this.isUserActive = false;
        this.lastActivityTime = Date.now();
        this.init();
    }

    init() {
        fetch('./components/loader.html')
            .then(response => response.text())
            .then(html => {
                document.body.insertAdjacentHTML('afterbegin', html);
                this.loaderElement = document.querySelector('.page-loader');
                this.counterElement = document.getElementById('refreshCounter');
                this.setupActivityTracking();
                this.setupAutoRefresh();
                this.handlePageEvents();
                this.hide();
            });
    }

    setupActivityTracking() {
        // Track user activity
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.isUserActive = true;
                this.lastActivityTime = Date.now();
                // Reset refresh timer when user is active
                if (this.refreshTimeout) {
                    clearTimeout(this.refreshTimeout);
                    this.setupAutoRefresh();
                }
            });
        });

        // Check for inactivity every 30 seconds
        setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivityTime;
            if (inactiveTime > 30000) { // 30 seconds
                this.isUserActive = false;
            }
        }, 30000);
    }

    setupAutoRefresh() {
        let timeLeft = this.refreshInterval;
        
        const updateTimer = () => {
            if (!this.isUserActive) {
                this.updateCounter(timeLeft);
                timeLeft -= 1000;

                if (timeLeft < 0 && !this.isUserActive) {
                    // Only refresh if user has been inactive
                    const currentScroll = window.scrollY;
                    if (currentScroll === 0) {
                        // If at top of page, refresh immediately
                        this.refreshPage();
                    } else {
                        // If user is scrolled down, wait for them to finish reading
                        timeLeft = 60000; // Reset to 1 minute and check again
                    }
                }
            } else {
                // Reset timer when user is active
                timeLeft = this.refreshInterval;
            }
        };

        // Clear existing interval if any
        if (this.refreshTimeout) {
            clearInterval(this.refreshTimeout);
        }

        // Update counter every second
        this.refreshTimeout = setInterval(updateTimer, 1000);
        updateTimer();
    }

    refreshPage() {
        this.show();
        localStorage.setItem('scrollPosition', window.scrollY);
        window.location.reload();
    }

    updateCounter(timeLeft) {
        if (this.counterElement && this.loaderElement.classList.contains('show')) {
            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            this.counterElement.textContent = 
                `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    handlePageEvents() {
        // Show loader on page load
        this.show();
        
        // Hide loader when content is loaded
        window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                this.hide();
                // Restore scroll position
                const scrollPos = localStorage.getItem('scrollPosition');
                if (scrollPos) {
                    window.scrollTo(0, parseInt(scrollPos));
                    localStorage.removeItem('scrollPosition');
                }
            }, 500);
        });

        // Show loader before page unload
        window.addEventListener('beforeunload', () => {
            this.show();
        });
    }

    show() {
        if (this.loaderElement) {
            this.loaderElement.classList.add('show');
        }
    }

    hide() {
        if (this.loaderElement) {
            this.loaderElement.classList.add('fade-out');
            setTimeout(() => {
                this.loaderElement.classList.remove('show', 'fade-out');
            }, 300);
        }
    }
}

// Initialize the loader
document.addEventListener('DOMContentLoaded', () => {
    window.pageLoader = new PageLoader();
});