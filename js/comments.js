import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, query, where, orderBy, 
    onSnapshot, serverTimestamp, doc, getDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Make sure to export the class
export class CommentsManager {
    constructor(newsId) {
        this.newsId = newsId;
        if (!this.newsId) {
            throw new Error('NewsId is required for CommentsManager');
        }
    }

    async initialize() {
        if (!this.newsId) {
            console.error('Cannot initialize comments without a newsId');
            return;
        }
        this.commentsContainer = document.getElementById('commentsContainer');
        this.commentText = document.getElementById('commentText');
        this.postButton = document.getElementById('postComment');
        this.loginPrompt = document.getElementById('loginPrompt');
        this.commentFormContent = document.getElementById('commentFormContent');
        this.commentCount = document.getElementById('commentCount');
        
        this.setupEventListeners();
        this.loadComments();
        this.checkAuthState();
    }

    checkAuthState() {
        auth.onAuthStateChanged(user => {
            if (user) {
                this.loginPrompt.classList.add('d-none');
                this.commentFormContent.classList.remove('d-none');
            } else {
                this.loginPrompt.classList.remove('d-none');
                this.commentFormContent.classList.add('d-none');
            }
        });
    }

    setupEventListeners() {
        this.postButton.addEventListener('click', () => this.postComment());
        this.commentText.addEventListener('input', () => {
            const remaining = 500 - this.commentText.value.length;
            if (remaining < 0) {
                this.commentText.value = this.commentText.value.substring(0, 500);
            }
        });
    }

    async postComment(commentData) {
        if (!this.newsId) {
            throw new Error('Cannot post comment without a newsId');
        }
        if (!auth.currentUser) {
            alert('Please login to post a comment');
            return;
        }

        const text = this.commentText.value.trim();
        if (!text) return;

        try {
            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const userData = userDoc.data();
            
            // Check if user data exists and has firstName
            if (!userData || !userData.firstName) {
                throw new Error('User profile not found or incomplete');
            }

            await addDoc(collection(db, 'comments'), {
                newsId: this.newsId,
                text: text,
                userId: auth.currentUser.uid,
                userName: userData.firstName, // Store first name
                createdAt: serverTimestamp(),
                userPhoto: userData.profileImage || '/assets/images/default-avatar.png' // Use user's profile image
            });

            this.commentText.value = '';
            
        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Failed to post comment. Please try again.');
        }
    }

    loadComments() {
        const commentsPerPage = 8;
        let currentPage = 1;
        
        const commentsQuery = query(
            collection(db, 'comments'),
            where('newsId', '==', this.newsId),
            orderBy('createdAt', 'desc')
        );

        onSnapshot(commentsQuery, (snapshot) => {
            this.commentCount.textContent = snapshot.size;
            const totalPages = Math.ceil(snapshot.size / commentsPerPage);
            
            const renderComments = (page) => {
                const start = (page - 1) * commentsPerPage;
                const end = start + commentsPerPage;
                const paginatedDocs = snapshot.docs.slice(start, end);
                
                this.commentsContainer.innerHTML = paginatedDocs.map(docSnapshot => {
                    const comment = docSnapshot.data();
                    const date = comment.createdAt?.toDate() || new Date();
                    const formattedDate = new Intl.DateTimeFormat('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }).format(date);

                    return `
                        <div class="comment-item animate__animated animate__fadeIn">
                            <div class="comment-header d-flex align-items-center">
                                <img src="${comment.userPhoto || '/assets/images/default-avatar.png'}" 
                                     alt="${comment.userName}" 
                                     class="rounded-circle me-2" 
                                     width="40" height="40">
                                <div>
                                    <h6 class="mb-0">${comment.userName}</h6>
                                    <small class="text-muted">${formattedDate}</small>
                                </div>
                            </div>
                            <div class="comment-body mt-2">
                                <p class="mb-0">${this.escapeHtml(comment.text)}</p>
                            </div>
                        </div>
                    `;
                }).join('');

                // Add pagination controls if there are multiple pages
                if (totalPages > 1) {
                    const paginationHTML = `
                        <div class="pagination-container mt-4 d-flex justify-content-center">
                            <nav aria-label="Comments pagination">
                                <ul class="pagination">
                                    <li class="page-item ${page === 1 ? 'disabled' : ''}">
                                        <a class="page-link" href="#" data-page="${page - 1}">Previous</a>
                                    </li>
                                    ${Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .map(num => `
                                            <li class="page-item ${num === page ? 'active' : ''}">
                                                <a class="page-link" href="#" data-page="${num}">${num}</a>
                                            </li>
                                        `).join('')}
                                    <li class="page-item ${page === totalPages ? 'disabled' : ''}">
                                        <a class="page-link" href="#" data-page="${page + 1}">Next</a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    `;
                    this.commentsContainer.insertAdjacentHTML('beforeend', paginationHTML);

                    // Add event listeners to pagination buttons
                    const paginationLinks = this.commentsContainer.querySelectorAll('.page-link');
                    paginationLinks.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const newPage = parseInt(e.target.dataset.page);
                            if (newPage && newPage !== currentPage && newPage > 0 && newPage <= totalPages) {
                                currentPage = newPage;
                                renderComments(currentPage);
                            }
                        });
                    });
                }

                AOS.refresh();
            };

            // Initial render
            renderComments(currentPage);
        });
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}