import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    limit, getDocs, doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class RelatedArticles {
    constructor() {
        this.db = db;
        this.initialize();
    }

    async initialize() {
        // Get the current article ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');
        
        if (articleId) {
            // Get the current article data first
            const articleDoc = await getDoc(doc(this.db, 'news', articleId));
            if (articleDoc.exists()) {
                const newsData = articleDoc.data();
                await this.loadRelatedArticles(newsData);
            }
        }
    }

    async loadRelatedArticles(newsData) {
        try {
            if (!newsData || !newsData.category) {
                console.warn('Invalid news data for related articles');
                return;
            }

            console.log(newsData.category);
            const relatedQuery = query(
                collection(this.db, 'news'),
                where('category', '==', newsData.category),
                orderBy('createdAt', 'desc'),
                limit(4)
            );

            const snapshot = await getDocs(relatedQuery);
            const container = document.getElementById('relatedArticlesContainer');
            
            if (container && !snapshot.empty) {
                container.innerHTML = snapshot.docs
                    .filter(doc => doc.id !== newsData.id)
                    .map(doc => {
                        const news = doc.data();
                        return `
                            <div class="col-md-6 col-lg-3 mb-4">
                                <a href="news-detail.html?id=${doc.id}" class="text-decoration-none article-link">
                                    <div class="d-flex flex-column">
                                        <div class="image-wrapper position-relative mb-3">
                                            <img src="${news.imagePath || ''}" 
                                                 alt="${news.title}" 
                                                 class="img-fluid w-100"
                                                 style="height: 200px; object-fit: cover;">
                                            <span class="category-label position-absolute top-0 start-0 m-2 px-2 py-1 bg-primary text-white small">
                                                ${news.category}
                                            </span>
                                        </div>
                                        <div class="article-info">
                                            <h5 class="article-title fw-semibold text-dark mb-2 line-clamp-2" 
                                                style="font-size: 1.1rem; line-height: 1.5;">
                                                ${news.title}
                                            </h5>
                                            <div class="meta-info d-flex align-items-center">
                                                <span class="text-muted small">
                                                    <i class="bi bi-calendar-event me-1"></i>
                                                    ${new Date(news.createdAt?.toDate()).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            </div>`;
                    }).join('');
            } else {
                console.log('No related articles found or container missing'); // Debug log
            }
        } catch (error) {
            console.error('Error loading related articles:', error);
        }
    }
}

// Create and export a single instance
export const relatedArticles = new RelatedArticles();