import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class NotificationManager {
    constructor() {
        this.container = document.querySelector('.notification-container');
        this.currentType = 'job'; // Start with job notification
        this.initialize();
    }

    async initialize() {
        // Initial load
        this.showNextNotification();
        
        // Refresh every 3 minutes
        setInterval(() => {
            this.showNextNotification();
        }, 3 * 60 * 1000);
    }

    async showNextNotification() {
        if (this.currentType === 'job') {
            await this.showLatestJobNotification();
            this.currentType = 'news';
        } else {
            await this.showLatestNewsNotification();
            this.currentType = 'job';
        }
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Date not available';

        let date;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            date = new Date(timestamp);
        }

        // Format date with time
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    async showLatestJobNotification() {
        try {
            const jobsQuery = query(
                collection(db, 'jobs'),
                where('jobType', '==', 'private'),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(jobsQuery);
            if (!querySnapshot.empty) {
                const jobData = querySnapshot.docs[0].data();
                const jobId = querySnapshot.docs[0].id;
                
                this.createNotification({
                    icon: '💼',
                    title: 'New Job Opening',
                    message: `${jobData.jobTitle} at ${jobData.companyName}`,
                    actionText: 'View Job',
                    actionUrl: `job-details.html?id=${jobId}&type=private`,
                    theme: 'job',
                    createdAt: this.formatDate(jobData.createdAt)
                });
            }
        } catch (error) {
            console.error('Error fetching job:', error);
        }
    }

    async showLatestNewsNotification() {
        try {
            const newsQuery = query(
                collection(db, 'news'),
                where('section', '==', "breaking"),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(newsQuery);
            if (!querySnapshot.empty) {
                const newsData = querySnapshot.docs[0].data();
                const newsId = querySnapshot.docs[0].id;

                this.createNotification({
                    icon: '📰',
                    title: 'Breaking News',
                    message: newsData.title,
                    actionText: 'Read More',
                    actionUrl: `news-detail.html?id=${newsId}`,
                    theme: 'news',
                    createdAt: this.formatDate(newsData.createdAt) // Fixed variable name from jobData to newsData
                });
            }
        } catch (error) {
            console.error('Error fetching news:', error);
        }
    }

    createNotification({ icon, title, message, actionText, actionUrl, theme,createdAt }) {
        // Remove existing notification if any
        const existingNotif = document.querySelector('.notification');
        if (existingNotif) {
            existingNotif.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification ${theme}-theme`;
        notification.innerHTML = `
            <div class="notification-header">
                <h3 class="notification-title">
                    <span class="notification-icon">${icon}</span>
                    ${title}
                </h3>
                <button class="close-btn">×</button>
            </div>
            <div class="notification-body">
                ${message}
            </div>
            <div class="notification-footer">
                <a href="${actionUrl}" class="action-btn-banner">${actionText}</a>
                <span class="timestamp">${createdAt}</span>
            </div>
            <div class="progress-bar">
                <div class="progress"></div>
            </div>
        `;

        this.container.appendChild(notification);
        
        // Add close button functionality
        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.4s forwards';
            setTimeout(() => notification.remove(), 400);
        });

        // Auto-dismiss after 3 minutes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.4s forwards';
                setTimeout(() => notification.remove(), 400);
            }
        }, 3 * 60 * 1000);
    }
}


// Initialize notification manager
const notificationManager = new NotificationManager();