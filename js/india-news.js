import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    limit, getDocs, startAfter, onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let lastVisible = null;
const ITEMS_PER_PAGE = 12;
let currentState = 'all';
let currentCategory = 'all';
let currentTimeFilter = 'latest';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load navigation
        await loadNavigation();
        
        // Initialize components
        await initializeComponents();
        
        // Initialize event listeners
        initializeEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Load states list
async function loadStates() {
    const states = [
        'Andhra Pradesh', 'Delhi', 'Karnataka', 'Maharashtra', 
        'Tamil Nadu', 'Uttar Pradesh', // Add more states
    ];
    
    const statesList = document.getElementById('statesList');
    if (statesList) {
        statesList.innerHTML = states.map(state => `
            <div class="state-item" data-state="${state}">
                ${state}
            </div>
        `).join('');
    }
}

// Load news articles
async function loadNews(isLoadMore = false) {
    try {
        const container = document.getElementById('newsContainer');
        if (!container) return;

        let newsQuery = query(
            collection(db, 'news'),
            where('country', '==', 'india')
        );

        // Apply filters
        if (currentState !== 'all') {
            newsQuery = query(newsQuery, where('state', '==', currentState));
        }
        if (currentCategory !== 'all') {
            newsQuery = query(newsQuery, where('category', '==', currentCategory));
        }

        // Apply time filter
        if (currentTimeFilter !== 'latest') {
            const date = new Date();
            if (currentTimeFilter === '24h') date.setDate(date.getDate() - 1);
            if (currentTimeFilter === 'week') date.setDate(date.getDate() - 7);
            newsQuery = query(newsQuery, where('publishedAt', '>=', date));
        }

        // Add sorting and pagination
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

        // Update load more button visibility
        const loadMoreBtn = document.getElementById('loadMore');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = snapshot.docs.length < ITEMS_PER_PAGE ? 'none' : 'block';
        }

    } catch (error) {
        console.error('Error loading news:', error);
    }
}

// Create news card HTML
function createNewsCard(news, id) {
    return `
        <div class="news-card" data-aos="fade-up">
            <div class="news-image">
                <img src="${news.imageUrl}" alt="${news.title}">
                <span class="news-category">${news.category}</span>
            </div>
            <div class="news-content">
                <div class="news-meta">
                    <span>${formatDate(news.publishedAt)}</span>
                    <span>${news.state}</span>
                </div>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.excerpt}</p>
                <a href="article.html?id=${id}" class="btn btn-primary btn-sm">Read More</a>
            </div>
        </div>
    `;
}

// Initialize event listeners
function initializeEventListeners() {
    // State filter
    document.querySelectorAll('.state-item').forEach(item => {
        item.addEventListener('click', async () => {
            currentState = item.dataset.state;
            document.querySelectorAll('.state-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            await loadNews();
        });
    });

    // Category filter
    document.getElementById('categoryFilter')?.addEventListener('change', async (e) => {
        currentCategory = e.target.value;
        await loadNews();
    });

    // Time filter
    document.getElementById('timeFilter')?.addEventListener('change', async (e) => {
        currentTimeFilter = e.target.value;
        await loadNews();
    });

    // View toggle
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const container = document.getElementById('newsContainer');
            if (container) {
                container.className = `news-${view}`;
            }
        });
    });

    // Load more
    document.getElementById('loadMore')?.addEventListener('click', () => {
        loadNews(true);
    });
}

// Helper functions
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Load navigation
async function loadNavigation() {
    const nav = document.getElementById('navigation');
    if (nav) {
        const response = await fetch('components/navigation.html');
        nav.innerHTML = await response.text();
    }
}

// Add these functions before initializeComponents
async function loadIndiaNews() {
    await loadNews();
}

async function loadStateNews() {
    await loadStates();
}

async function loadTrendingTopics() {
    try {
        // Fallback data
        const fallbackTopics = [
            { name: 'Elections', count: 245 },
            { name: 'Economy', count: 180 },
            { name: 'Technology', count: 156 },
            { name: 'Education', count: 134 },
            { name: 'Healthcare', count: 98 }
        ];

        const trendingContainer = document.getElementById('trendingTopics');
        if (trendingContainer) {
            // Try to fetch from Firebase first
            try {
                const trendingQuery = query(
                    collection(db, 'trending_topics'),
                    orderBy('count', 'desc'),
                    limit(5)
                );
                const snapshot = await getDocs(trendingQuery);
                
                if (!snapshot.empty) {
                    trendingContainer.innerHTML = snapshot.docs.map(doc => {
                        const topic = doc.data();
                        return `
                            <div class="trending-item">
                                <span class="trending-topic">#${topic.name}</span>
                                <span class="trending-count">${topic.count} stories</span>
                            </div>
                        `;
                    }).join('');
                    return; // Exit if Firebase data loaded successfully
                }
            } catch (firebaseError) {
                console.warn('Firebase fetch failed, using fallback data:', firebaseError);
            }

            // Use fallback data if Firebase fails
            trendingContainer.innerHTML = fallbackTopics.map(topic => `
                <div class="trending-item">
                    <span class="trending-topic">#${topic.name}</span>
                    <span class="trending-count">${topic.count} stories</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading trending topics:', error);
    }
}

async function loadCategories() {
    try {
        const categories = [
            { id: 'politics', name: 'Politics' },
            { id: 'business', name: 'Business' },
            { id: 'technology', name: 'Technology' },
            { id: 'entertainment', name: 'Entertainment' },
            { id: 'sports', name: 'Sports' },
            { id: 'health', name: 'Health' }
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

async function initializeComponents() {
    await Promise.all([
        loadCategories(),
        loadIndiaNews(),
        loadStateNews(),
        loadTrendingTopics()
        // Remove or comment out loadBreakingNews if not defined
        // loadBreakingNews
    ]);
}

// Add the missing function
async function loadBreakingNews() {
    try {
        const breakingQuery = query(
            collection(db, 'news'),
            where('category', '==', 'india'),
            where('breaking', '==', true),
            orderBy('publishedAt', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(breakingQuery);
        const breakingNews = document.getElementById('breakingNews');
        
        if (breakingNews && !snapshot.empty) {
            const news = snapshot.docs[0].data();
            breakingNews.innerHTML = `
                <div class="breaking-news-item">
                    <span class="badge bg-danger">Breaking</span>
                    <h4>${news.title}</h4>
                    <p>${news.excerpt}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading breaking news:', error);
    }
}