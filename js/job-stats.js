import { db, auth } from './firebase-config.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    setDoc, 
    increment,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class JobStatsManager {
    constructor(jobId, jobType) {
        this.jobId = jobId;
        this.jobType = jobType;
        this.collectionName = this.jobType === 'private' ? 'jobs' : `${this.jobType}Jobs`;
        this.viewsTracked = false;
        this.commentsPerPage = 8;
        this.currentPage = 1;
        this.totalComments = 0;
        this.init();
    }

    async init() {
        this.setupAuthStateListener();
        this.setupComments();
        await this.loadJobStats();
        await this.trackPageView();
        this.setupLikeButton();
        await this.loadComments();
    }

    setupComments() {
        const commentInput = document.getElementById('commentInput');
        const charCount = document.querySelector('.char-count');
        const postButton = document.getElementById('postComment');

        if (commentInput && charCount) {
            commentInput.addEventListener('input', (e) => {
                const length = e.target.value.length;
                charCount.textContent = `${length}/500`;
            });
        }

        if (postButton) {
            postButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handlePostComment();
            });
        }
    }

    // Add this new method
    setupAuthStateListener() {
        auth.onAuthStateChanged(async (user) => {
            await this.loadJobStats();
            await this.trackPageView();
            this.setupLikeButton();
            await this.loadComments();
        });
    }

    // Remove init method since we're using auth state listener

    async handlePostComment() {
        if (!auth.currentUser) {
            alert('Please login to post a comment');
            return;
        }

        const commentInput = document.getElementById('commentInput');
        const content = commentInput.value.trim();

        if (!content) {
            alert('Please enter a comment');
            return;
        }

        const postButton = document.getElementById('postComment');
        postButton.disabled = true;

        try {
            // Get user's first name from users collection
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const userData = userDoc.data();
            const firstName = userData?.firstName || 'Anonymous';

            const commentsRef = collection(db, 'jobComments');
            await addDoc(commentsRef, {
                jobId: this.jobId,
                userId: auth.currentUser.uid,
                userName: firstName,
                content: content,
                timestamp: serverTimestamp(),
                userEmail: auth.currentUser.email
            });

            commentInput.value = '';
            document.querySelector('.char-count').textContent = '0/500';
            this.currentPage = 1;
            await this.loadComments();
            
            Toastify({
                text: "Comment posted successfully",
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: "linear-gradient(to right, #00b09b, #96c93d)",
                }
            }).showToast();

        } catch (error) {
            console.error('Error posting comment:', error);
            Toastify({
                text: "Failed to post comment",
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: "linear-gradient(to right, #ff5f6d, #ffc371)",
                }
            }).showToast();
        } finally {
            postButton.disabled = false;
        }
    }

    async loadComments() {
        try {
            if (!this.jobId) return;
            
            const commentsRef = collection(db, 'jobComments');
            
            // Get total comments count
            const countQuery = query(
                commentsRef,
                where('jobId', '==', this.jobId)
            );
            const countSnapshot = await getDocs(countQuery);
            this.totalComments = countSnapshot.size;

            // Get paginated comments
            const commentsQuery = query(
                commentsRef,
                where('jobId', '==', this.jobId),
                orderBy('timestamp', 'desc')
            );

            const commentsList = document.getElementById('commentsList');
            const commentForm = document.querySelector('.comment-form');

            if (!commentsList) return;

            // Show/hide comment form based on auth state
            if (commentForm) {
                commentForm.style.display = auth.currentUser ? 'block' : 'none';
            }

            // Show loading state
            commentsList.innerHTML = `
                <div class="text-center p-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>`;

            const commentsSnapshot = await getDocs(commentsQuery);

            if (commentsSnapshot.empty) {
                commentsList.innerHTML = `
                    <div class="no-comments text-center text-muted p-4">
                        <i class="bi bi-chat-dots fs-4 mb-2 d-block"></i>
                        <p class="mb-0">No comments yet. ${auth.currentUser ? 'Be the first to comment!' : 'Login to comment.'}</p>
                    </div>`;
                return;
            }

            // Calculate pagination
            const startIndex = (this.currentPage - 1) * this.commentsPerPage;
            const endIndex = startIndex + this.commentsPerPage;
            const paginatedComments = commentsSnapshot.docs.slice(startIndex, endIndex);

            const commentsHTML = await Promise.all(paginatedComments.map(async docSnapshot => {
                const comment = docSnapshot.data();
                const timestamp = comment.timestamp?.toDate() || new Date();
                
                try {
                    // Get user's first name for each comment
                    const userRef = doc(db, 'users', comment.userId);
                    const userDoc = await getDoc(userRef);
                    const userData = userDoc.data();
                    const firstName = userData?.firstName || 'Anonymous';

                    return `
                        <div class="comment-item animate__animated animate__fadeIn">
                            <div class="comment-header">
                                <div class="comment-author">
                                    <i class="bi bi-person-circle me-2"></i>
                                    ${this.escapeHTML(firstName)}
                                </div>
                                <div class="comment-date">
                                    ${this.formatDate(timestamp)}
                                </div>
                            </div>
                            <div class="comment-content mt-2">
                                ${this.escapeHTML(comment.content)}
                            </div>
                        </div>`;
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    return `
                        <div class="comment-item animate__animated animate__fadeIn">
                            <div class="comment-header">
                                <div class="comment-author">
                                    <i class="bi bi-person-circle me-2"></i>
                                    Anonymous
                                </div>
                                <div class="comment-date">
                                    ${this.formatDate(timestamp)}
                                </div>
                            </div>
                            <div class="comment-content mt-2">
                                ${this.escapeHTML(comment.content)}
                            </div>
                        </div>`;
                }
            }));

            // Add pagination controls
            const totalPages = Math.ceil(this.totalComments / this.commentsPerPage);
            const paginationHTML = this.generatePaginationHTML(totalPages);

            commentsList.innerHTML = `
                ${commentsHTML}
                ${totalPages > 1 ? `
                    <div class="pagination-container mt-4 d-flex justify-content-center">
                        ${paginationHTML}
                    </div>
                ` : ''}
            `;

            // Add event listeners to pagination buttons
            this.setupPaginationListeners();

        } catch (error) {
            console.error('Error loading comments:', error);
            const commentsList = document.getElementById('commentsList');
            if (commentsList) {
                commentsList.innerHTML = `
                    <div class="error-message text-center text-danger p-3">
                        <i class="bi bi-exclamation-circle me-2"></i>
                        Failed to load comments. Please try again later.
                    </div>`;
            }
        }
    }

    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } else if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    async loadJobStats() {
        try {
            const jobRef = doc(db, this.collectionName, this.jobId);
            const jobDoc = await getDoc(jobRef);

            if (jobDoc.exists()) {
                const jobData = jobDoc.data();
                this.updateStatsDisplay(jobData);
            }
        } catch (error) {
            console.error('Error loading job stats:', error);
        }
    }

    updateStatsDisplay(jobData) {
        // Update view count
        document.getElementById('viewCount').textContent = jobData.views || 0;
        
        // Update like count
        const likeCount = document.getElementById('likeCount');
        likeCount.textContent = jobData.likes || 0;
        
        // Update like button state if user has liked
        if (auth.currentUser) {
            this.updateLikeButtonState(jobData.likedBy || []);
        }

        // Update rating
        document.getElementById('avgRating').textContent = 
            jobData.averageRating ? jobData.averageRating.toFixed(1) : '0.0';
        document.getElementById('ratingCount').textContent = 
            jobData.totalRatings || 0;
    }

    async trackPageView() {
        if (this.viewsTracked) return;

        try {
            const viewId = auth.currentUser?.uid || `anonymous_${Date.now()}`;
            const viewsRef = doc(db, 'jobViews', `${this.jobId}_${viewId}`);
            const viewDoc = await getDoc(viewsRef);

            if (!viewDoc.exists()) {
                // Record new view with serverTimestamp
                await setDoc(viewsRef, {
                    userId: viewId,
                    jobId: this.jobId,
                    timestamp: serverTimestamp(),
                    isAnonymous: !auth.currentUser
                });

                // Increment job views
                const jobRef = doc(db, this.collectionName, this.jobId);
                await updateDoc(jobRef, {
                    views: increment(1)
                });

                // Update local view count
                const currentViews = parseInt(document.getElementById('viewCount').textContent);
                document.getElementById('viewCount').textContent = currentViews + 1;
                
                this.viewsTracked = true;
            }
        } catch (error) {
            console.error('Error tracking page view:', error);
        }
    }

    setupLikeButton() {
        const likeButton = document.getElementById('likeButton');
        if (likeButton) {
            likeButton.addEventListener('click', () => this.handleLike());
        }
    }

    async handleLike() {
        if (!auth.currentUser) {
            alert('Please login to like this job');
            return;
        }

        try {
            const jobRef = doc(db, this.collectionName, this.jobId);
            const jobDoc = await getDoc(jobRef);
            const jobData = jobDoc.data();
            const likedBy = jobData.likedBy || [];
            const userId = auth.currentUser.uid;
            const isLiked = likedBy.includes(userId);

            if (isLiked) {
                // Unlike
                await updateDoc(jobRef, {
                    likes: increment(-1),
                    likedBy: likedBy.filter(id => id !== userId)
                });
            } else {
                // Like
                await updateDoc(jobRef, {
                    likes: increment(1),
                    likedBy: [...likedBy, userId]
                });
            }

            // Update UI
            const newLikeCount = (jobData.likes || 0) + (isLiked ? -1 : 1);
            document.getElementById('likeCount').textContent = newLikeCount;
            this.updateLikeButtonState(isLiked ? [] : [userId]);

        } catch (error) {
            console.error('Error handling like:', error);
        }
    }

    updateLikeButtonState(likedBy) {
        const likeButton = document.getElementById('likeButton');
        const heartIcon = likeButton.querySelector('i');
        
        if (likedBy.includes(auth.currentUser?.uid)) {
            heartIcon.classList.remove('bi-heart');
            heartIcon.classList.add('bi-heart-fill', 'text-danger');
            likeButton.classList.add('liked');
        } else {
            heartIcon.classList.add('bi-heart');
            heartIcon.classList.remove('bi-heart-fill', 'text-danger');
            likeButton.classList.remove('liked');
        }
    }
    generatePaginationHTML(totalPages) {
        let html = '<nav aria-label="Comments pagination"><ul class="pagination">';
        
        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>`;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <li class="page-item ${this.currentPage === i ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>`;
        }

        // Next button
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>`;

        html += '</ul></nav>';
        return html;
    }
    setupPaginationListeners() {
        const paginationLinks = document.querySelectorAll('.pagination .page-link');
        paginationLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const newPage = parseInt(e.target.closest('.page-link').dataset.page);
                if (newPage && newPage !== this.currentPage) {
                    this.currentPage = newPage;
                    await this.loadComments();
                    window.scrollTo({
                        top: document.getElementById('commentsList').offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
        // Add after setupComments method
        async handlePostComment() {
            if (!auth.currentUser) {
                alert('Please login to post a comment');
                return;
            }
    
            const commentInput = document.getElementById('commentInput');
            const content = commentInput.value.trim();
    
            if (!content) {
                alert('Please enter a comment');
                return;
            }
    
            const postButton = document.getElementById('postComment');
            postButton.disabled = true;
    
            try {
                const commentsRef = collection(db, 'jobComments');
                await addDoc(commentsRef, {
                    jobId: this.jobId,
                    userId: auth.currentUser.uid,
                    userName: auth.currentUser.displayName || 'Anonymous',
                    content: content,
                    timestamp: serverTimestamp(),
                    userEmail: auth.currentUser.email
                });
    
                commentInput.value = '';
                document.querySelector('.char-count').textContent = '0/500';
                this.currentPage = 1;
                await this.loadComments();
                
                // Show success message
                Toastify({
                    text: "Comment posted successfully",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "linear-gradient(to right, #00b09b, #96c93d)",
                    }
                }).showToast();
    
            } catch (error) {
                console.error('Error posting comment:', error);
                Toastify({
                    text: "Failed to post comment",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    style: {
                        background: "linear-gradient(to right, #ff5f6d, #ffc371)",
                    }
                }).showToast();
            } finally {
                postButton.disabled = false;
            }
        }
    
        
}
async function displayJobDetails(jobId, jobType) {
    if (jobType !== 'private') return; // Only proceed for private jobs
    
    try {
        const jobRef = doc(db, 'jobs', jobId);
        const jobDoc = await getDoc(jobRef);
        
        if (jobDoc.exists()) {
            const jobData = jobDoc.data();
            
            const jobCodeWrapper = document.getElementById('jobCodeWrapper');
            const jobCodeElement = document.getElementById('jobCode');
            
            if (jobData.referralCode) {
                jobCodeElement.textContent = jobData.referralCode;
                jobCodeWrapper.style.display = 'flex';
            } else {
                jobCodeWrapper.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error fetching job details:', error);
        showErrorToast('Failed to load job details');
    }
}

// Update the initialization code
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    const jobType = urlParams.get('type');
    
    if (jobId && jobType) {
        new JobStatsManager(jobId, jobType);
        displayJobDetails(jobId, jobType); 
    }
});

export default JobStatsManager;
