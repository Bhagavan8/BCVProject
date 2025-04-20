import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class ArticleNavigation {
    static async loadAdjacentArticles() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const currentId = urlParams.get('id');
            
            if (!currentId) return;

            // Get current article's timestamp
            const currentArticleRef = doc(db, 'news', currentId);
            const currentArticleSnap = await getDoc(currentArticleRef);
            const currentArticle = currentArticleSnap.data();
            const currentTimestamp = currentArticle.createdAt;

            // Query for previous article
            const prevQuery = query(
                collection(db, 'news'),
                where('approvalStatus', '==', 'approved'),
                where('createdAt', '<', currentTimestamp),
                orderBy('createdAt', 'desc'),
                limit(1)
            );

            // Query for next article
            const nextQuery = query(
                collection(db, 'news'),
                where('approvalStatus', '==', 'approved'),
                where('createdAt', '>', currentTimestamp),
                orderBy('createdAt', 'asc'),
                limit(1)
            );

            const [prevSnapshot, nextSnapshot] = await Promise.all([
                getDocs(prevQuery),
                getDocs(nextQuery)
            ]);

            this.updateNavigationUI(prevSnapshot, nextSnapshot);
        } catch (error) {
            console.error('Error loading adjacent articles:', error);
        }
    }

    static updateNavigationUI(prevSnapshot, nextSnapshot) {
        // Update Previous Article
        if (!prevSnapshot.empty) {
            const prevArticle = prevSnapshot.docs[0];
            const prevData = prevArticle.data();
            const prevElement = document.getElementById('prevArticle');
            
            prevElement.href = `news-detail.html?id=${prevArticle.id}`;
            prevElement.querySelector('.nav-title').textContent = prevData.title;
            prevElement.querySelector('.nav-category').textContent = prevData.category;
            prevElement.style.display = 'block';
        }

        // Update Next Article
        if (!nextSnapshot.empty) {
            const nextArticle = nextSnapshot.docs[0];
            const nextData = nextArticle.data();
            const nextElement = document.getElementById('nextArticle');
            
            nextElement.href = `news-detail.html?id=${nextArticle.id}`;
            nextElement.querySelector('.nav-title').textContent = nextData.title;
            nextElement.querySelector('.nav-category').textContent = nextData.category;
            nextElement.style.display = 'block';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => ArticleNavigation.loadAdjacentArticles());
    