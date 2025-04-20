import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    limit, getDocs, startAfter, onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global variables
let lastVisible = null;
const ITEMS_PER_PAGE = 12;
let currentSport = 'all';
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
        loadSportsCategories(),
        loadLiveScores(),
        loadSportsNews(),
        loadUpcomingMatches(),
        loadLeagueTables(),
        loadPlayerStats()
    ]);
}

// Load sports categories
async function loadSportsCategories() {
    const sports = [
        { id: 'cricket', name: 'Cricket', icon: 'bi-circle' },
        { id: 'football', name: 'Football', icon: 'bi-circle' },
        { id: 'tennis', name: 'Tennis', icon: 'bi-circle' },
        { id: 'f1', name: 'Formula 1', icon: 'bi-circle' }
    ];
    
    const categoriesContainer = document.getElementById('sportsCategories');
    if (categoriesContainer) {
        categoriesContainer.innerHTML = sports.map(sport => `
            <div class="sport-item" data-sport="${sport.id}">
                <i class="bi ${sport.icon}"></i>
                <span>${sport.name}</span>
            </div>
        `).join('');
    }
}

// Load live scores
async function loadLiveScores() {
    try {
        const scoresQuery = query(
            collection(db, 'live_scores'),
            where('status', '==', 'live'),
            orderBy('startTime', 'desc')
        );

        onSnapshot(scoresQuery, (snapshot) => {
            const scoresContainer = document.getElementById('liveScores');
            if (scoresContainer) {
                scoresContainer.innerHTML = snapshot.docs.map(doc => {
                    const match = doc.data();
                    return `
                        <div class="live-score-item">
                            <div class="score-header">
                                <span>${match.tournament}</span>
                                <span class="badge bg-danger">LIVE</span>
                            </div>
                            <div class="team-score">
                                <img src="${match.team1Logo}" alt="${match.team1}" class="team-logo">
                                <span>${match.team1}</span>
                                <span class="ms-auto">${match.score1}</span>
                            </div>
                            <div class="team-score">
                                <img src="${match.team2Logo}" alt="${match.team2}" class="team-logo">
                                <span>${match.team2}</span>
                                <span class="ms-auto">${match.score2}</span>
                            </div>
                            <div class="match-status mt-2">
                                <small class="text-muted">${match.status}</small>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        });
    } catch (error) {
        console.error('Error loading live scores:', error);
    }
}

// Load sports news
async function loadSportsNews(isLoadMore = false) {
    try {
        const container = document.getElementById('sportsNewsContainer');
        if (!container) return;

        let newsQuery = query(
            collection(db, 'news'),
            where('category', '==', 'sports')
        );

        if (currentSport !== 'all') {
            newsQuery = query(newsQuery, where('sport', '==', currentSport));
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
            return createSportsNewsCard(news, doc.id);
        }).join('');

        if (!isLoadMore) {
            container.innerHTML = newsHTML;
        } else {
            container.insertAdjacentHTML('beforeend', newsHTML);
        }

        updateLoadMoreButton(snapshot.docs.length);
    } catch (error) {
        console.error('Error loading sports news:', error);
    }
}

// Create sports news card
function createSportsNewsCard(news, id) {
    return `
        <div class="sports-news-card" data-aos="fade-up">
            <div class="news-image">
                <img src="${news.imageUrl}" alt="${news.title}">
                <span class="sport-badge">${news.sport}</span>
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

// Load upcoming matches
async function loadUpcomingMatches() {
    try {
        const now = new Date();
        const matchesQuery = query(
            collection(db, 'matches'),
            where('startTime', '>=', now),
            orderBy('startTime', 'asc'),
            limit(5)
        );

        const snapshot = await getDocs(matchesQuery);
        const matchesContainer = document.getElementById('upcomingMatches');
        
        if (matchesContainer) {
            matchesContainer.innerHTML = snapshot.docs.map(doc => {
                const match = doc.data();
                return `
                    <div class="match-item">
                        <div class="match-date">${formatDate(match.startTime)}</div>
                        <div class="match-teams">${match.team1} vs ${match.team2}</div>
                        <div class="match-venue">${match.venue}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading upcoming matches:', error);
    }
}

// Load league tables
async function loadLeagueTables() {
    try {
        const tablesQuery = query(
            collection(db, 'league_tables'),
            orderBy('updatedAt', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(tablesQuery);
        const tablesContainer = document.getElementById('leagueTables');
        
        if (tablesContainer && !snapshot.empty) {
            const table = snapshot.docs[0].data();
            tablesContainer.innerHTML = `
                <table class="league-table">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Team</th>
                            <th>P</th>
                            <th>GD</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${table.standings.map((team, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${team.name}</td>
                                <td>${team.played}</td>
                                <td>${team.goalDifference}</td>
                                <td>${team.points}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading league tables:', error);
    }
}

// Load player stats
async function loadPlayerStats() {
    try {
        const statsQuery = query(
            collection(db, 'player_stats'),
            orderBy('goals', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(statsQuery);
        const statsContainer = document.getElementById('playerStats');
        
        if (statsContainer) {
            statsContainer.innerHTML = snapshot.docs.map(doc => {
                const player = doc.data();
                return `
                    <div class="player-stat-item">
                        <img src="${player.photo}" alt="${player.name}" class="player-photo">
                        <div class="player-info">
                            <div class="player-name">${player.name}</div>
                            <div class="player-team">${player.team}</div>
                        </div>
                        <div class="player-stats ms-auto">
                            <div class="stat-value">${player.goals} goals</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading player stats:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Sport selection
    document.querySelectorAll('.sport-item').forEach(item => {
        item.addEventListener('click', async () => {
            currentSport = item.dataset.sport;
            document.querySelectorAll('.sport-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            await loadSportsNews();
        });
    });

    // Time filter
    document.getElementById('timeFilter')?.addEventListener('change', async (e) => {
        currentTimeFilter = e.target.value;
        await loadSportsNews();
    });

    // View toggle
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const container = document.getElementById('sportsNewsContainer');
            if (container) {
                container.className = `news-${view}`;
            }
        });
    });

    // Load more
    document.getElementById('loadMore')?.addEventListener('click', () => {
        loadSportsNews(true);
    });
}

// Start live updates
function startLiveUpdates() {
    // Live match updates
    const matchUpdatesQuery = query(
        collection(db, 'match_updates'),
        where('status', '==', 'live'),
        orderBy('timestamp', 'desc'),
        limit(1)
    );

    onSnapshot(matchUpdatesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const update = change.doc.data();
                document.getElementById('liveMatchUpdates').innerHTML = `
                    <div class="live-update-item">
                        <span class="badge bg-danger">Live Update</span>
                        <h4>${update.matchTitle}</h4>
                        <p>${update.description}</p>
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