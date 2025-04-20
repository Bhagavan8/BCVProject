import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    limit, getDocs, startAfter, onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let lastVisible = null;
const ITEMS_PER_PAGE = 12;
let currentTopic = 'all';
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
        loadPoliticalCategories(),
        loadPoliticalParties(),
        loadPoliticsNews(),
        loadKeyDevelopments(),
        loadOpinionPolls(),
        loadPoliticalCalendar()
    ]);
}

// Load political categories
async function loadPoliticalCategories() {
    const categories = [
        { id: 'elections', name: 'Elections', icon: 'bi-check-square' },
        { id: 'policy', name: 'Policy', icon: 'bi-file-text' },
        { id: 'parliament', name: 'Parliament', icon: 'bi-building' },
        { id: 'government', name: 'Government', icon: 'bi-flag' }
    ];
    
    const categoriesContainer = document.getElementById('politicsCategories');
    if (categoriesContainer) {
        categoriesContainer.innerHTML = categories.map(category => `
            <div class="category-item" data-category="${category.id}">
                <i class="bi ${category.icon}"></i>
                <span>${category.name}</span>
            </div>
        `).join('');
    }
}

// Load political parties
async function loadPoliticalParties() {
    try {
        const partiesQuery = query(
            collection(db, 'political_parties'),
            orderBy('name', 'asc')
        );

        const snapshot = await getDocs(partiesQuery);
        const partiesList = document.getElementById('partiesList');
        
        if (partiesList) {
            partiesList.innerHTML = snapshot.docs.map(doc => {
                const party = doc.data();
                return `
                    <div class="party-item" data-party-id="${doc.id}">
                        <img src="${party.logo}" alt="${party.name}" class="party-logo">
                        <span>${party.name}</span>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading parties:', error);
    }
}

// Load politics news
async function loadPoliticsNews(isLoadMore = false) {
    try {
        const container = document.getElementById('politicsNewsContainer');
        if (!container) return;

        let newsQuery = query(
            collection(db, 'news'),
            where('category', '==', 'politics')
        );

        if (currentTopic !== 'all') {
            newsQuery = query(newsQuery, where('topic', '==', currentTopic));
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
            return createPoliticsNewsCard(news, doc.id);
        }).join('');

        if (!isLoadMore) {
            container.innerHTML = newsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', newsHTML);
        }

        updateLoadMoreButton(snapshot.docs.length);
    } catch (error) {
        console.error('Error loading politics news:', error);
    }
}

// Create politics news card
function createPoliticsNewsCard(news, id) {
    return `
        <div class="politics-news-card" data-aos="fade-up">
            <div class="news-image">
                <img src="${news.imageUrl}" alt="${news.title}">
                <span class="topic-badge">${news.topic}</span>
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

// Load opinion polls
async function loadOpinionPolls() {
    try {
        const pollsQuery = query(
            collection(db, 'opinion_polls'),
            orderBy('date', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(pollsQuery);
        const pollsContainer = document.getElementById('opinionPolls');
        
        if (pollsContainer) {
            pollsContainer.innerHTML = snapshot.docs.map(doc => {
                const poll = doc.data();
                return `
                    <div class="poll-item">
                        <h4>${poll.question}</h4>
                        ${Object.entries(poll.results).map(([option, percentage]) => `
                            <div class="poll-option">
                                <div class="d-flex justify-content-between">
                                    <span>${option}</span>
                                    <span>${percentage}%</span>
                                </div>
                                <div class="poll-bar">
                                    <div class="poll-progress" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        `).join('')}
                        <small class="text-muted">Sample size: ${poll.sampleSize}</small>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading polls:', error);
    }
}

// Load political calendar
async function loadPoliticalCalendar() {
    try {
        const now = new Date();
        const calendarQuery = query(
            collection(db, 'political_events'),
            where('date', '>=', now),
            orderBy('date', 'asc'),
            limit(5)
        );

        const snapshot = await getDocs(calendarQuery);
        const calendarContainer = document.getElementById('politicalCalendar');
        
        if (calendarContainer) {
            calendarContainer.innerHTML = snapshot.docs.map(doc => {
                const event = doc.data();
                return `
                    <div class="calendar-event">
                        <div class="event-date">${formatDate(event.date)}</div>
                        <div class="event-title">${event.title}</div>
                        <div class="event-location">${event.location}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading calendar:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Category selection
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', async () => {
            currentTopic = item.dataset.category;
            document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            await loadPoliticsNews();
        });
    });

    // Time filter
    document.getElementById('timeFilter')?.addEventListener('change', async (e) => {
        currentTimeFilter = e.target.value;
        await loadPoliticsNews();
    });

    // View toggle
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const container = document.getElementById('politicsNewsContainer');
            if (container) {
                container.className = `news-${view}`;
            }
        });
    });

    // Load more
    document.getElementById('loadMore')?.addEventListener('click', () => {
        loadPoliticsNews(true);
    });
}

// Start live updates
function startLiveUpdates() {
    // Latest updates
    const updatesQuery = query(
        collection(db, 'news'),
        where('category', '==', 'politics'),
        where('breaking', '==', true),
        orderBy('publishedAt', 'desc'),
        limit(1)
    );

    onSnapshot(updatesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const news = change.doc.data();
                document.getElementById('politicsUpdates').innerHTML = `
                    <div class="breaking-news-item">
                        <span class="badge bg-danger">Breaking</span>
                        <h4>${news.title}</h4>
                        <p>${news.excerpt}</p>
                    </div>
                `;
            }
        });
    });

    // Key developments live updates
    const developmentsQuery = query(
        collection(db, 'key_developments'),
        where('category', '==', 'politics'),
        orderBy('timestamp', 'desc'),
        limit(5)
    );

    onSnapshot(developmentsQuery, (snapshot) => {
        const developmentsHTML = snapshot.docs.map(doc => {
            const development = doc.data();
            return `
                <div class="development-item">
                    <div class="development-time">${formatDate(development.timestamp)}</div>
                    <div class="development-content">${development.content}</div>
                </div>
            `;
        }).join('');

        document.getElementById('keyDevelopments').innerHTML = developmentsHTML;
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