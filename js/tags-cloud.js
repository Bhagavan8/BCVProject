import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class TagsCloud {
    constructor() {
        this.tagsContainer = document.getElementById('tagsCloud');
    }

    async init() {
        try {
            const newsRef = collection(db, 'news');
            const q = query(newsRef, 
                // Remove the approval status check temporarily to see if we get any data
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            
            console.log('Loading tags...'); // Debug log
            const querySnapshot = await getDocs(q);
            console.log('Documents found:', querySnapshot.size); // Add this debug log
            
            if (querySnapshot.empty) {
                console.log('No documents found'); // Debug log
                return;
            }
            const tagsMap = new Map();

            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Use category instead of tags
                if (data.category) {
                    const category = data.category.toLowerCase();
                    tagsMap.set(category, (tagsMap.get(category) || 0) + 1);
                }
            });

            // Convert map to array and sort by count
            const sortedTags = Array.from(tagsMap.entries())
                .sort((a, b) => b[1] - a[1]);

            if (this.tagsContainer) {  // Use this.tagsContainer instead of tagsContainer
                this.tagsContainer.innerHTML = sortedTags.map(([category, count]) => `
                    <a href="category.html?category=${encodeURIComponent(category)}" class="tag-item">
                        ${category.charAt(0).toUpperCase() + category.slice(1)}
                        <span class="tag-count">${count}</span>
                    </a>
                `).join('');
            }
        } catch (error) {
            console.error('Error in TagsCloud:', error);
        }
    }
}