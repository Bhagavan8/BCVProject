import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";



async function getJobs(jobType) {
    try {
        let jobsRef;
        let q;
        
        switch(jobType) {
            case 'private':
                jobsRef = collection(db, 'jobs');
                q = query(jobsRef, where('isActive', '==', true));
                break;
            case 'government':
                jobsRef = collection(db, 'governmentJobs');
                q = query(jobsRef, where('isActive', '==', true));
                break;
            case 'bank':
                jobsRef = collection(db, 'bankJobs');
                q = query(jobsRef, where('isActive', '==', true));
                break;
            default:
                jobsRef = collection(db, 'jobs');
                q = query(jobsRef, where('isActive', '==', true));
        }

        const snapshot = await getDocs(q);
        console.log(`Fetched ${snapshot.size} ${jobType} jobs`);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            type: jobType,
            ...doc.data()
        }));
        
    } catch (error) {
        console.error(`Error getting ${jobType} jobs:`, error);
        return [];
    }
}



function createJobCard(job, type) {
    const getValue = (value, defaultValue = 'Not specified') => value || defaultValue;
    const headerSection = `
        <div class="card-header-section">
            <div class="card-header-content">
                <div class="logo-container">
                    ${type == 'bank' ? `
                        <i class="bi bi-bank2 icon-large text-primary"></i>
                    ` : type == 'government' ? `
                        <i class="bi bi-building-fill icon-large text-danger"></i>
                    ` : `
                        <img src="/assets/images/companies/${getValue(job.companyLogo, 'default-company.png')}" 
                            alt="${getValue(job.companyName)} Logo" 
                            class="company-logo">
                    `}
                </div>
                <div class="header-info">
                    <h3 class="company-title">
                        ${getValue(type == 'bank' ? job.bankName : 
                                 type == 'government' ? job.department : 
                                 job.companyName)}
                    </h3>
                    <p class="job-title">
                        ${getValue(type == 'private' ? job.jobTitle : job.postName)}
                    </p>
                </div>
            </div>
        </div>`;

    const detailsSection = `
        <div class="job-details">
            <div class="details-item">
                <i class="bi bi-geo-alt"></i>
                <span>${getValue(job.state || job.location)}</span>
            </div>
            ${type === 'private' ? `
                <div class="details-item">
                    <i class="bi bi-briefcase"></i>
                    <span>${getValue(job.experience)} Years</span>
                </div>
                <div class="details-item">
                    <i class="bi bi-mortarboard"></i>
                    <span>${getValue(job.educationLevel)?.charAt(0).toUpperCase() + getValue(job.educationLevel)?.slice(1) || 'Not specified'}</span>
                </div>
            ` : `
                <div class="details-item">
                    <i class="bi bi-people"></i>
                    <span>${getValue(job.vacancies)} Vacancies</span>
                </div>
                <div class="details-item">
                    <i class="bi bi-mortarboard"></i>
                    <span>${getValue(job.qualification)}</span>
                </div>
                ${job.ageLimit ? `
                    <div class="details-item">
                        <i class="bi bi-person"></i>
                        <span>Age Limit: ${job.ageLimit} years</span>
                    </div>
                ` : ''}
            `}
        </div>`;

    const footerSection = `
        <div class="card-footer">
            ${type === 'private' && job.skills ? `
                <div class="skills-info mb-2">
                    <div class="skills-list">
                        ${job.skills.slice(0, 7).map(skill => `
                            <span class="badge bg-light text-dark me-1">${skill}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            <div class="footer-info">
                <span class="post-date">
                    <i class="bi bi-clock"></i> Posted: ${
                        type === 'bank' 
                        ? formatTimeAgo(job.postedAt)
                        : formatDate(job.createdAt)
                    }
                </span>
                ${(type === 'bank' || type === 'government') && job.lastDate ? `
                    <span class="deadline">
                        <i class="bi bi-calendar-event"></i> Last Date: ${formatDate(job.lastDate)}
                    </span>
                ` : ''}
            </div>
            <div class="action-buttons">
                <a href="${job.applicationLink}" target="_blank" download class="btn btn-primary btn-sm">
                    Apply Now
                </a>
                ${job.notificationFile ? `
                    <a href="${job.notificationFile}"  target="_blank" download class="btn btn-outline-secondary btn-sm">
                        <i class="bi bi-file-text"></i> Notification
                    </a>
                ` : ''}
            </div>
        </div>`;

    return `
        <div class="job-card ${type}-job" data-job-id="${job.id}" data-job-type="${type}">
            ${headerSection}
            ${detailsSection}
            ${footerSection}
        </div>
    `;
}
function displayJobs(jobs) {
    const jobsGrid = document.getElementById('jobsGrid');
    if (!jobsGrid) return;

    // Show loading state first
    jobsGrid.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div></div>';

    // Check if we have jobs to display
    if (!jobs || Object.values(jobs).every(list => list.length === 0)) {
        jobsGrid.innerHTML = '<div class="alert alert-info">No jobs found</div>';
        return;
    }

    // Combine all jobs into a single array
    const allJobs = Object.entries(jobs).reduce((acc, [type, jobsList]) => {
        return acc.concat(jobsList.map(job => ({ ...job, type })));
    }, []);

    // Pagination configuration
    const jobsPerPage = 10;
    const currentPage = parseInt(new URLSearchParams(window.location.search).get('page')) || 1;
    const totalPages = Math.ceil(allJobs.length / jobsPerPage);
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    const paginatedJobs = allJobs.slice(startIndex, endIndex);

    // Create jobs HTML
    const jobsHTML = `
        <div class="jobs-container">
            ${paginatedJobs.map(job => `
                <div class="job-item">
                    ${createJobCard(job, job.type)}
                </div>
            `).join('')}
        </div>
        ${totalPages > 1 ? createPaginationControls(currentPage, totalPages) : ''}
    `;

    jobsGrid.innerHTML = jobsHTML;

    // Update total jobs count
    const jobCountElement = document.getElementById('jobCount');
    if (jobCountElement) {
        jobCountElement.textContent = allJobs.length;
    }

    // Setup pagination click handlers
    setupPaginationHandlers();
    
    // Setup job card click handlers
    jobsGrid.addEventListener('click', handleJobCardClick);
    
    // Update category counts
    updateCategoryCounts();
}

// Add these new functions for pagination
function createPaginationControls(currentPage, totalPages) {
    let paginationHTML = `
        <div class="pagination-container mt-4">
            <nav aria-label="Job listings pagination">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}">
                            <i class="bi bi-chevron-left"></i>
                        </a>
                    </li>`;

    // Add page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || // First page
            i === totalPages || // Last page
            (i >= currentPage - 2 && i <= currentPage + 2) // Pages around current page
        ) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>`;
        }
    }

    paginationHTML += `
                <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${currentPage + 1}">
                        <i class="bi bi-chevron-right"></i>
                    </a>
                </li>
            </ul>
        </nav>
    </div>`;

    return paginationHTML;
}

function setupPaginationHandlers() {
    document.querySelectorAll('.pagination .page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.closest('.page-link').dataset.page;
            if (page) {
                const url = new URL(window.location);
                url.searchParams.set('page', page);
                window.history.pushState({}, '', url);
                // Reload jobs with new page
                initializeJobs();
            }
        });
    });
}
async function filterByCategory(category) {
    try {
        const jobs = {};
        const categoryLower = category.toLowerCase();
        
        if (categoryLower === 'all') {
            // Get all types of jobs
            jobs.bank = await getJobs('bank');
            jobs.government = await getJobs('government');
            jobs.private = await getJobs('private');
        } else if (categoryLower === 'bank') {
            jobs.bank = await getJobs('bank');
        } else if (categoryLower === 'government') {
            jobs.government = await getJobs('government');
        } else {
            // For private job categories (IT, marketing, finance, sales, hr)
            const jobsRef = collection(db, 'jobs');
            const q = query(
                jobsRef,
                where('isActive', '==', true),
                where('jobCategory', '==', category)
            );
            const snapshot = await getDocs(q);
            jobs.private = snapshot.docs.map(doc => ({
                id: doc.id,
                type: 'private',
                ...doc.data()
            }));
        }
        displayJobs(jobs);
    } catch (error) {
        console.error('Error filtering by category:', error);
    }
}

// Make function globally available
window.filterByCategory = filterByCategory;

async function updateCategoryCounts() {
    try {
        // Get total count for all jobs
        const [bankSnapshot, govSnapshot, privateSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'bankJobs'), where('isActive', '==', true))),
            getDocs(query(collection(db, 'governmentJobs'), where('isActive', '==', true))),
            getDocs(query(collection(db, 'jobs'), where('isActive', '==', true)))
        ]);
        
        const totalCount = bankSnapshot.size + govSnapshot.size + privateSnapshot.size;
        const allCountElement = document.getElementById('allCount');
        if (allCountElement) {
            allCountElement.textContent = totalCount;
        }

        // For private job categories
        const categories = ['IT', 'marketing', 'finance', 'sales', 'hr'];
        for (const category of categories) {
            const q = query(
                collection(db, 'jobs'),
                where('jobCategory', '==', category),
                where('jobType', '==', 'private')  
            );
           
            const snapshot = await getDocs(q);
            const countElement = document.getElementById(`${category.toLowerCase()}Count`);
            if (countElement) {
                countElement.textContent = snapshot.size || '0';
            }
        }
        
        // For bank jobs
        const bankQ = query(
            collection(db, 'bankJobs'),
            where('isActive', '==', true),
            where('jobType', '==', 'bank')  // Added type check
        );
        const bankCount = document.getElementById('bankCount');
        if (bankCount) {
            bankCount.textContent = bankSnapshot.size || '0';
        }

        // For government jobs
        const govQ = query(
            collection(db, 'governmentJobs'),
            where('jobType', '==', 'government')  // Added type check
        );
        const govCount = document.getElementById('govCount');
        if (govCount) {
            govCount.textContent = govSnapshot.size || '0';
        }

    } catch (error) {
        console.error('Error updating category counts:', error);
        // Set all counts to 0 if there's an error
        const categories = ['it', 'marketing', 'finance', 'sales', 'hr', 'bank', 'gov'];
        categories.forEach(cat => {
            const element = document.getElementById(`${cat}Count`);
            if (element) element.textContent = '0';
        });
    }
}

// Call updateCategoryCounts when the page loads
document.addEventListener('DOMContentLoaded', () => {
    updateCategoryCounts();
    loadSidebarJobs();
    loadCompanyWiseJobs();
});

async function initializeJobs() {
    try {
        const jobs = {
            bank: await getJobs('bank'),
            government: await getJobs('government'),
            private: await getJobs('private')
        };
        displayJobs(jobs);
    } catch (error) {
        console.error('Error initializing jobs:', error);
    }
}


document.addEventListener('DOMContentLoaded', initializeJobs);

// Handle job type filter changes
document.getElementById('jobTypeFilter')?.addEventListener('change', async (e) => {
    const selectedType = e.target.value;
    try {
        const jobs = {};
        if (selectedType === 'all') {
            jobs.bank = await getJobs('bank');
            jobs.government = await getJobs('government');
            jobs.private = await getJobs('private');
        } else {
            jobs[selectedType] = await getJobs(selectedType);
        }
        displayJobs(jobs);
    } catch (error) {
        console.error('Error filtering jobs:', error);
    }
});

function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    
    const now = Date.now();
    const timeStampMs = timestamp.seconds * 1000;
    const diffInSeconds = Math.floor((now - timeStampMs) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(diffInSeconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval}${unit.charAt(0)} ago`;
        }
    }
    
    return 'Just now';
}

function formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    
    // Handle Firestore Timestamp
    let date;
    if (dateInput && dateInput.seconds) {
        date = new Date(dateInput.seconds * 1000);
    } else {
        date = new Date(dateInput);
    }

    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function handleJobCardClick(e) {
    const applyButton = e.target.closest('.btn-primary');
    if (!applyButton) return;

    const jobCard = e.target.closest('.job-card');
    if (!jobCard) return;

    e.preventDefault();
    const { jobId, jobType } = jobCard.dataset;
    window.location.href = `/job-details.html?id=${jobId}&type=${jobType}`;
} // Add missing closing brace

// Add missing export statement if needed
export { getJobs, filterByCategory, updateCategoryCounts, initializeJobs };

window.handleFilters = debounce(() => {
    applyFilters();
}, 300);

window.applyFilters = async () => {
    const jobType = document.getElementById('jobTypeFilter').value;
    const location = document.getElementById('locationFilter').value;
    const isFresher = document.getElementById('fresherCheck').checked;
    const isExperienced = document.getElementById('experiencedCheck').checked;
    const salaryRange = document.getElementById('salaryRange').value;

    try {
        let jobs = {};
        let totalJobs = 0;
        if (jobType === 'all' || jobType === 'bank') {
            const bankRef = collection(db, 'bankJobs');
            const conditions = [where('isActive', '==', true)];
            if (location !== 'all') {
                conditions.push(where('location', '==', location));
            }
            const bankSnapshot = await getDocs(query(bankRef, ...conditions));
            jobs.bank = bankSnapshot.docs.map(doc => ({ id: doc.id, type: 'bank', ...doc.data() }));
            totalJobs += jobs.bank.length;
        }

        if (jobType === 'all' || jobType === 'government') {
            const govRef = collection(db, 'governmentJobs');
            const conditions = [where('isActive', '==', true)];
            if (location !== 'all') {
                conditions.push(where('location', '==', location));
            }
            const govSnapshot = await getDocs(query(govRef, ...conditions));
            jobs.government = govSnapshot.docs.map(doc => ({ id: doc.id, type: 'government', ...doc.data() }));
            totalJobs += jobs.government.length;
        }

        if (jobType === 'all' || jobType === 'private') {
            const privateRef = collection(db, 'jobs');
            const conditions = [where('isActive', '==', true)];
            
            if (location !== 'all') {
                conditions.push(where('location', '==', location));
            }

            // Experience filter
            if (isFresher && !isExperienced) {
                conditions.push(where('jobType', '==', 'private'));
                conditions.push(where('experience', '==', 'fresher'));
            
            } else if (!isFresher && isExperienced) {
                conditions.push(where('jobType', '==', 'private'));
                console.log("hheet");
                
            }
            console.log(conditions);
            
            
            // if (parseInt(salaryRange) > 0) {
            //     conditions.push(where('salary', '>=', `${salaryRange} Lakh CTC Per Annum`));
            //     conditions.push(where('salary', '>=', salaryRange));
            // }
            const privateSnapshot = await getDocs(query(privateRef, ...conditions));
            jobs.private = privateSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'private',
                ...doc.data()
            }));
            totalJobs += jobs.private.length; // Add private jobs to total
        }
        const jobCountElement = document.getElementById('jobCount');
        if (jobCountElement) {
            jobCountElement.textContent = totalJobs;
        }

        displayJobs(jobs);

    } catch (error) {
        console.error('Error applying filters:', error);
        const jobsGrid = document.getElementById('jobsGrid');
        if (jobsGrid) {
            jobsGrid.innerHTML = '<div class="alert alert-danger">Error filtering jobs. Please try again.</div>';
        }
        const jobCountElement = document.getElementById('jobCount');
        if (jobCountElement) {
            jobCountElement.textContent = '0';
        }
    }
};
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
window.updateSalaryValue = (value) => {
    document.getElementById('salaryValue').textContent = `₹${value}L+`;
};

async function getRecentJobs(limit = 3) {
    try {
        const jobsRef = collection(db, 'jobs');
        const q = query(
            jobsRef, 
            where('isActive', '==', true),
            orderBy('createdAt', 'desc'),
        );
        
        const snapshot = await getDocs(q);
        const jobs = snapshot.docs.map(doc => ({
            id: doc.id,
            type: 'private',
            title: doc.data().jobTitle,
            company: doc.data().companyName,
            location: doc.data().location,
            createdAt: doc.data().createdAt,
            postedAt: formatDate(doc.data().createdAt) // Add formatted date
        }));

        return jobs
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, limit);
    } catch (error) {
        console.error('Error fetching recent jobs:', error);
        return [];
    }
}

async function getMostViewedJobs(limit = 5) {
    try {
        const allJobs = [];
        const jobTypes = ['bank', 'government', 'private'];

        for (const type of jobTypes) {
            const jobsRef = collection(db, type === 'private' ? 'jobs' : `${type}Jobs`);
            const q = query(jobsRef, where('isActive', '==', true));
            const snapshot = await getDocs(q);
            const jobs = snapshot.docs.map(doc => ({
                id: doc.id,
                type,
                title: type === 'private' ? doc.data().jobTitle : doc.data().postName,
                company: type === 'private' ? doc.data().companyName : 
                         type === 'bank' ? doc.data().bankName : 
                         doc.data().department,
                location: doc.data().location || doc.data().state,
                views: doc.data().views || 0
            }));
            allJobs.push(...jobs);
        }

        return allJobs
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, limit);
    } catch (error) {
        console.error('Error fetching most viewed jobs:', error);
        return [];
    }
}

const loadSidebarJobs = async () => {
    try {
        const recentJobs = await getRecentJobs(3);
        const mostViewedJobs = await getMostViewedJobs(3);

        // Update counts in the headers
        const recentCount = document.getElementById('recentJobsCount');
        const viewedCount = document.getElementById('mostViewedJobsCount');
        if (recentCount) recentCount.textContent = recentJobs.length;
        if (viewedCount) viewedCount.textContent = mostViewedJobs.length;

        ['recentJobs', 'mostViewedJobs'].forEach((containerId, containerIndex) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            const jobs = containerId === 'recentJobs' ? recentJobs : mostViewedJobs;
            
            container.innerHTML = jobs.map((job, index) => `
                <a href="/job-details.html?id=${job.id}&type=${job.type}" 
                   class="list-group-item list-group-item-action py-2 fade-in"
                   style="animation-delay: ${index * 0.1}s">
                    <div class="d-flex justify-content-between align-items-start">
                        <h6 class="mb-1 text-truncate" style="max-width: 80%;">${job.title}</h6>
                        ${containerId === 'mostViewedJobs' ? 
                            `<span class="badge bg-primary rounded-pill">#${index + 1}</span>` : ''}
                    </div>
                    <p class="mb-1 small text-muted text-truncate company-name hover-effect">${job.company}</p>
                    <div class="d-flex justify-content-between align-items-center content-container">
                        <small class="text-truncate" style="max-width: 60%;">${job.location}</small>
                        ${containerId === 'mostViewedJobs' ? 
                            `<small class="text-muted"><i class="bi bi-eye-fill"></i> ${job.views}</small>` : 
                            `<small class="text-muted"><i class="bi bi-calendar"></i> ${job.postedAt}</small>`}
                    </div>
                </a>
            `).join('');
        });
    } catch (error) {
        console.error('Error loading sidebar jobs:', error);
    }
};

window.handleSearch = debounce(async (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();
    const jobsGrid = document.getElementById('jobsGrid');
    
    if (!jobsGrid) return;

    try {
        // Show loading state
        jobsGrid.innerHTML = searchTerm ? 
            '<div class="text-center w-100 py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>' : '';

        // Get all jobs
        const jobs = {
            bank: await getJobs('bank'),
            government: await getJobs('government'),
            private: await getJobs('private')
        };

        // Filter jobs based on search term
        const filteredJobs = {};
        Object.entries(jobs).forEach(([type, jobsList]) => {
            filteredJobs[type] = jobsList.filter(job => {
                const searchableText = `
                    ${job.title?.toLowerCase() || ''} 
                    ${job.company ? job.company.charAt(0).toUpperCase() + job.company.slice(1).toLowerCase() : ''} 
                    ${job.location?.toLowerCase() || ''} 
                    ${job.description?.toLowerCase() || ''} 
                    ${job.skills?.join(' ').toLowerCase() || ''}
                `;
                return searchableText.includes(searchTerm);
            });
        });

        // Update job count
        const totalJobs = Object.values(filteredJobs).reduce((acc, curr) => acc + curr.length, 0);
        const jobCountElement = document.getElementById('jobCount');
        if (jobCountElement) {
            jobCountElement.textContent = totalJobs;
        }

        // Display filtered jobs
        displayJobs(filteredJobs);

    } catch (error) {
        console.error('Search error:', error);
        jobsGrid.innerHTML = '<div class="alert alert-danger">Error searching jobs. Please try again.</div>';
    }
}, 300); // 300ms debounce delay

// Prevent form submission
document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
});

async function loadCompanyWiseJobs() {
    try {
        const jobsRef = collection(db, 'jobs');
        const q = query(jobsRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);
        
        // Group jobs by company
        const companies = {};
        snapshot.docs.forEach(doc => {
            const job = doc.data();
            if (!companies[job.companyName]) {
                companies[job.companyName] = {
                    jobs: [],
                    logo: job.companyLogo || 'default-company.png'
                };
            }
            companies[job.companyName].jobs.push({
                id: doc.id,
                ...job
            });
        });

        // Update company count
        const companyCount = document.getElementById('companyCount');
        if (companyCount) {
            companyCount.textContent = Object.keys(companies).length;
        }

        // Display companies
        const companyJobsContainer = document.getElementById('companyJobs');
        if (companyJobsContainer) {
            companyJobsContainer.innerHTML = Object.entries(companies)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([companyName, data]) => `
                    <div class="list-group-item company-item py-3" onclick="showCompanyRoles('${companyName}')">
                        <div class="d-flex align-items-center">
                            <div class="company-logo me-3">
                                <img src="/assets/images/companies/${data.logo}" 
                                     alt="${companyName}" 
                                     class="rounded-circle"
                                     style="width: 40px; height: 40px; object-fit: cover;">
                            </div>
                            <div>
                                <h6 class="mb-1 company-name">${companyName}</h6>
                                <small class="job-count">${data.jobs.length} open position${data.jobs.length > 1 ? 's' : ''}</small>
                            </div>
                        </div>
                    </div>
                `).join('');
        }
    } catch (error) {
        console.error('Error loading company wise jobs:', error);
    }
}

window.showCompanyRoles = async (companyName) => {
    const companyJobs = document.getElementById('companyJobs');
    const companyRoles = document.getElementById('companyRoles');
    
    try {
        const jobsRef = collection(db, 'jobs');
        const q = query(
            jobsRef, 
            where('isActive', '==', true),
            where('companyName', '==', companyName)
        );
        const snapshot = await getDocs(q);
        
        companyRoles.innerHTML = `
            <div class="p-2 border-bottom">
                <button class="btn btn-link btn-sm text-decoration-none p-0" onclick="showCompanyList()">
                    <i class="bi bi-arrow-left"></i> Back to Companies
                </button>
            </div>
            ${snapshot.docs.map(doc => {
                const job = doc.data();
                return `
                    <a href="/job-details.html?id=${doc.id}&type=private" 
                       class="list-group-item list-group-item-action role-item py-3">
                        <h6 class="mb-1">${job.jobTitle}</h6>
                        <div class="d-flex align-items-center justify-content-between">
                            <small class="text-muted">
                                <i class="bi bi-geo-alt"></i> ${job.location}
                            </small>
                            <small class="text-muted">
                                <i class="bi bi-clock"></i> ${formatDate(job.createdAt)}
                            </small>
                        </div>
                    </a>
                `;
            }).join('')}
        `;
        
        companyJobs.classList.add('d-none');
        companyRoles.classList.remove('d-none');
    } catch (error) {
        console.error('Error loading company roles:', error);
    }
};

window.showCompanyList = () => {
    const companyJobs = document.getElementById('companyJobs');
    const companyRoles = document.getElementById('companyRoles');
    
    companyRoles.classList.add('d-none');
    companyJobs.classList.remove('d-none');
};

async function populateLocationFilter() {
    try {
        const locations = new Set();
        
        // Get locations from private jobs
        const privateRef = collection(db, 'jobs');
        const privateSnapshot = await getDocs(privateRef);
        privateSnapshot.docs.forEach(doc => {
            const location = doc.data().location;
            if (location) locations.add(location);
        });

        // Get locations from bank jobs
        const bankRef = collection(db, 'bankJobs');
        const bankSnapshot = await getDocs(bankRef);
        bankSnapshot.docs.forEach(doc => {
            const state = doc.data().state;
            if (state) locations.add(state);
        });

        // Get locations from government jobs
        const govRef = collection(db, 'governmentJobs');
        const govSnapshot = await getDocs(govRef);
        govSnapshot.docs.forEach(doc => {
            const state = doc.data().state;
            if (state) locations.add(state);
        });

        // Sort locations alphabetically
        const sortedLocations = Array.from(locations).sort();

        // Populate the select element
        const locationFilter = document.getElementById('locationFilter');
        sortedLocations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationFilter.appendChild(option);
        });

    } catch (error) {
        console.error('Error populating location filter:', error);
    }
}
window.clearFilters = async () => {
    // Reset all filters to default values
    document.getElementById('jobTypeFilter').value = 'all';
    document.getElementById('locationFilter').value = 'all';
    document.getElementById('fresherCheck').checked = false;
    document.getElementById('experiencedCheck').checked = false;
    document.getElementById('salaryRange').value = 5;
    document.getElementById('salaryValue').textContent = '₹5L+';

    // Fetch and display all jobs
    try {
        let jobs = {};
        jobs.bank = await getJobs('bank');
        jobs.government = await getJobs('government');
        jobs.private = await getJobs('private');
        displayJobs(jobs);
    } catch (error) {
        console.error('Error clearing filters:', error);
    }
};
// Call this function when the page loads
document.addEventListener('DOMContentLoaded', populateLocationFilter);
