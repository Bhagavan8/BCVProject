import { auth,db } from './firebase-config.js';
import {
    doc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    collection,
    updateDoc,
    increment,
    arrayUnion,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { ArticleNavigation } from './article-navigation.js';
import { relatedArticles } from './related-articles.js';
import { CommentsManager } from './comments.js';

// Utility functions
function showLoader() {
    const loader = document.querySelector('.loader-container');
    if (loader) loader.classList.remove('loader-hidden');
}

function hideLoader() {
    const loader = document.querySelector('.loader-container');
    if (loader) loader.classList.add('loader-hidden');
}

function formatDate(timestamp) {
    if (!timestamp) return '';

    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function setupShareButtons(newsData) {
    const shareUrl = window.location.href;
    const shareTitle = newsData.title;

    document.querySelector('.share-btn.facebook').onclick = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    document.querySelector('.share-btn.twitter').onclick = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank');
    };

    document.querySelector('.share-btn.whatsapp').onclick = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, '_blank');
    };
}



async function incrementViewCount(newsId) {
    try {
        const isLoggedIn = auth.currentUser !== null;
        
        if (!isLoggedIn) {
            const viewedNews = sessionStorage.getItem('viewedNews') || '';
            const viewedNewsArray = viewedNews.split(',');
            
            if (viewedNewsArray.includes(newsId)) {
                return;
            }
            
            viewedNewsArray.push(newsId);
            sessionStorage.setItem('viewedNews', viewedNewsArray.join(','));
        } else {
            const userViewsRef = doc(db, 'userViews', auth.currentUser.uid);
            const userViewsDoc = await getDoc(userViewsRef);
            
            if (!userViewsDoc.exists()) {
                // Create the document if it doesn't exist
                await setDoc(userViewsRef, {
                    viewedNews: [newsId]
                });
            } else if (!userViewsDoc.data().viewedNews?.includes(newsId)) {
                // Update existing document
                await updateDoc(userViewsRef, {
                    viewedNews: arrayUnion(newsId)
                });
            } else {
                return; // Already viewed
            }
        }

        // Increment view count
        const newsRef = doc(db, 'news', newsId);
        await updateDoc(newsRef, {
            views: increment(1)
        });
    } catch (error) {
        console.error('Error updating view count:', error);
    }
}


function displayNewsDetail(newsData) {
    const categoryLink = document.querySelector('.category-link');
    const newsTitle = document.querySelector('.news-title');


    if (newsTitle) {
        newsTitle.textContent = newsData.title.length > 50
            ? newsData.title.substring(0, 50) + '...'
            : newsData.title;
    }

    // Update category badge
    const categoryBadge = document.querySelector('.category-badge');
    if (categoryBadge) {
        categoryBadge.textContent = newsData.category.charAt(0).toUpperCase() + newsData.category.slice(1);
        categoryBadge.classList.add('animate-badge');
    }

    // Rest of the displayNewsDetail function remains the same
    // Update article details
    document.querySelector('.article-title').textContent = newsData.title;
    document.querySelector('.author').textContent = `By ${newsData.authorName || 'Anonymous'}`;

    const dateElement = document.querySelector('.date');
    if (dateElement && newsData.createdAt) {
        dateElement.textContent = formatDate(newsData.createdAt);
    }

    // Split content into paragraphs and add ads between them
    const paragraphs = newsData.content.split('\n\n');
    const contentContainer = document.querySelector('.article-content');
    contentContainer.innerHTML = '';

    paragraphs.forEach((paragraph, index) => {
        contentContainer.innerHTML += `<p>${paragraph}</p>`;

        // Add ad after every 3 paragraphs
        if ((index + 1) % 3 === 0 && index < paragraphs.length - 1) {
            contentContainer.innerHTML += `
                <div class="ad-space horizontal-ad my-4">
                    <div class="text-center p-3">Advertisement</div>
                </div>`;
        }
    });

    const imageContainer = document.querySelector('.featured-image-container');
    if (imageContainer && newsData.imagePath) {
        imageContainer.innerHTML = `
            <img src="${newsData.imagePath}" 
                 alt="${newsData.title}"
                 class="img-fluid rounded shadow-sm">
            <figcaption class="text-muted mt-2 text-center">
                ${newsData.imageCaption || ''}
            </figcaption>`;
    }

    setupShareButtons(newsData);
}

async function loadRelatedNews(category) {
    try {
        // Add category validation
        if (!category) {
            console.warn('Category is undefined, skipping related news load');
            return;
        }

        const relatedQuery = query(
            collection(db, 'news'),
            where('category', '==', category),
            limit(4)
        );
        const snapshot = await getDocs(relatedQuery);
        const container = document.getElementById('categoryNewsContainer');

        if (container && !snapshot.empty) {
            container.innerHTML = snapshot.docs.map(doc => {
                const news = doc.data();
                return `
                    <div class="related-news-item mb-3">
                        <a href="news-detail.html?id=${doc.id}" class="text-decoration-none">
                            <div class="d-flex align-items-center">
                                <img src="${news.imagePath || ''}" alt="${news.title}" 
                                     class="related-thumb me-3" 
                                     style="width: 100px; height: 60px; object-fit: cover;">
                                <h6 class="mb-0 text-dark">${news.title}</h6>
                            </div>
                        </a>
                    </div>`;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading related news:', error);
    }
}

async function loadLatestNews() {
    try {
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const latestQuery = query(
            collection(db, 'news'),
            where('createdAt', '>=', last24Hours),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
        const snapshot = await getDocs(latestQuery);
        const container = document.getElementById('latestNewsContainer');

        if (container && !snapshot.empty) {
            container.innerHTML = `
              
                ${snapshot.docs.map(doc => {
                    const news = doc.data();
                    return `
                        <div class="latest-news-item mb-3 p-2 border-bottom">
                            <a href="news-detail.html?id=${doc.id}" class="text-decoration-none">
                                <div class="d-flex align-items-start">
                                    <div class="latest-thumb me-3 position-relative">
                                        <img src="${news.imagePath || '/assets/images/placeholder.jpg'}" 
                                             alt="${news.title}"
                                             style="width: 100px; height: 60px; object-fit: cover; border-radius: 4px;">
                                        <span class="badge bg-primary position-absolute" 
                                              style="font-size: 0.65rem; padding: 0.2rem 0.4rem; bottom: 4px; left: 4px;">
                                          ${news.category.charAt(0).toUpperCase() + news.category.slice(1)}
                                        </span>
                                    </div>
                                    <div class="flex-grow-1">
                                        <h6 class="mb-1 text-dark">${news.title.length > 30 ? news.title.substring(0, 30) + '...' : news.title}</h6>
                                        <small class="text-muted d-inline-block" style="font-size: 0.7rem; white-space: nowrap;">
                                            <i class="bi bi-clock"></i> ${formatDate(news.createdAt)}
                                        </small>
                                    </div>
                                </div>
                            </a>
                        </div>`;
                }).join('')}`;
        } else {
            container.innerHTML = `
              
                <p class="text-muted">No recent news available</p>`;
        }
    } catch (error) {
        console.error('Error loading latest news:', error);
    }
}

async function loadPopularNews() {
    try {
        // First, get all news without the approval status filter
        const popularQuery = query(
            collection(db, 'news'),
            limit(10)
        );
        const snapshot = await getDocs(popularQuery);
        const container = document.getElementById('popularNewsContainer');

        if (container && !snapshot.empty) {
            const sortedDocs = snapshot.docs
                .filter(doc => {
                    const data = doc.data();
                    return data.views && data.approvalStatus === 'approved';
                })
                .sort((a, b) => (b.data().views || 0) - (a.data().views || 0))
                .slice(0, 5);

            container.innerHTML = sortedDocs.map((doc, index) => {
                const news = doc.data();
                return `
                    <div class="popular-news-item mb-3">
                        <a href="news-detail.html?id=${doc.id}" class="text-decoration-none">
                            <div class="d-flex align-items-center">
                                <div class="position-relative me-3">
                                    <span class="number-badge">${index + 1}</span>
                                </div>
                                <div>
                                    <h6 class="mb-1 text-dark">${news.title}</h6>
                                    <small class="text-muted">
                                        <i class="bi bi-eye"></i> ${news.views || 0} views
                                    </small>
                                </div>
                            </div>
                        </a>
                    </div>`;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading popular news:', error);
    }
}

async function loadCategoryNews(category) {
    try {
        // Add validation and debugging
        console.log('Category received:', category);
        if (!category) {
            console.warn('Category is undefined, skipping category news load');
            return;
        }

        // Modify query to use only essential filters
        const categoryQuery = query(
            collection(db, 'news'),
            where('category', '==', category),
            limit(5)
        );

        const snapshot = await getDocs(categoryQuery);
        const container = document.getElementById('categoryNewsContainer');

        if (container && !snapshot.empty) {
            container.innerHTML = `
                <h5 class="mb-3">More from ${category.charAt(0).toUpperCase() + category.slice(1)}</h5>
                ${snapshot.docs.map(doc => {
                    const news = doc.data();
                    
                    return `
                        <div class="category-news-item mb-3">
                            <a href="news-detail.html?id=${doc.id}" class="text-decoration-none">
                                <div class="d-flex align-items-center">
                                    <img src="${news.imagePath || '/assets/images/placeholder.jpg'}" 
                                         alt="${news.title}" 
                                         class="category-thumb me-3" 
                                         style="width: 80px; height: 50px; object-fit: cover;">
                                    <div>
                                        <h6 class="mb-1 text-dark">${news.title}</h6>
                                        <small class="text-muted">${formatDate(news.createdAt)}</small>
                                    </div>
                                </div>
                            </a>
                        </div>`;
                }).join('')}`;
        }
    } catch (error) {
        console.error('Error loading category news:', error);
        
    }
}


// Then update the loadNewsDetail function
async function loadNewsDetail() {
    try {
        showLoader();
        const urlParams = new URLSearchParams(window.location.search);
        const newsId = urlParams.get('id');

        if (!newsId) {
            console.warn('No news ID provided');
            window.location.href = 'index.html';
            return;
        }

        const docRef = doc(db, 'news', newsId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.warn('News document not found');
            window.location.href = 'index.html';
            return;
        }

        const newsData = {
            id: newsId,
            ...docSnap.data()
        };

        // Display the news content first
        await displayNewsDetail(newsData);

        // Initialize components after ensuring we have valid data
        const commentsManager = new CommentsManager(newsId);
        const navigation = new ArticleNavigation();

        // Use the imported relatedArticles instance
        await relatedArticles.loadRelatedArticles(newsData);

        // Only proceed with related content if we have a valid category
        if (newsData.category) {
            await Promise.all([
                loadRelatedNews(newsData.category),
                loadCategoryNews(newsData.category),
                loadLatestNews(),
                loadPopularNews(),
                incrementViewCount(newsId)
            ]);

            // Initialize comments after other content is loaded
            await commentsManager.initialize();
        } else {
            console.warn('News category is undefined');
        }
    } catch (error) {
        console.error("Error loading news:", error);
        console.log('Error details:', error.message);
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', loadNewsDetail);

// Add reading progress functionality
window.addEventListener('scroll', () => {
    const docElement = document.documentElement;
    const percentScrolled = (docElement.scrollTop / (docElement.scrollHeight - docElement.clientHeight)) * 100;
    document.documentElement.style.setProperty('--scroll', `${percentScrolled}%`);
});