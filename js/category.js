import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, limit, getDocs, 
    startAfter, updateDoc, doc, increment, addDoc,
    getDoc, serverTimestamp, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { safeGetElement } from './common.js';
import { TagsCloud } from './tags-cloud.js';

let lastVisible = null;
let currentCategory = 'all'; // Set default value
let currentView = 'grid';
const ITEMS_PER_PAGE = 10;

// User session management
function getUserToken() {
    let token = localStorage.getItem('userToken');
    if (!token) {
        token = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userToken', token);
    }
    return token;
}

// Check if user has interacted with content
async function hasUserInteracted(newsId, type) {
    try {
        const userToken = getUserToken();
        const interactionRef = collection(db, 'news', newsId, type);
        const q = query(interactionRef, where('userToken', '==', userToken));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error(`Error checking ${type} interaction:`, error);
        return false;
    }
}

// Initialize toastr with fallback
function initializeNotifications() {
    if (typeof jQuery === 'undefined') {
        console.warn('jQuery is required for notifications');
        return;
    }

    if (typeof toastr === 'undefined') {
        console.warn('Toastr is not loaded');
        return;
    }

    toastr.options = {
        closeButton: true,
        newestOnTop: true,
        progressBar: true,
        positionClass: "toast-top-right",
        timeOut: 3000
    };
}

// Update showNotification function
function showNotification(message, type = 'info') {
    if (typeof toastr !== 'undefined' && typeof jQuery !== 'undefined') {
        toastr[type](message);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
       
        AOS.init();
        
       
        const urlParams = new URLSearchParams(window.location.search);
        currentCategory = urlParams.get('category') || currentCategory; // Use default if not in URL
        
        // Set category title
        const categoryTitle = document.getElementById('categoryTitle');
        if (categoryTitle) {
            categoryTitle.textContent = 
                currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1) + ' News';
        }
        console.log(currentCategory);
        // Initialize event listeners
        initializeEventListeners();
        
        // Load initial data
        await Promise.all([
            loadCategoryNews(),
            loadMostReadNews(),
            loadLatestNews(),
            loadPopularTags(),
            updateMetaStats()
        ]);
        
        // Add this: Make sure all category links work
        document.querySelectorAll('.view-all').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.closest('.category-section').id.replace('News', '').toLowerCase();
                window.location.href = `/category.html?category=${category}`;
            });
        });
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize page', 'error');
    }
    const tagsCloud = new TagsCloud();
    await tagsCloud.init();
});

// Update the event listeners initialization
function initializeEventListeners() {
    // Store event listeners for cleanup
    const listeners = new Map();

    // Sort options
    const sortSelect = document.getElementById('sortOptions');
    if (sortSelect) {
        sortSelect.addEventListener('change', async () => {
            await refreshNews();
        });
    }

    // Time range
    const timeSelect = document.getElementById('timeRange');
    if (timeSelect) {
        timeSelect.addEventListener('change', async () => {
            await refreshNews();
        });
    }

    // View options
    const viewButtons = document.querySelectorAll('.btn-view');
    viewButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const view = btn.dataset.view;
                const container = document.getElementById('newsContainer');
                if (container) {
                    container.className = `news-${view}`;
                }
            });
        }
    });

    // Load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreNews);
    }

    // Newsletter form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', handleNewsletterSubmit);
    }

    // Refresh button
    const refreshBtn = document.querySelector('.btn-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.style.transform = 'rotate(360deg)';
            await loadLatestNews();
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        });
    }

    // Add like button event listeners
    document.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('.btn-like');
        if (likeBtn) {
            const newsId = likeBtn.dataset.newsId;
            try {
                const newsRef = doc(db, 'news', newsId);
                const userToken = getUserToken();
                
                // Check if user already liked
                const hasLiked = await hasUserInteracted(newsId, 'likes');
                if (hasLiked) {
                    // Unlike the post
                    const likesRef = collection(db, 'news', newsId, 'likes');
                    const q = query(likesRef, where('userToken', '==', userToken));
                    const snapshot = await getDocs(q);
                    
                    await deleteDoc(snapshot.docs[0].ref);
                    await updateDoc(newsRef, {
                        likes: increment(-1)
                    });
                    
                    const likeIcon = likeBtn.querySelector('i');
                    likeIcon.classList.remove('bi-heart-fill');
                    likeIcon.classList.add('bi-heart');
                    
                    showNotification('Post unliked', 'info');
                } else {
                    // Like the post
                    const likesRef = collection(db, 'news', newsId, 'likes');
                    await addDoc(likesRef, {
                        userToken,
                        timestamp: serverTimestamp()
                    });
                    
                    await updateDoc(newsRef, {
                        likes: increment(1),
                        lastLikedAt: serverTimestamp()
                    });
                    
                    const likeIcon = likeBtn.querySelector('i');
                    likeIcon.classList.remove('bi-heart');
                    likeIcon.classList.add('bi-heart-fill');
                    
                    showNotification('Thanks for liking!', 'success');
                }
                
                // Update like count
                const likeCount = likeBtn.querySelector('span');
                const newsDoc = await getDoc(newsRef);
                likeCount.textContent = formatNumber(newsDoc.data().likes || 0);
                
            } catch (error) {
                console.error('Error liking news:', error);
                showNotification('Unable to process your request. Please try again later.', 'error');
            }
        }
    });
    // Cleanup function
    return function cleanup() {
        listeners.forEach((listener, element) => {
            element.removeEventListener(listener.type, listener.handler);
        });
    };
}


// Update loadCategoryNews function
async function loadCategoryNews(isLoadMore = false) {
    try {
        const container = safeGetElement('newsContainer');
        const loadMoreBtn = safeGetElement('loadMoreBtn');
        const sortSelect = safeGetElement('sortOptions');
        const timeSelect = safeGetElement('timeRange');
        
        if (!container || !sortSelect || !timeSelect) {
            console.warn('Required elements not found');
            return;
        }

        const sortOption = sortSelect.value;
        const timeRange = timeSelect.value;
        
        const baseQuery = collection(db, 'news');
        let newsQuery;

        // Base conditions that apply to all queries
        let conditions = [
            where('approvalStatus', '==', 'approved')
        ];

        // Add category-specific conditions
        switch(currentCategory) {
            case 'featured':
                conditions.push(where('section', '==', 'featured'));
                break;
            case 'recent':
                const last24Hours = new Date();
                last24Hours.setHours(last24Hours.getHours() - 24);
                conditions.push(where('createdAt', '>=', last24Hours));
                conditions.push(where('section', '==', 'recent'));
                break;
            case 'entertainment':
                conditions.push(where('section', '==', 'entertainment'));
                break;
            case 'tips':
                conditions.push(where('section', '==', 'tips'));
                break;
            case 'stories':
                conditions.push(where('section', '==', 'stories'));
                break;
            case 'general':
                conditions.push(where('section', '==', 'general'));
                break;
            default:
                if (currentCategory) {
                    conditions.push(where('section', '==', currentCategory));
                }
        }

        // Apply time range filter if not in recent category
        if (timeRange !== 'all' && currentCategory !== 'recent') {
            const date = new Date();
            if (timeRange === 'today') date.setHours(0, 0, 0, 0);
            if (timeRange === 'week') date.setDate(date.getDate() - 7);
            if (timeRange === 'month') date.setMonth(date.getMonth() - 1);
            conditions.push(where('createdAt', '>=', date));
        }

        // Apply sorting
        if (sortOption === 'popular') {
            newsQuery = query(
                baseQuery,
                ...conditions,
                orderBy('views', 'desc')
            );
        } else if (sortOption === 'trending') {
            newsQuery = query(
                baseQuery,
                ...conditions,
                orderBy('likes', 'desc')
            );
        } else {
            // Default sorting by creation date
            newsQuery = query(
                baseQuery,
                ...conditions,
                orderBy('createdAt', 'desc')
            );
        }

        // Add pagination
        newsQuery = query(newsQuery, limit(ITEMS_PER_PAGE));
        if (isLoadMore && lastVisible) {
            newsQuery = query(newsQuery, startAfter(lastVisible));
        }

        const snapshot = await getDocs(newsQuery);
        lastVisible = snapshot.docs[snapshot.docs.length - 1];

        if (snapshot.empty) {
            container.innerHTML = '<div class="no-news">No news articles found in this category.</div>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const newsItems = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));

        if (!isLoadMore) {
            renderNews(newsItems);
        } else {
            const existingNews = Array.from(container.children);
            renderNews([...existingNews, ...newsItems]);
        }

        if (loadMoreBtn) {
            loadMoreBtn.style.display = 
                snapshot.docs.length < ITEMS_PER_PAGE ? 'none' : 'block';
        }

    } catch (error) {
        console.error('Error loading news:', error);
        toastr.error('Failed to load news');
    }
}

// Update renderNews function to use createNewsCard
function renderNews(newsItems) {
    const newsContainer = document.getElementById('newsContainer');
    const newsElements = newsItems.map((news, index) => {
        return createNewsCard(news, news.id, index);
    });

    // Insert ads into the news grid
    const newsWithAds = insertAdsIntoGrid(newsElements);
    newsContainer.innerHTML = newsWithAds.join('');
}

function createNewsCard(news, id, index) {
    // Track view if not already viewed
    trackView(id);
    
    return `
        <article class="news-item" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="news-card">
                <div class="news-image">
                    <img src="${news.imagePath}" alt="${news.title}">
                    <span class="news-category">${news.category}</span>
                </div>
                <div class="news-content">
                    <div class="news-meta">
                        <span><i class="bi bi-clock-fill"></i> ${formatDate(news.createdAt)}</span>
                        <span><i class="bi bi-person-fill"></i> ${news.authorName}</span>
                    </div>
                    <h3 class="news-title" title="${news.title}">${news.title}</h3>
                    <p class="news-excerpt">${news.content.substring(0, 100)}...</p>
                    <div class="news-footer">
                        <div class="news-stats">
                            <button class="btn-stat" title="Views">
                                <i class="bi bi-eye-fill"></i>
                                <span>${formatNumber(news.views || 0)}</span>
                            </button>
                            <button class="btn-stat btn-like" data-news-id="${id}" title="Like">
                                <i class="bi bi-heart${news.liked ? '-fill' : ''}"></i>
                                <span>${formatNumber(news.likes || 0)}</span>
                            </button>
                            <button class="btn-stat btn-share" onclick="shareNews('${id}', '${news.title}')" title="Share">
                                <i class="bi bi-share-fill"></i>
                            </button>
                        </div>
                        <a href="news-detail.html?id=${id}" class="btn-read" title="Read More">
                            Read More <i class="bi bi-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        </article>
    `;
}

// Add view tracking function
async function trackView(newsId) {
    try {
        const hasViewed = await hasUserInteracted(newsId, 'views');
        if (!hasViewed) {
            const userToken = getUserToken();
            const viewsRef = collection(db, 'news', newsId, 'views');
            const newsRef = doc(db, 'news', newsId);
            
            await addDoc(viewsRef, {
                userToken,
                timestamp: serverTimestamp()
            });
            
            await updateDoc(newsRef, {
                views: increment(1)
            });
        }
    } catch (error) {
        console.error('Error tracking view:', error);
    }
}

async function handleLike(newsId) {
    try {
        const newsRef = doc(db, 'news', newsId);
        await updateDoc(newsRef, {
            likes: increment(1)
        });
        // Update UI
        const likeBtn = document.querySelector(`[onclick="handleLike('${newsId}')"]`);
        const likeIcon = likeBtn.querySelector('i');
        likeIcon.classList.remove('bi-heart');
        likeIcon.classList.add('bi-heart-fill');
    } catch (error) {
        console.error('Error liking news:', error);
    }
}

function shareNews(newsId, title) {
    const url = `${window.location.origin}/news-detail.html?id=${newsId}`;
    if (navigator.share) {
        navigator.share({
            title: title,
            url: url
        }).catch(err => console.warn('Share failed:', err));
    } else {
        // Remove existing dialogs
        const existingDialog = document.querySelector('.share-dialog');
        if (existingDialog) existingDialog.remove();

        // Create new dialog
        const shareDialog = document.createElement('div');
        shareDialog.className = 'share-dialog';
        shareDialog.innerHTML = `
            <div class="share-options">
                <button class="close-dialog">&times;</button>
                <a href="https://facebook.com/share.php?u=${encodeURIComponent(url)}" target="_blank">
                    <i class="bi bi-facebook"></i> Facebook
                </a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}" target="_blank">
                    <i class="bi bi-twitter"></i> Twitter
                </a>
                <a href="https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}" target="_blank">
                    <i class="bi bi-whatsapp"></i> WhatsApp
                </a>
            </div>
        `;

        document.body.appendChild(shareDialog);

        // Close dialog handlers
        const closeBtn = shareDialog.querySelector('.close-dialog');
        closeBtn.addEventListener('click', () => shareDialog.remove());
        
        document.addEventListener('click', (e) => {
            if (!shareDialog.contains(e.target)) {
                shareDialog.remove();
            }
        }, { once: true });
    }
}

// Make shareNews globally available
window.shareNews = shareNews;

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Utility function to safely execute async functions
async function safeExecute(func, errorMessage) {
    try {
        await func();
    } catch (error) {
        console.error(errorMessage, error);
        toastr.error(errorMessage);
    }
}

// Update refresh news function
async function refreshNews() {
    lastVisible = null;
    await loadCategoryNews();
    await Promise.all([
        loadCategoryNews(),
        updateMetaStats()  // Add this line
    ]);
    await safeExecute(loadCategoryNews, 'Failed to refresh news');
}

// Update load more function
async function loadMoreNews() {
    await safeExecute(() => loadCategoryNews(true), 'Failed to load more news');
}



// Handle newsletter subscription
async function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    try {
        await addDoc(collection(db, 'newsletters'), {
            email,
            category: currentCategory,
            subscribedAt: new Date()
        });
        alert('Successfully subscribed to newsletter!');
        e.target.reset();
    } catch (error) {
        console.error('Error subscribing to newsletter:', error);
        alert('Failed to subscribe. Please try again.');
    }
}

async function loadMostReadNews() {
    try {
        const mostReadQuery = query(
            collection(db, 'news'),
            where('approvalStatus', '==', 'approved'),
            orderBy('views', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(mostReadQuery);
        const container = document.getElementById('mostReadNews');

        if (container && !snapshot.empty) {
            container.innerHTML = snapshot.docs.map((doc, index) => {
                const news = doc.data();
                return `
                    <div class="trending-item" data-aos="fade-left" data-aos-delay="${index * 100}">
                        <span class="trending-number">${index + 1}</span>
                        <div class="trending-content">
                            <h4 class="trending-title">
                                <a href="news-detail.html?id=${doc.id}" title="${news.title}">
                                    ${news.title.length > 40 ? news.title.substring(0, 40) + '...' : news.title}
                                </a>
                            </h4>
                            <div class="trending-meta">
                                <span><i class="bi bi-eye"></i> ${formatNumber(news.views || 0)}</span>
                                <span><i class="bi bi-clock"></i> ${formatDate(news.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading most read news:', error);
    }
}

async function loadLatestNews() {
    try {
        const latestQuery = query(
            collection(db, 'news'),
            where('approvalStatus', '==', 'approved'),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const snapshot = await getDocs(latestQuery);
        const container = document.getElementById('latestNews');

        if (container && !snapshot.empty) {
            container.innerHTML = snapshot.docs.map((doc, index) => {
                const news = doc.data();
                return `
                    <div class="latest-item" data-aos="fade-left" data-aos-delay="${index * 100}">
                        <div class="latest-image">
                            <img src="${news.imagePath}" alt="${news.title}">
                            <span class="latest-category">${news.category}</span>
                        </div>
                        <div class="latest-content">
                            <h4 class="latest-title">
                                <a href="news-detail.html?id=${doc.id}">${news.title}</a>
                            </h4>
                            <span class="latest-date">
                                <i class="bi bi-clock"></i> ${formatDate(news.createdAt)}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading latest news:', error);
    }
}

async function loadPopularTags() {
    try {
        const tagsQuery = query(
            collection(db, 'tags'),
            orderBy('count', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(tagsQuery);
        const container = document.getElementById('tagsCloud');

        if (container && !snapshot.empty) {
            container.innerHTML = snapshot.docs.map(doc => {
                const tag = doc.data();
                return `
                    <a href="category.html?tag=${doc.id}" class="tag">
                        ${doc.id} <span class="tag-count">${tag.count}</span>
                    </a>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading popular tags:', error);
    }
}

// Function to format time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };

    for (let [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval > 1) {
            return `${interval} ${unit}s ago`;
        } else if (interval === 1) {
            return `${interval} ${unit} ago`;
        }
    }
    return 'just now';
}

// Function to render latest news
async function renderLatestNews() {
    try {
        const latestNewsContainer = document.getElementById('latestNews');
        if (!latestNewsContainer) return;

        // Fetch latest news from your Firebase/API
        const latestNews = await fetchLatestNews(); // Implement this function

        const newsHTML = latestNews.map(news => `
            <div class="latest-item" data-aos="fade-left">
                <div class="latest-image">
                    <img src="${news.imageUrl}" alt="${news.title}">
                    ${news.isNew ? '<span class="latest-badge">New</span>' : ''}
                    <span class="time-badge">${timeAgo(new Date(news.publishedAt))}</span>
                </div>
                <div class="latest-content">
                    <div class="latest-meta">
                        <span class="category-tag">${news.category}</span>
                        <span class="read-time">${news.readTime} min read</span>
                    </div>
                    <h4 class="latest-title">
                        <a href="/news/${news.slug}">${news.title}</a>
                    </h4>
                    <div class="latest-stats">
                        <span><i class="bi bi-eye"></i> ${formatNumber(news.views)}</span>
                        <span><i class="bi bi-chat"></i> ${formatNumber(news.comments)}</span>
                        <span class="bookmark-btn" data-id="${news.id}">
                            <i class="bi bi-bookmark${news.isBookmarked ? '-fill' : ''}"></i>
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        latestNewsContainer.innerHTML = newsHTML;

        // Initialize bookmark functionality
        initializeBookmarks();
    } catch (error) {
        console.error('Error rendering latest news:', error);
        toastr.error('Failed to load latest news');
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
    return num.toString();
}

// Initialize bookmark functionality
function initializeBookmarks() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            try {
                const newsId = btn.dataset.id;
                const icon = btn.querySelector('i');
                const isCurrentlyBookmarked = icon.classList.contains('bi-bookmark-fill');
                
                await toggleBookmark(newsId, !isCurrentlyBookmarked); // Implement this function
                
                icon.classList.toggle('bi-bookmark');
                icon.classList.toggle('bi-bookmark-fill');
                
                toastr.success(`Article ${isCurrentlyBookmarked ? 'removed from' : 'added to'} bookmarks`);
            } catch (error) {
                console.error('Error toggling bookmark:', error);
                toastr.error('Failed to update bookmark');
            }
        });
    });
}
// Add this function to update meta stats
async function updateMetaStats() {
    try {
        const newsRef = collection(db, 'news');
        let q = query(newsRef);
        
        if (currentCategory !== 'all') {
            q = query(newsRef, where('section', '==', currentCategory));
        }
        
        const snapshot = await getDocs(q);
        
        const totalArticles = document.getElementById('totalArticles');
        if (totalArticles) {
            totalArticles.innerHTML = `
                <i class="bi bi-newspaper"></i> ${snapshot.size} Articles
            `;
        }
        
        const categoryDate = document.querySelector('.category-date');
        if (categoryDate && snapshot.size > 0) {
            const latestArticle = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return data.createdAt;
                })
                .filter(Boolean)
                .sort((a, b) => b.seconds - a.seconds)[0];
                
            if (latestArticle) {
                categoryDate.textContent = `Updated ${formatDate(latestArticle)}`;
            }
        }
    } catch (error) {
        console.error('Error updating meta stats:', error);
    }
}
function insertAdsIntoGrid(newsHTML) {
    const adTemplate = document.getElementById('adTemplate').content;
    const newsArray = Array.from(newsHTML);
    
    // Insert an ad after every 3 news items
    for (let i = 3; i < newsArray.length; i += 4) {
        const adClone = adTemplate.cloneNode(true);
        newsArray.splice(i, 0, adClone);
    }
    
    return newsArray;
}

