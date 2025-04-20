import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

async function loadSidebarContent() {
    await Promise.all([
        loadLatestNews(),
        loadCategoryNews(),
        loadPopularNews()
    ]);
}

async function loadLatestNews() {
    try {
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const newsQuery = query(
            collection(db, 'news'),
            where('approvalStatus', '==', 'approved'),
            where('createdAt', '>=', last24Hours),
            orderBy('createdAt', 'desc'),
            limit(4)
        );
        const snapshot = await getDocs(newsQuery);
        const container = document.getElementById('latestNewsContainer');
        
        if (container && !snapshot.empty) {
            container.innerHTML = snapshot.docs.map((doc, index) => {
                const news = doc.data();
                return `
                    <div class="sidebar-news-item" data-aos="fade-left" data-aos-delay="${index * 100}">
                        <div class="news-thumb">
                            <img src="${news.imagePath}" alt="${news.title}">
                        </div>
                        <div class="news-info">
                            <span class="news-badge">${news.category}</span>
                            <h5 class="news-title"><a href="news-detail.html?id=${doc.id}">${news.title}</a></h5>
                            <div class="news-meta">
                                <span><i class="bi bi-clock"></i> ${formatDate(news.createdAt)}</span>
                                <span><i class="bi bi-eye"></i> ${formatNumber(news.views || 0)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading latest news:', error);
    }
}

async function loadCategoryNews() {
    try {
        const newsQuery = query(
            collection(db, 'news'),
            where('approvalStatus', '==', 'approved'),
            orderBy('views', 'desc'),
            limit(5)
        );
        const snapshot = await getDocs(newsQuery);
        const container = document.getElementById('categoryNewsContainer');
        
        if (container && !snapshot.empty) {
            container.innerHTML = snapshot.docs.map((doc, index) => {
                const news = doc.data();
                return `
                    <div class="category-news-item" data-aos="fade-up" data-aos-delay="${index * 100}">
                        <div class="category-badge">${news.category}</div>
                        <a href="news-detail.html?id=${doc.id}" class="news-link">
                            <h6>${news.title}</h6>
                        </a>
                        <div class="news-stats">
                            <span><i class="bi bi-eye"></i> ${formatNumber(news.views || 0)}</span>
                            <span><i class="bi bi-heart"></i> ${formatNumber(news.likes || 0)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading category news:', error);
    }
}

async function loadPopularNews() {
    try {
        const newsQuery = query(
            collection(db, 'news'),
            where('approvalStatus', '==', 'approved'),
            orderBy('views', 'desc'),
            limit(5)
        );
        const snapshot = await getDocs(newsQuery);
        const container = document.getElementById('popularNewsContainer');
        
        if (container && !snapshot.empty) {
            container.innerHTML = snapshot.docs.map((doc, index) => {
                const news = doc.data();
                return `
                    <div class="popular-news-item" data-aos="fade-right" data-aos-delay="${index * 100}">
                        <span class="rank-number">${index + 1}</span>
                        <div class="news-content">
                            <a href="news-detail.html?id=${doc.id}" class="news-link"><h6>${news.title}</h6></a>
                            <div class="news-meta">
                                <span><i class="bi bi-eye"></i> ${formatNumber(news.views || 0)}</span>
                                <span><i class="bi bi-calendar"></i> ${formatDate(news.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading popular news:', error);
    }
}

function formatNumber(num) {
    return num >= 1000 ? (num/1000).toFixed(1) + 'K' : num;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Initialize sidebar content and AOS
document.addEventListener('DOMContentLoaded', () => {
    loadSidebarContent();
    // Initialize AOS with custom settings
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100,
            easing: 'ease-in-out'
        });
    }
});