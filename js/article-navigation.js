import { db } from './firebase-config.js';
import { 
    collection, query, where, orderBy, 
    getDocs, doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class ArticleNavigation {
    constructor() {
        this.prevButton = document.getElementById('prevArticle');
        this.nextButton = document.getElementById('nextArticle');
        this.bindEvents();
    }

    bindEvents() {
        if (this.prevButton) {
            this.prevButton.addEventListener('click', (e) => {
                const newsId = this.prevButton.dataset.newsId;
                if (newsId) {
                    window.location.href = `news-detail.html?id=${newsId}`;
                }
            });
        }

        if (this.nextButton) {
            this.nextButton.addEventListener('click', (e) => {
                const newsId = this.nextButton.dataset.newsId;
                if (newsId) {
                    window.location.href = `news-detail.html?id=${newsId}`;
                }
            });
        }
    }

    async loadNavigation(currentNewsId) {
        try {
            const currentDoc = await getDoc(doc(db, 'news', currentNewsId));
            if (!currentDoc.exists()) {
                console.log('Current document does not exist');
                return;
            }
            const currentData = currentDoc.data();
            // Simplified query to debug
            const articlesQuery = query(
                collection(db, 'news'),
                where('category', '==', currentData.category)
                // Temporarily removed other conditions to test
            );
            
            const querySnapshot = await getDocs(articlesQuery);
            // Check each document's data
            querySnapshot.forEach(doc => {
                console.log('Document data:', {
                    id: doc.id,
                    ...doc.data()
                });
            });

            const articles = querySnapshot.docs.map(doc => ({
                id: doc.id,
                title: doc.data().title,
                category: doc.data().category,
                status: doc.data().status, // Added for debugging
                createdAt: doc.data().createdAt
            }));

            const currentIndex = articles.findIndex(article => article.id === currentNewsId);
            
            if (currentIndex !== -1) {
                if (currentIndex < articles.length - 1) {
                    const prevArticle = articles[currentIndex + 1];
                    this.prevButton.dataset.newsId = prevArticle.id;
                    this.prevButton.querySelector('.nav-title').textContent = prevArticle.title;
                    this.prevButton.querySelector('.nav-category').textContent = prevArticle.category;
                    this.prevButton.style.display = 'block';
                    
                } else {
                    this.prevButton.style.display = 'none';
                    console.log('No previous article available');
                }

                if (currentIndex > 0) {
                    const nextArticle = articles[currentIndex - 1];
                    this.nextButton.dataset.newsId = nextArticle.id;
                    this.nextButton.querySelector('.nav-title').textContent = nextArticle.title;
                    this.nextButton.querySelector('.nav-category').textContent = nextArticle.category;
                    this.nextButton.style.display = 'block';
                   
                } else {
                    this.nextButton.style.display = 'none';
                    console.log('No next article available');
                }
            }
        } catch (error) {
            console.error('Error in loadNavigation:', error);
            throw error; // Re-throw to see the full error stack
        }
    }
}
    