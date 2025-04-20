import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    limit, getDocs, startAfter, updateDoc,
    doc, increment, serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let lastVisible = null;
const ITEMS_PER_PAGE = 12;
let currentCategory = 'all';
let currentTimeFilter = 'latest';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadNavigation();
        await initializeComponents();
        initializeEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Initialize components
async function initializeComponents() {
    await Promise.all([
        loadCategories(),
        loadFeaturedNews(),
        loadMostViewed(),
        loadMostLiked(),
        loadCategoriesList()
    ]);
}

// Load featured news
async function loadFeaturedNews(isLoadMore = false) {
    try {
        const container = document.getElementById('featuredNewsContainer');
        if (!container) return;

        let newsQuery = query(
            collection(db, 'news'),
            where('featured', '==', true)
        );

        if (currentCategory !== 'all') {
            newsQuery = query(newsQuery, where('category', '==', currentCategory));
        }

        if (currentTimeFilter !== 'latest') {
            const date = new Date();
            if (currentTimeFilter === '24h') date.setDate(date.getDate() - 1);
            if (currentTimeFilter === 'week') date.setDate(date.getDate() - 7);
            newsQuery = query(newsQuery, where('publishedAt', '>=', date));
        }

        newsQuery = query(
            newsQuery,
            orderBy('publishedAt', 'desc'),
            limit(ITEMS_PER_PAGE)
        );

        if (isLoadMore && lastVisible) {
            newsQuery = query(newsQuery, startAfter(lastVisible));
        }

        const snapshot = await getDocs(newsQuery);
        lastVisible = snapshot.docs[snapshot.docs.length - 1];

        const newsHTML = snapshot.docs.map(doc => {
            const news = doc.data();
            return createNewsCard(news, doc.id);
        }).join('');

        if (!isLoadMore) {
            container.innerHTML = newsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', newsHTML);
        }

        updateLoadMoreButton(snapshot.docs.length);
    } catch (error) {
        console.error('Error loading featured news:', error);
    }
}

// Create news card
function createNewsCard(news, id) {
    return `
        <div class="featured-news-card">
            <div class="news-image">
                <img src="${news.imageUrl}" alt="${news.title}">
            </div>
            <div class="news-content">
                <div class="news-meta">
                    <span>${formatDate(news.publishedAt)}</span>
                    <span>${news.category}</span>
                </div>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.excerpt}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <a href="article.html?id=${id}" class="btn btn-primary btn-sm">Read More</a>
                    <div class="social-share">
                        <button class="btn btn-link" onclick="shareNews('${id}', 'facebook')">
                            <i class="bi bi-facebook"></i>
                        </button>
                        <button class="btn btn-link" onclick="shareNews('${id}', 'twitter')">
                            <i class="bi bi-twitter"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load categories
async function loadCategories() {
    try {
        const categories = [
            { id: 'politics', name: 'Politics' },
            { id: 'technology', name: 'Technology' },
            { id: 'business', name: 'Business' },
            { id: 'sports', name: 'Sports' },
            { id: 'entertainment', name: 'Entertainment' }
        ];

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = `
                <option value="all">All Categories</option>
                ${categories.map(category => `
                    <option value="${category.id}">${category.name}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load categories list
async function loadCategoriesList() {
    try {
        const categories = [
            { id: 'politics', name: 'Politics', count: 42 },
            { id: 'technology', name: 'Technology', count: 38 },
            { id: 'business', name: 'Business', count: 35 },
            { id: 'sports', name: 'Sports', count: 31 },
            { id: 'entertainment', name: 'Entertainment', count: 28 }
        ];

        const categoriesList = document.getElementById('categoriesList');
        if (categoriesList) {
            categoriesList.innerHTML = categories.map(category => `
                <div class="category-item" data-category="${category.id}">
                    <div class="d-flex justify-content-between">
                        <span>${category.name}</span>
                        <span class="badge bg-light text-dark">${category.count}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading categories list:', error);
    }
}

// Load most viewed
async function loadMostViewed() {
    try {
        const viewsQuery = query(
            collection(db, 'news'),
            where('featured', '==', true),
            orderBy('views', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(viewsQuery);
        const mostViewedContainer = document.getElementById('mostViewed');
        
        if (mostViewedContainer) {
            mostViewedContainer.innerHTML = snapshot.docs.map(doc => {
                const news = doc.data();
                return createPopularNewsItem(news, doc.id);
            }).join('');
        }
    } catch (error) {
        console.error('Error loading most viewed:', error);
    }
}

// Load most liked
async function loadMostLiked() {
    try {
        const likesQuery = query(
            collection(db, 'news'),
            where('featured', '==', true),
            orderBy('likes', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(likesQuery);
        const mostLikedContainer = document.getElementById('mostLiked');
        
        if (mostLikedContainer) {
            mostLikedContainer.innerHTML = snapshot.docs.map(doc => {
                const news = doc.data();
                return createPopularNewsItem(news, doc.id);
            }).join('');
        }
    } catch (error) {
        console.error('Error loading most liked:', error);
    }
}

// Create popular news item
function createPopularNewsItem(news, id) {
    return `
        <div class="popular-news-item">
            <div class="popular-news-image">
                <img src="${news.imageUrl}" alt="${news.title}">
            </div>
            <div>
                <h6 class="mb-1"><a href="article.html?id=${id}" class="text-dark text-decoration-none">${news.title}</a></h6>
                <small class="text-muted">${formatDate(news.publishedAt)}</small>
            </div>
        </div>
    `;
}

// Initialize event listeners
function initializeEventListeners() {
    // Category filter
    document.getElementById('categoryFilter')?.addEventListener('change', async (e) => {
        currentCategory = e.target.value;
        await loadFeaturedNews();
    });

    // Time filter
    document.getElementById('timeFilter')?.addEventListener('change', async (e) => {
        currentTimeFilter = e.target.value;
        await loadFeaturedNews();
    });

    // View toggle
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const container = document.getElementById('featuredNewsContainer');
            if (container) {
                container.className = `news-${view}`;
            }
        });
    });

    // Categories list
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', async () => {
            currentCategory = item.dataset.category;
            document.getElementById('categoryFilter').value = currentCategory;
            await loadFeaturedNews();
        });
    });

    // Load more
    document.getElementById('loadMore')?.addEventListener('click', () => {
        loadFeaturedNews(true);
    });

    // Newsletter form
    document.getElementById('newsletterForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        try {
            await subscribeToNewsletter(email);
            alert('Thank you for subscribing!');
            e.target.reset();
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            alert('Subscription failed. Please try again.');
        }
    });
}

// Helper functions
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function updateLoadMoreButton(docsLength) {
    const loadMoreBtn = document.getElementById('loadMore');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = docsLength < ITEMS_PER_PAGE ? 'none' : 'block';
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

// Share news
window.shareNews = function(newsId, platform) {
    const url = `${window.location.origin}/article.html?id=${newsId}`;
    let shareUrl;

    switch (platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`;
            break;
    }

    if (shareUrl) {
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }
};

// Subscribe to newsletter
async function subscribeToNewsletter(email) {
    try {
        const newsletterRef = collection(db, 'newsletters');
        await addDoc(newsletterRef, {
            email: email,
            subscribedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        throw error;
    }
}