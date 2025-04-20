import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

async function loadBreakingNews() {
    try {
        const breakingNewsQuery = query(
            collection(db, 'news'),
            where('section', '==', 'breaking'),
            where('approvalStatus', '==', 'approved'),
            orderBy('createdAt', 'desc'),
            limit(3)
        );

        const querySnapshot = await getDocs(breakingNewsQuery);
        const breakingNews = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (breakingNews.length > 0) {
            // Populate main breaking news
            document.getElementById('mainBreakingNews').innerHTML = createMainNewsHTML(breakingNews[0]);
            
            // Populate secondary breaking news
            if (breakingNews[1]) {
                document.getElementById('secondaryBreakingNews1').innerHTML = createSecondaryNewsHTML(breakingNews[1]);
            }
            if (breakingNews[2]) {
                document.getElementById('secondaryBreakingNews2').innerHTML = createSecondaryNewsHTML(breakingNews[2]);
            }
        }
    } catch (error) {
        console.error('Error loading breaking news:', error);
    }
}

function createMainNewsHTML(news) {
    return `
        <div class="position-relative main-breaking-news">
            <div class="social-share-icons position-absolute top-0 end-0 m-3 z-1">
                <a href="https://facebook.com/share.php?u=${window.location.origin}/news/${news.id}" 
                   class="btn btn-glass btn-sm rounded-circle me-2" target="_blank">
                    <i class="bi bi-facebook"></i>
                </a>
                <a href="https://twitter.com/intent/tweet?url=${window.location.origin}/news/${news.id}&text=${encodeURIComponent(news.title)}" 
                   class="btn btn-glass btn-sm rounded-circle me-2" target="_blank">
                    <i class="bi bi-twitter"></i>
                </a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(news.title + ' ' + window.location.origin + '/news/' + news.id)}" 
                   class="btn btn-glass btn-sm rounded-circle" target="_blank">
                    <i class="bi bi-whatsapp"></i>
                </a>
            </div>
            <div class="image-wrapper">
                <img src="${news.imagePath}" alt="${news.title}">
            </div>
            <div class="news-overlay">
                <span class="news-category">${news.category}</span>
                <h3 class="mt-3 mb-2 text-white">${news.title}</h3>
                <p class="content-preview text-white-50">${news.content.substring(0, 150)}...</p>
                <div class="d-flex justify-content-between align-items-center mt-4">
                    <div class="news-meta text-white-50">
                        <span><i class="bi bi-calendar3 me-1"></i>${formatDate(news.createdAt)}</span>
                        <span class="ms-3"><i class="bi bi-eye me-1"></i>${news.views}</span>
                        <span class="ms-3"><i class="bi bi-heart me-1"></i>${news.likes}</span>
                    </div>
                    <a href="news-detail.html?id=${news.id}" class="btn-read-more">
                        Read More <i class="bi bi-arrow-right ms-1"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
}

function createSecondaryNewsHTML(news) {
    return `
        <div class="position-relative">
            <div class="social-share-icons position-absolute top-0 end-0 m-2 z-1">
                <a href="https://facebook.com/share.php?u=${window.location.origin}/news/${news.id}" class="btn btn-light btn-sm rounded-circle me-1" target="_blank">
                    <i class="bi bi-facebook"></i>
                </a>
                <a href="https://twitter.com/intent/tweet?url=${window.location.origin}/news/${news.id}&text=${encodeURIComponent(news.title)}" class="btn btn-light btn-sm rounded-circle me-1" target="_blank">
                    <i class="bi bi-twitter"></i>
                </a>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(news.title + ' ' + window.location.origin + '/news/' + news.id)}" class="btn btn-light btn-sm rounded-circle" target="_blank">
                    <i class="bi bi-whatsapp"></i>
                </a>
            </div>
            <img src="${news.imagePath}" alt="${news.title}">
            <div class="news-overlay">
                <span class="news-category badge bg-primary mb-2">${news.category}</span>
                <h5 class="mb-2">${news.title}</h5>
                <p class="content-preview small mb-2">${news.content.substring(0, 100)}...</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="small">${formatDate(news.createdAt)}</span>
                    <a href="news-detail.html?id=${news.id}" class="btn btn-light btn-sm">Read More</a>
                </div>
            </div>
        </div>
    `;
}

async function loadSectionNews(section, containerId, itemLimit = 4) {
    try {
        let conditions = [
            where('approvalStatus', '==', 'approved'),
            where('section', '==', section)
        ];

        // Add 24-hour filter for recent section
        if (section === 'recent') {
            const last24Hours = new Date();
            last24Hours.setHours(last24Hours.getHours() - 24);
            conditions.push(where('createdAt', '>=', last24Hours));
        }

        const newsQuery = query(
            collection(db, 'news'),
            ...conditions,
            orderBy('createdAt', 'desc'),
            limit(itemLimit)
        );

        const snapshot = await getDocs(newsQuery);
        const container = document.getElementById(containerId);

        if (container && !snapshot.empty) {
    
            container.innerHTML = snapshot.docs.map((doc, index) => {
                const news = doc.data();
                return `
                    <article class="news-article" data-aos="fade-up" data-aos-delay="${index * 100}">
                        <div class="article-image">
                            <img src="${news.imagePath}" alt="${news.title}" loading="lazy">
                            <span class="category-tag">${news.category.charAt(0).toUpperCase() + news.category.slice(1)}</span>
                        </div>
                        <div class="article-content">
                            <div class="article-meta">
                                <span><i class="bi bi-clock"></i> ${formatDate(news.createdAt)}</span>
                                <span><i class="bi bi-person"></i> ${news.authorName}</span>
                            </div>
                            <h3 class="article-title">${news.title}</h3>
                            <p class="article-excerpt">${news.content.substring(0, 120)}...</p>
                            <div class="article-footer">
                                <div class="article-stats">
                                    <span class="stat-item"><i class="bi bi-eye"></i> ${formatNumber(news.views || 0)}</span>
                                    <span class="stat-item"><i class="bi bi-heart"></i> ${formatNumber(news.likes || 0)}</span>
                                </div>
                                <div class="share-buttons">
                                    <a href="https://facebook.com/share.php?u=${window.location.href}?id=${doc.id}" 
                                       class="share-btn facebook" target="_blank">
                                        <i class="bi bi-facebook"></i>
                                    </a>
                                    <a href="https://twitter.com/intent/tweet?url=${window.location.href}?id=${doc.id}&text=${encodeURIComponent(news.title)}" 
                                       class="share-btn twitter" target="_blank">
                                        <i class="bi bi-twitter"></i>
                                    </a>
                                    <a href="https://wa.me/?text=${encodeURIComponent(news.title + ' ' + window.location.href + '?id=' + doc.id)}" 
                                       class="share-btn whatsapp" target="_blank">
                                        <i class="bi bi-whatsapp"></i>
                                    </a>
                                </div>
                                <a href="news-detail.html?id=${doc.id}" class="read-more-btn">
                                    Read More <i class="bi bi-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                    </article>`;
            }).join('');
        }
    } catch (error) {
        console.error(`Error loading ${section} news:`, error);
    }
}

// Helper function to format numbers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num;
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Add auto-refresh interval (10 minutes in milliseconds)
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000;

// Modify the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadAllSections();
    
    // Set up auto-refresh
    setInterval(loadAllSections, AUTO_REFRESH_INTERVAL);
});

// Add a function to load all sections
function loadAllSections() {
    loadSectionNews('general', 'generalNewsGrid');
    loadSectionNews('featured', 'featuredNewsSlider');
    loadSectionNews('recent', 'recentNewsList');
    loadSectionNews('entertainment', 'entertainmentGrid');
    loadSectionNews('tips', 'tipsGrid');
    loadSectionNews('stories', 'storiesGrid');
    loadBreakingNews();
}
