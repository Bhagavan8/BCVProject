import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    limit, getDocs, startAfter, onSnapshot 
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
        startLiveUpdates();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

async function initializeComponents() {
    await Promise.all([
        loadTechCategories(),
        loadTopCompanies(),
        loadTechNews(),
        loadTechReviews(),
        loadMarketTrends(),
        loadTechEvents()
    ]);
}

// Load tech categories
async function loadTechCategories() {
    const categories = [
        { id: 'ai', name: 'AI & ML', icon: 'bi-cpu' },
        { id: 'mobile', name: 'Mobile & Gadgets', icon: 'bi-phone' },
        { id: 'software', name: 'Software & Apps', icon: 'bi-window' },
        { id: 'gaming', name: 'Gaming', icon: 'bi-controller' }
    ];
    
    const categoriesContainer = document.getElementById('techCategories');
    if (categoriesContainer) {
        categoriesContainer.innerHTML = categories.map(category => `
            <div class="tech-item" data-category="${category.id}">
                <i class="bi ${category.icon}"></i>
                <span>${category.name}</span>
            </div>
        `).join('');
    }
}

// Load top companies
async function loadTopCompanies() {
    try {
        const companiesQuery = query(
            collection(db, 'tech_companies'),
            orderBy('marketCap', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(companiesQuery);
        const companiesList = document.getElementById('companiesList');
        
        if (companiesList) {
            companiesList.innerHTML = snapshot.docs.map(doc => {
                const company = doc.data();
                return `
                    <div class="company-item" data-company-id="${doc.id}">
                        <img src="${company.logo}" alt="${company.name}" class="company-logo">
                        <span>${company.name}</span>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

// Load tech news
async function loadTechNews(isLoadMore = false) {
    try {
        const container = document.getElementById('techNewsContainer');
        if (!container) return;

        let newsQuery = query(
            collection(db, 'news'),
            where('category', '==', 'technology')
        );

        if (currentCategory !== 'all') {
            newsQuery = query(newsQuery, where('techCategory', '==', currentCategory));
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
            return createTechNewsCard(news, doc.id);
        }).join('');

        if (!isLoadMore) {
            container.innerHTML = newsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', newsHTML);
        }

        updateLoadMoreButton(snapshot.docs.length);
    } catch (error) {
        console.error('Error loading tech news:', error);
    }
}

// Create tech news card
function createTechNewsCard(news, id) {
    return `
        <div class="tech-news-card" data-aos="fade-up">
            <div class="news-image">
                <img src="${news.imageUrl}" alt="${news.title}">
                <span class="tech-badge">${news.techCategory}</span>
            </div>
            <div class="news-content">
                <div class="news-meta">
                    <span><i class="bi bi-clock"></i> ${formatDate(news.publishedAt)}</span>
                    <span><i class="bi bi-person"></i> ${news.author}</span>
                </div>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.excerpt}</p>
                <a href="article.html?id=${id}" class="btn btn-primary btn-sm">Read More</a>
            </div>
        </div>
    `;
}

// Load tech reviews
async function loadTechReviews() {
    try {
        const reviewsQuery = query(
            collection(db, 'tech_reviews'),
            orderBy('publishedAt', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(reviewsQuery);
        const reviewsContainer = document.getElementById('techReviews');
        
        if (reviewsContainer) {
            reviewsContainer.innerHTML = snapshot.docs.map(doc => {
                const review = doc.data();
                return `
                    <div class="review-item">
                        <h4>${review.productName}</h4>
                        <div class="review-rating">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                        </div>
                        <p>${review.summary}</p>
                        <small class="text-muted">By ${review.reviewer}</small>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

// Load market trends
async function loadMarketTrends() {
    try {
        const trendsQuery = query(
            collection(db, 'market_trends'),
            orderBy('timestamp', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(trendsQuery);
        const trendsContainer = document.getElementById('marketTrends');
        
        if (trendsContainer) {
            trendsContainer.innerHTML = snapshot.docs.map(doc => {
                const trend = doc.data();
                return `
                    <div class="trend-item">
                        <h4>${trend.title}</h4>
                        <p>${trend.description}</p>
                        <div class="trend-stats">
                            <span>Growth: ${trend.growth}%</span>
                            <span>Market Size: $${trend.marketSize}B</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading market trends:', error);
    }
}

// Load tech events
async function loadTechEvents() {
    try {
        const now = new Date();
        const eventsQuery = query(
            collection(db, 'tech_events'),
            where('date', '>=', now),
            orderBy('date', 'asc'),
            limit(5)
        );

        const snapshot = await getDocs(eventsQuery);
        const eventsContainer = document.getElementById('techEvents');
        
        if (eventsContainer) {
            eventsContainer.innerHTML = snapshot.docs.map(doc => {
                const event = doc.data();
                return `
                    <div class="event-item">
                        <div class="event-date">${formatDate(event.date)}</div>
                        <h4>${event.name}</h4>
                        <div class="event-location">
                            <i class="bi bi-geo-alt"></i> ${event.location}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading tech events:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Category selection
    document.querySelectorAll('.tech-item').forEach(item => {
        item.addEventListener('click', async () => {
            currentCategory = item.dataset.category;
            document.querySelectorAll('.tech-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            await loadTechNews();
        });
    });

    // Time filter
    document.getElementById('timeFilter')?.addEventListener('change', async (e) => {
        currentTimeFilter = e.target.value;
        await loadTechNews();
    });

    // View toggle
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const container = document.getElementById('techNewsContainer');
            if (container) {
                container.className = `news-${view}`;
            }
        });
    });

    // Load more
    document.getElementById('loadMore')?.addEventListener('click', () => {
        loadTechNews(true);
    });
}

// Start live updates
function startLiveUpdates() {
    // Product launch updates
    const launchesQuery = query(
        collection(db, 'product_launches'),
        where('status', '==', 'upcoming'),
        orderBy('launchDate', 'asc'),
        limit(1)
    );

    onSnapshot(launchesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const launch = change.doc.data();
                document.getElementById('productLaunches').innerHTML = `
                    <div class="launch-item">
                        <span class="badge bg-primary">Upcoming Launch</span>
                        <h4>${launch.productName}</h4>
                        <p>${launch.description}</p>
                        <div class="launch-date">
                            <i class="bi bi-calendar"></i> ${formatDate(launch.launchDate)}
                        </div>
                    </div>
                `;
            }
        });
    });
}

// Helper functions
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
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