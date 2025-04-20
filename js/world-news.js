import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    limit, getDocs, startAfter, onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let lastVisible = null;
const ITEMS_PER_PAGE = 12;
let currentRegion = 'all';
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
        loadRegions(),
        loadCurrencyRates(),
        loadWorldNews(),
        loadGlobalHeadlines(),
        loadWorldMarkets()
    ]);
}

// Load regions
async function loadRegions() {
    const regions = [
        { id: 'americas', name: 'Americas', icon: 'bi-globe-americas' },
        { id: 'europe', name: 'Europe', icon: 'bi-globe-europe-africa' },
        { id: 'asia', name: 'Asia Pacific', icon: 'bi-globe-asia-australia' },
        { id: 'middleeast', name: 'Middle East', icon: 'bi-globe-central-south-asia' },
        { id: 'africa', name: 'Africa', icon: 'bi-globe-europe-africa' }
    ];
    
    const regionsList = document.getElementById('regionsList');
    if (regionsList) {
        regionsList.innerHTML = regions.map(region => `
            <div class="region-item" data-region="${region.id}">
                <i class="bi ${region.icon}"></i>
                <span>${region.name}</span>
            </div>
        `).join('');
    }
}

// Load world news
async function loadWorldNews(isLoadMore = false) {
    try {
        const container = document.getElementById('worldNewsContainer');
        if (!container) return;

        let newsQuery = query(
            collection(db, 'news'),
            where('category', '==', 'world')
        );

        if (currentRegion !== 'all') {
            newsQuery = query(newsQuery, where('region', '==', currentRegion));
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
            return createWorldNewsCard(news, doc.id);
        }).join('');

        if (!isLoadMore) {
            container.innerHTML = newsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', newsHTML);
        }

        updateLoadMoreButton(snapshot.docs.length);
    } catch (error) {
        console.error('Error loading world news:', error);
    }
}

// Create world news card
function createWorldNewsCard(news, id) {
    return `
        <div class="world-news-card" data-aos="fade-up">
            <div class="news-image">
                <img src="${news.imageUrl}" alt="${news.title}">
                <span class="region-badge">${news.region}</span>
            </div>
            <div class="news-content">
                <div class="news-meta">
                    <span><i class="bi bi-clock"></i> ${formatDate(news.publishedAt)}</span>
                    <span><i class="bi bi-geo-alt"></i> ${news.country}</span>
                </div>
                <h3 class="news-title">${news.title}</h3>
                <p class="news-excerpt">${news.excerpt}</p>
                <a href="article.html?id=${id}" class="btn btn-primary btn-sm">Read More</a>
            </div>
        </div>
    `;
}

// Load currency rates
async function loadCurrencyRates() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        
        const currencies = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
        const ratesHTML = currencies.map(currency => `
            <div class="currency-item">
                <span>${currency}/USD</span>
                <span>${data.rates[currency]}</span>
            </div>
        `).join('');
        
        document.getElementById('currencyRates').innerHTML = ratesHTML;
    } catch (error) {
        console.error('Error loading currency rates:', error);
    }
}

// Load world markets
async function loadWorldMarkets() {
    const markets = document.getElementById('worldMarkets');
    if (!markets) return;

    // Real-time market updates
    const marketsQuery = query(
        collection(db, 'markets'),
        orderBy('timestamp', 'desc'),
        limit(5)
    );

    onSnapshot(marketsQuery, (snapshot) => {
        const marketsHTML = snapshot.docs.map(doc => {
            const market = doc.data();
            const changeClass = market.change >= 0 ? 'positive' : 'negative';
            const changeIcon = market.change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down';
            
            return `
                <div class="market-item">
                    <span>${market.name}</span>
                    <span class="market-change ${changeClass}">
                        <i class="bi ${changeIcon}"></i>
                        ${market.change}%
                    </span>
                </div>
            `;
        }).join('');

        markets.innerHTML = marketsHTML;
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Region filter
    document.querySelectorAll('.region-item').forEach(item => {
        item.addEventListener('click', async () => {
            currentRegion = item.dataset.region;
            document.querySelectorAll('.region-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            await loadWorldNews();
        });
    });

    // Time filter
    document.getElementById('timeFilter')?.addEventListener('change', async (e) => {
        currentTimeFilter = e.target.value;
        await loadWorldNews();
    });

    // View toggle
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const container = document.getElementById('worldNewsContainer');
            if (container) {
                container.className = `news-${view}`;
            }
        });
    });

    // Load more
    document.getElementById('loadMore')?.addEventListener('click', () => {
        loadWorldNews(true);
    });
}

// Start live updates
function startLiveUpdates() {
    // Breaking news updates
    const breakingQuery = query(
        collection(db, 'news'),
        where('category', '==', 'world'),
        where('breaking', '==', true),
        orderBy('publishedAt', 'desc'),
        limit(1)
    );

    onSnapshot(breakingQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const news = change.doc.data();
                document.getElementById('globalBreaking').innerHTML = `
                    <div class="breaking-news-item">
                        <span class="badge bg-danger">Breaking</span>
                        <h4>${news.title}</h4>
                        <p>${news.excerpt}</p>
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