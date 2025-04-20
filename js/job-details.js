import { db } from './firebase-config.js';
import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    limit,
    serverTimestamp,
    updateDoc,  // Add this
    orderBy  // Add this
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
const auth = getAuth();

class JobDetailsManager {
    constructor() {
        this.jobId = new URLSearchParams(window.location.search).get('id');
        this.jobType = new URLSearchParams(window.location.search).get('type');
        this.currentJob = null;
        this.init();
        this.initializeCopyLink();
        this.initializeRatingSystem();

    }
    async init() {
        await this.loadJobDetails();
        if (this.currentJob) {
            this.setupEventListeners();
            await this.renderSidebarJobs()

        }
    }
    async loadJobDetails() {
        try {
            const jobRef = doc(db, this.getCollectionName(), this.jobId);
            const jobDoc = await getDoc(jobRef);

            if (jobDoc.exists()) {
                this.currentJob = jobDoc.data();
                const averageRating = this.currentJob.averageRating || 0;
                const totalRatings = this.currentJob.totalRatings || 0;
                this.updateRatingDisplay(averageRating, totalRatings);
                this.renderJobDetails(this.currentJob);
                this.updateDetailsSection(this.currentJob);
            } else {
                console.log('Job not found');
            }
        } catch (error) {
            console.error('Error loading job details:', error);
        }
    }
    capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    initializeRatingSystem() {
        const ratingStars = document.querySelectorAll('#ratingInput .bi-star');
        ratingStars.forEach(star => {
            star.addEventListener('click', (e) => this.handleRating(e));
            star.addEventListener('mouseover', (e) => this.handleStarHover(e));
            star.addEventListener('mouseout', () => this.handleStarHoverOut());
        });
    }
    initializeCopyLink() {
        const copyLinkBtn = document.getElementById('copyLink');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => this.handleCopyLink());
        }
    }
    handleStarHover(e) {
        const rating = parseInt(e.target.dataset.rating);
        const stars = document.querySelectorAll('#ratingInput .bi-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('bi-star');
                star.classList.add('bi-star-fill');
            }
        });
    }
    handleStarHoverOut() {
        const stars = document.querySelectorAll('#ratingInput i');
        stars.forEach(star => {
            star.classList.remove('bi-star-fill');
            star.classList.add('bi-star');
        });
    }
    async loadJobStats() {
        try {
            // Get ratings for this specific job
            const ratingsQuery = query(
                collection(db, 'jobRatings'),
                where('jobId', '==', this.jobId)
            );
            const ratingsSnapshot = await getDocs(ratingsQuery);

            let totalRating = 0;
            let ratingCount = 0;

            ratingsSnapshot.forEach(doc => {
                totalRating += doc.data().rating;
                ratingCount++;
            });

            const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;


            // Update job document with new rating stats
            const jobRef = doc(db, this.getCollectionName(), this.jobId);
            await updateDoc(jobRef, {
                averageRating: averageRating,
                totalRatings: ratingCount
            });

            // Update UI
            document.getElementById('avgRating').textContent = averageRating.toFixed(1);
            document.getElementById('ratingCount').textContent = ratingCount;
            this.updateRatingDisplay(averageRating, ratingCount);
            if (auth.currentUser) {
                const userRatingDoc = await getDoc(doc(db, 'jobRatings', `${this.jobId}_${auth.currentUser.uid}`));
                if (userRatingDoc.exists()) {
                    this.disableRating();
                }
            }
        } catch (error) {
            console.error('Error loading job stats:', error);
        }
    }
    formatDate(timestamp) {
        if (!timestamp) return 'Date not available';

        // Convert timestamp to Date object if it's a Firestore timestamp
        let date;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            // Handle Firestore timestamp format
            date = new Date(timestamp.seconds * 1000);
        } else {
            // Handle regular Date object or timestamp
            date = new Date(timestamp);
        }

        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
            });

        });

        document.querySelectorAll('.share-buttons button').forEach(button => {
            button.addEventListener('click', (e) => {
                const platform = e.currentTarget.getAttribute('data-platform');
                this.handleShare(platform);
            });
        });

        document.getElementById('commentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleComment();
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    getCollectionName() {
        return this.jobType === 'private' ? 'jobs' : `${this.jobType}Jobs`;
    }

    renderJobDetails(job) {
        // Check and update elements if they exist
        const jobTitleEl = document.getElementById('jobTitle');
        const companyNameEl = document.getElementById('companyName');
        const locationEl = document.getElementById('location');
        const experienceEl = document.getElementById('experience');
        const salaryEl = document.getElementById('salary');
        const applyButton = document.getElementById('applyButton');

        if (jobTitleEl) jobTitleEl.textContent = job.jobTitle || job.postName;
        if (companyNameEl) companyNameEl.textContent = job.companyName || job.bankName;
        if (locationEl) locationEl.textContent = job.location || job.state;
        if (experienceEl) {
            if (job.experience && job.experience.toLowerCase() === 'fresher') {
                experienceEl.textContent = 'Fresher';
            } else if (job.experience) {
                experienceEl.textContent = `${job.experience} Years`;
            } else {
                experienceEl.textContent = 'Not specified';
            }
        }
        if (salaryEl) salaryEl.textContent = job.salary;

        const logoContainer = document.getElementById('companyLogo');
        if (this.jobType === 'bank') {
            logoContainer.innerHTML = '<i class="bi bi-bank2 fs-1 text-primary"></i>';
        } else {
            logoContainer.innerHTML = `<img src="/assets/images/companies/${job.companyLogo}" 
                alt="${job.companyName}" class="company-logo">`;
        }

        const jobDescriptionEl = document.querySelector('.job-description');
        if (jobDescriptionEl) {
            const overviewContent = this.jobType === 'bank' ?
                this.renderBankOverview(job) :
                this.renderPrivateJobOverview(job);
            jobDescriptionEl.innerHTML = overviewContent;
        }

        if (applyButton) {
            applyButton.onclick = () => this.handleApply(job);
        }
    }

    renderBankOverview(job) {
        return `
            <div class="job-overview-container">
                <div class="quick-actions">
                    <button class="action-btn apply-now" onclick="window.open('${job.applicationLink}', '_blank')">
                        <i class="bi bi-box-arrow-up-right"></i>
                        Apply Now
                    </button>
                    

                <div class="overview-section">
                    <h4><i class="bi bi-info-circle"></i> Key Details</h4>
                    <div class="details-grid">
                        ${this.renderDetailItem('Age Limit', job.ageLimit)}
                        ${this.renderDetailItem('Qualification', job.qualification)}
                        ${this.renderDetailItem('Vacancies', job.vacancies)}
                        ${this.renderDetailItem('Bank Type', job.bankType)}
                        ${this.renderDetailItem('Exam Date', job.examDate)}
                        ${this.renderDetailItem('Last Date', job.lastDate)}
                        ${this.renderDetailItem('State', job.state)}
                    </div>
                </div>

                <div class="overview-section">
                    <h4><i class="bi bi-file-text"></i> Description</h4>
                    <div class="description-content">
                        ${this.formatDescription(job.description)}
                    </div>
                </div>

                <div class="overview-section">
                    <h4><i class="bi bi-link-45deg"></i> Important Links</h4>
                    <div class="links-container">
                        ${job.notificationFile ? `
                            <a href="${job.notificationFile}" class="important-link" target="_blank">
                                <i class="bi bi-file-pdf"></i>
                                Download Notification
                            </a>
                        ` : ''}
                        <a href="${job.applicationLink}" class="important-link" target="_blank">
                            <i class="bi bi-box-arrow-up-right"></i>
                            Apply Online
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    renderPrivateJobOverview(job) {
        return `
            <div class="job-overview-container animate-fade-in">
                <div class="quick-actions">
                    <button class="action-btn apply-now pulse-animation" onclick="window.open('${job.applicationLink}', '_blank')">
                        <i class="bi bi-box-arrow-up-right"></i>
                        Apply Now
                    </button>
                </div>

                <div class="overview-section slide-in-right animate__animated animate__fadeInRight">
                    <h4 class="section-title animate__animated animate__fadeIn">
                        <i class="bi bi-building pulse-icon"></i> 
                        <span class="gradient-text">Company Information</span>
                    </h4>
                    <div class="company-details">
                        <p class="about-company animate__animated animate__fadeIn">
                            ${job.aboutCompany}
                        </p>
                        <div class="company-links animate__animated animate__fadeInUp">
                            <a href="${job.companyWebsite}" 
                               class="company-link btn-hover-effect" 
                               target="_blank">
                                <i class="bi bi-globe rotating-icon"></i> 
                                <span>Visit Website</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="overview-section slide-in-left">
                    <h4 class="section-title">
                        <i class="bi bi-briefcase gradient-icon"></i> 
                        <span class="gradient-text">Job Details</span>
                    </h4>
                    <div class="details-grid">
                        <div class="details-column">
                            ${job.experience ? this.renderDetailItem('Experience', this.capitalizeFirstLetter(job.experience), 'bi-briefcase') : ''}
                            ${job.educationLevel ? this.renderDetailItem('Education', this.capitalizeFirstLetter(job.educationLevel), 'bi-mortarboard') : ''}
                            ${job.location ? this.renderDetailItem('Location', this.capitalizeFirstLetter(job.location), 'bi-geo-alt') : ''}
                        </div>
                        <div class="details-column">
                            ${job.lastDate ? this.renderDetailItem('Last Date', this.capitalizeFirstLetter(job.lastDate), 'bi-calendar') : ''}
                            ${job.salary ? this.renderDetailItem('Salary', this.capitalizeFirstLetter(job.salary), 'bi-currency-rupee') : ''}
                        </div>
                    </div>
                </div>

                <div class="overview-section content-section">
                    <h4 class="section-title">
                        <i class="bi bi-file-text gradient-icon"></i> 
                        <span class="gradient-text">Job Description</span>
                    </h4>
                    <div class="description-content">
                        ${this.formatDescription(job.description)}
                    </div>
                </div>

                ${job.skills ? `
                    <div class="overview-section content-section">
                        <h4 class="section-title">
                            <i class="bi bi-tools gradient-icon"></i> 
                            <span class="gradient-text">Required Skills</span>
                        </h4>
                        <div class="skills-container">
                            ${job.skills.map(skill => `
                                <span class="skill-tag">
                                    <i class="bi bi-check-circle-fill text-success"></i>
                                    ${this.capitalizeFirstLetter(skill)}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="overview-section content-section">
                    <h4 class="section-title">
                        <i class="bi bi-award gradient-icon"></i> 
                        <span class="gradient-text">Desired Qualifications</span>
                    </h4>
                    <div class="qualifications-content">
                        ${this.formatQualifications(job.qualifications)}
                    </div>
                </div>

                <!-- Add the new Apply Now button section at the end -->
                <div class="quick-actions mt-4 text-center">
                    <button class="action-btn apply-now pulse-animation" onclick="window.open('${job.applicationLink}', '_blank')">
                        <i class="bi bi-box-arrow-up-right"></i>
                        Apply Now
                    </button>
                </div>
            </div>
        `;
    }

    renderDetailItem(label, value, iconClass) {
        if (!value) return '';

        // Handle experience display
        if (label === 'Experience') {
            value = value.toLowerCase() === 'fresher' ? 'Fresher' : `${value} Years`;
        }

        return `
            <div class="detail-item">
                <i class="bi ${iconClass}"></i>
                <div class="detail-content">
                    <span class="detail-label fw-bold">${label} <span class="separator">⟫</span></span>
                    <span class="detail-value">${value}</span>
                </div>
            </div>
        `;
    }
    updateJobMetaInfo(job) {
        const experienceElement = document.getElementById('experience');
        if (experienceElement && job.experience) {
            const expValue = job.experience.toLowerCase() === 'fresher' ?
                'Fresher' :
                `${job.experience} Years`;
            experienceElement.textContent = expValue;
        }
    }

    formatDescription(description) {
        if (!description) return '';
        const points = description.split('\n').filter(point => point.trim());
        return `
            <ul class="description-list">
                ${points.map(point => `
                    <li class="description-point">
                        ${point.trim()}
                    </li>
                `).join('')}
            </ul>
        `;
    }

    formatQualifications(qualifications) {
        if (!qualifications) return 'No specific qualifications mentioned';

        // Handle array format
        if (Array.isArray(qualifications)) {
            return `
                <ul class="qualifications-list">
                    ${qualifications.map(point => `
                        <li class="qualification-point animate__animated animate__fadeIn">
                            <i class="bi bi-check2-circle text-success"></i>
                            ${point.trim()}
                        </li>
                    `).join('')}
                </ul>
            `;
        }

        // Handle string format
        if (typeof qualifications === 'string') {
            const points = qualifications.split('\n').filter(point => point.trim());
            return `
                <ul class="qualifications-list">
                    ${points.map(point => `
                        <li class="qualification-point animate__animated animate__fadeIn">
                            <i class="bi bi-check2-circle text-success"></i>
                            ${point.trim()}
                        </li>
                    `).join('')}
                </ul>
            `;
        }

        // Handle object or other formats
        return 'Qualifications format not supported';
    }

    async handleApply(job) {
        if (job.applicationLink) {
            window.open(job.applicationLink, '_blank');
        } else {
            document.getElementById('applicationSection').classList.remove('d-none');
        }
    }



    handleRating(e) {
        if (!e || !e.target) return;

        const ratingValue = parseInt(e.target.dataset.rating);
        if (!ratingValue) return;

        const stars = document.querySelectorAll('#ratingInput i');

        // Update visual stars
        stars.forEach((star, index) => {
            if (index < ratingValue) {
                star.classList.remove('bi-star');
                star.classList.add('bi-star-fill');
            } else {
                star.classList.remove('bi-star-fill');
                star.classList.add('bi-star');
            }
        });

        // Submit the rating
        this.submitRating(ratingValue);
    }
    async submitRating(rating) {
        try {
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                this.showToast('Please login to rate this job', 'warning');
                return;
            }

            const ratingRef = doc(db, 'jobRatings', `${this.jobId}_${user.uid}`);
            await setDoc(ratingRef, {
                jobId: this.jobId,
                userId: user.uid,
                rating: Number(rating), // Ensure rating is a number
                timestamp: serverTimestamp()
            });

            this.showToast('Rating submitted successfully!', 'success');
            await this.loadJobStats(this.jobId);
        } catch (error) {
            console.error('Error submitting rating:', error);
            this.showToast('Failed to submit rating', 'error');
        }
    }
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    disableRating() {
        const ratingContainer = document.getElementById('ratingContainer');
        ratingContainer.innerHTML = '<p class="text-success">Thank you for rating this job!</p>';
    }

    updateRatingDisplay(average, total) {
        const starsContainer = document.getElementById('averageRatingStars');
        const ratingValue = document.getElementById('averageRatingValue');
        const totalRatings = document.getElementById('totalRatings');

        if (!starsContainer || !ratingValue || !totalRatings) return;

        starsContainer.innerHTML = '';

        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = `bi ${i <= average ? 'bi-star-fill' : 'bi-star'}`;
            starsContainer.appendChild(star);
        }

        ratingValue.textContent = average.toFixed(1);
        totalRatings.textContent = `(${total} ${total === 1 ? 'rating' : 'ratings'})`;
    }

    updateDetailsSection(job) {
        const detailsContainer = document.querySelector('.job-details-container');
        if (!detailsContainer) return;

        if (job.companyWebsite) {
            const websiteLink = detailsContainer.querySelector('.company-website');
            if (websiteLink) {
                websiteLink.href = job.companyWebsite;
            }
        }

        if (job.lastDate) {
            const deadlineElement = detailsContainer.querySelector('.application-deadline');
            if (deadlineElement) {
                deadlineElement.textContent = new Date(job.lastDate).toLocaleDateString();
            }
        }
    }


    handleShare(platform) {
        const url = window.location.href;
        const title = document.getElementById('jobTitle').textContent;
        const shareText = `Check out this job: ${title}`;

        const shareUrls = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`
        };

        if (shareUrls[platform]) {
            window.open(shareUrls[platform], '_blank', 'width=600,height=400');
        }
    }

    async handleCopyLink() {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);

            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="bi bi-check-circle-fill text-success"></i>
                    <span>Link copied to clipboard!</span>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            const toast = document.createElement('div');
            toast.className = 'toast-notification error';
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="bi bi-x-circle-fill text-danger"></i>
                    <span>Failed to copy link</span>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }
    }
    renderSidebarSection(containerId, snapshot) {
        const container = document.querySelector(`#${containerId}`);
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state p-4 text-center">
                    <i class="bi bi-inbox text-muted fs-2"></i>
                    <p class="text-muted mt-2">No jobs available</p>
                </div>`;
            return;
        }

        const jobsHtml = snapshot.docs.map(doc => {
            const job = doc.data();
            return `
                <a href="job-details.html?id=${doc.id}&type=${this.jobType}" 
                   class="list-group-item list-group-item-action py-2 fade-in">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-1 text-truncate" style="max-width: 80%;">
                            ${this.capitalizeFirstLetter(job.jobTitle || job.postName || 'Untitled')}
                        </h6>
                    </div>
                    <p class="mb-1 small text-muted text-truncate company-name hover-effect">
                        ${this.capitalizeFirstLetter(job.companyName || job.bankName || 'Unknown Company')}
                    </p>
                    <div class="d-flex justify-content-between align-items-center content-container">
                        <small class="text-truncate" style="max-width: 60%;">
                            ${job.location || job.state || 'Location N/A'}
                        </small>
                        <small class="text-muted">
                            ${job.salary || ''}
                        </small>
                    </div>
                </a>`;
        }).join('');

        container.innerHTML = jobsHtml;
    }
    async renderSidebarJobs() {
        try {
            // Show loading spinners
            ['similarJobs', 'mostViewedJobs', 'recentJobs', 'companyJobs'].forEach(sectionId => {
                const container = document.querySelector(`#${sectionId}`);
                if (container) {
                    container.innerHTML = `
                        <div class="loading-spinner p-4 text-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>`;
                }
            });

            const jobRef = doc(db, this.getCollectionName(), this.jobId);
            const jobDoc = await getDoc(jobRef);

            if (!jobDoc.exists()) {
                throw new Error('Job not found');
            }

            // Queries for different sections
            const similarJobsQuery = query(
                collection(db, this.getCollectionName()),
                where('isActive', '==', true),
                where('jobType', '==', 'private'),
                limit(3)
            );

            const mostViewedJobsQuery = query(
                collection(db, this.getCollectionName()),
                where('isActive', '==', true),
                orderBy('views', 'desc'),
                limit(3)
            );

            const recentJobsQuery = query(
                collection(db, this.getCollectionName()),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc'),
                limit(3)
            );

            // Execute all queries in parallel
            const [similarJobs, mostViewedJobs, recentJobs] = await Promise.all([
                getDocs(similarJobsQuery),
                getDocs(mostViewedJobsQuery),
                getDocs(recentJobsQuery)
            ]);

            // Update counters
            document.getElementById('similarJobsCount').textContent = similarJobs.size;
            document.getElementById('mostViewedJobsCount').textContent = mostViewedJobs.size;
            document.getElementById('recentJobsCount').textContent = recentJobs.size;

            // Render sections with enhanced display
            this.renderSidebarSection('similarJobs', similarJobs);
            this.renderMostViewedSection('mostViewedJobs', mostViewedJobs);
            this.renderRecentJobsSection('recentJobs', recentJobs);
            await this.renderCompanyWiseJobs();

        } catch (error) {
            console.error('Error loading sidebar jobs:', error);
            this.handleSidebarError();
        }
    }

    renderMostViewedSection(containerId, snapshot) {
        const container = document.getElementById(containerId);
        if (!container) return;
    
        if (snapshot.empty) {
            container.innerHTML = this.getEmptyStateHtml();
            return;
        }
    
        const jobsHtml = snapshot.docs.map((doc, index) => {
            const job = doc.data();
            return `
                <a href="job-details.html?id=${doc.id}&type=${this.jobType}" class="job-card list-group-item list-group-item-action py-2 fade-in">
                    <div class="stats-wrapper">
                        <span class="view-count">
                            <i class="bi bi-eye-fill"></i>
                            ${job.views || 0}
                        </span>
                        <span class="rating-count">
                            <i class="bi bi-star-fill"></i>
                            ${job.averageRating?.toFixed(1) || '0.0'}
                        </span>
                    </div>
                    <div class="job-content">
                        <div class="job-rank">#${index + 1}</div>
                        <h6 class="job-title">${this.capitalizeFirstLetter(job.jobTitle || 'Untitled')}</h6>
                        <p class="company-name">${this.capitalizeFirstLetter(job.companyName || 'Unknown Company')}</p>
                        <div class="job-stats">
                            <span class="location">
                                <i class="bi bi-geo-alt"></i> ${job.location || 'Location N/A'}
                            </span>
                        </div>
                    </div>
                </a>`;
        }).join('');
    
        container.innerHTML = jobsHtml;
    }

    renderRecentJobsSection(containerId, snapshot) {
        const container = document.getElementById(containerId);
        if (!container) return;
    
        if (snapshot.empty) {
            container.innerHTML = this.getEmptyStateHtml();
            return;
        }
    
        const jobsHtml = snapshot.docs.map(doc => {
            const job = doc.data();
            let timeAgo = 'Recently';
            if (job.createdAt) {
                const timestamp = job.createdAt.seconds ? job.createdAt : new Date(job.createdAt);
                timeAgo = this.getTimeAgo(timestamp);
            }
            
            return `
                <a href="job-details.html?id=${doc.id}&type=${this.jobType}" class="job-card list-group-item list-group-item-action py-2 fade-in">
                    <div class="job-content">
                        <h6 class="job-title">${this.capitalizeFirstLetter(job.jobTitle || 'Untitled')}</h6>
                        <p class="company-name">${this.capitalizeFirstLetter(job.companyName || 'Unknown Company')}</p>
                        <div class="job-stats">
                            <span class="posted-time">
                                <i class="bi bi-clock"></i> ${timeAgo}
                            </span>
                            <span class="location">
                                <i class="bi bi-geo-alt"></i> ${job.location || 'Location N/A'}
                            </span>
                        </div>
                    </div>
                </a>`;
        }).join('');
    
        container.innerHTML = jobsHtml;
    }
    async renderCompanyWiseJobs() {
        try {
            const jobsRef = collection(db, 'jobs');
            const q = query(
                jobsRef,
                where('isActive', '==', true),
                orderBy('companyName')
            );
            const snapshot = await getDocs(q);
    
            const companies = {};
            snapshot.docs.forEach(doc => {
                const job = doc.data();
                const companyName = job.companyName || 'Unknown Company';
                
                if (!companies[companyName]) {
                    companies[companyName] = {
                        jobs: [],
                        logo: job.companyLogo || 'default-company.png',
                        count: 0
                    };
                }
                companies[companyName].jobs.push({
                    id: doc.id,
                    ...job
                });
                companies[companyName].count++;
            });
    
            const topCompanies = Object.entries(companies)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 3);

        // Update company count
        const companyCountElement = document.getElementById('companyCount');
        if (companyCountElement) {
            companyCountElement.textContent = topCompanies.length.toString();
        }
    
            const companyJobsContainer = document.getElementById('companyJobs');
            
            if (companyJobsContainer) {
                companyJobsContainer.innerHTML = topCompanies.map(([companyName, data]) => `
                    <div class="company-card">
                        <div class="company-header" onclick="toggleCompanyJobs('${companyName}')">
                            <div class="company-info">
                                <img src="/assets/images/companies/${data.logo}" 
                                     alt="${companyName}" 
                                     class="company-logo-side">
                                <div class="company-details">
                                    <h6>${companyName}</h6>
                                    <span class="job-count">${data.count} open positions</span>
                                </div>
                            </div>
                            <i class="bi bi-chevron-down toggle-icon"></i>
                        </div>
                        <div id="jobs-${companyName.replace(/\s+/g, '-')}" class="company-jobs" style="display: none;">
                            ${data.jobs.map(job => `
                                <a href="job-details.html?id=${job.id}&type=private" 
                                   class="job-link">
                                    <div class="job-info">
                                        <h6>${job.jobTitle}</h6>
                                        <span class="location">${job.location || 'Location N/A'}</span>
                                    </div>
                                    <i class="bi bi-arrow-right"></i>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading company wise jobs:', error);
            const container = document.getElementById('companyJobs');
            if (container) {
                container.innerHTML = this.getErrorStateHtml();
            }
        }
    }

    getEmptyStateHtml() {
        return `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <p>No jobs available</p>
            </div>`;
    }
    getErrorStateHtml() {
        return `
            <div class="error-state">
                <i class="bi bi-exclamation-circle"></i>
                <p>Failed to load data</p>
            </div>`;
    }

    getTimeAgo(date) {
        try {
            const seconds = Math.floor((new Date() - (date instanceof Date ? date : date.toDate())) / 1000);
            const intervals = {
                year: 31536000,
                month: 2592000,
                week: 604800,
                day: 86400,
                hour: 3600,
                minute: 60
            };
    
            for (const [unit, secondsInUnit] of Object.entries(intervals)) {
                const interval = Math.floor(seconds / secondsInUnit);
                if (interval >= 1) {
                    return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
                }
            }
            return 'Just now';
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Recently';
        }
    }

    handleSidebarError() {
        ['similarJobs', 'mostViewedJobs', 'recentJobs', 'companyJobs'].forEach(sectionId => {
            const container = document.querySelector(`#${sectionId}`);
            if (container) {
                container.innerHTML = `
                    <div class="error-state p-4 text-center">
                        <i class="bi bi-exclamation-circle text-danger fs-2"></i>
                        <p class="text-danger mt-2">Failed to load jobs</p>
                    </div>`;
            }
        });
    }

    handleShare(platform) {
        const url = window.location.href;
        const title = document.getElementById('jobTitle').textContent;
        const shareText = `Check out this job: ${title}`;

        const shareUrls = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`
        };

        if (shareUrls[platform]) {
            window.open(shareUrls[platform], '_blank', 'width=600,height=400');
        }
    }

    async handleCopyLink() {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);

            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="bi bi-check-circle-fill text-success"></i>
                    <span>Link copied to clipboard!</span>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            const toast = document.createElement('div');
            toast.className = 'toast-notification error';
            toast.innerHTML = `
                <div class="toast-content">
                    <i class="bi bi-x-circle-fill text-danger"></i>
                    <span>Failed to copy link</span>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }
    }
    renderSidebarSection(containerId, snapshot) {
        const container = document.querySelector(`#${containerId}`);
        if (!container) return;

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state p-4 text-center">
                    <i class="bi bi-inbox text-muted fs-2"></i>
                    <p class="text-muted mt-2">No jobs available</p>
                </div>`;
            return;
        }

        const jobsHtml = snapshot.docs.map(doc => {
            const job = doc.data();
            return `
                <a href="job-details.html?id=${doc.id}&type=${this.jobType}" 
                   class="list-group-item list-group-item-action py-2 fade-in">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-1 text-truncate" style="max-width: 80%;">
                            ${this.capitalizeFirstLetter(job.jobTitle || job.postName || 'Untitled')}
                        </h6>
                    </div>
                    <p class="mb-1 small text-muted text-truncate company-name hover-effect">
                        ${this.capitalizeFirstLetter(job.companyName || job.bankName || 'Unknown Company')}
                    </p>
                    <div class="d-flex justify-content-between align-items-center content-container">
                        <small class="text-truncate" style="max-width: 60%;">
                            ${job.location || job.state || 'Location N/A'}
                        </small>
                        <small class="text-muted">
                            ${job.salary || ''}
                        </small>
                    </div>
                </a>`;
        }).join('');

        container.innerHTML = jobsHtml;
    }
    async renderSidebarJobs() {
        try {
            // Show loading states
            ['similarJobs', 'mostViewedJobs', 'recentJobs', 'companyJobs'].forEach(id => {
                const container = document.getElementById(id);
                if (container) {
                    container.innerHTML = `
                        <div class="loading-state">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>`;
                }
            });
    
            // Fetch jobs with different criteria
            const [similarJobs, mostViewedJobs, recentJobs] = await Promise.all([
                getDocs(query(
                    collection(db, 'jobs'),
                    where('isActive', '==', true),
                    limit(3)
                )),
                getDocs(query(
                    collection(db, 'jobs'),
                    where('isActive', '==', true),
                    orderBy('views', 'desc'),
                    limit(3)
                )),
                getDocs(query(
                    collection(db, 'jobs'),
                    where('isActive', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(3)
                ))
            ]);
    
            // Update section counts
            document.getElementById('similarJobsCount').textContent = similarJobs.size;
            document.getElementById('mostViewedJobsCount').textContent = mostViewedJobs.size;
            document.getElementById('recentJobsCount').textContent = recentJobs.size;
    
            // Render each section
            this.renderSidebarSection('similarJobs', similarJobs);
            this.renderMostViewedSection('mostViewedJobs', mostViewedJobs);
            this.renderRecentJobsSection('recentJobs', recentJobs);
            await this.renderCompanyWiseJobs();
    
        } catch (error) {
            console.error('Error loading sidebar jobs:', error);
            this.handleSidebarError();
        }
    }
}
    

// Call this function when loading job details
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');
    if (jobId) {

        new JobDetailsManager(); // Add 'new' keyword here
    }
});


