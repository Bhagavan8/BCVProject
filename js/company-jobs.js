function toggleCompanyJobs(companyName) {
    const jobsList = document.getElementById(`jobs-${companyName.replace(/\s+/g, '-')}`);
    const header = jobsList.previousElementSibling;
    const icon = header.querySelector('.toggle-icon');
    
    if (jobsList) {
        const isHidden = jobsList.style.display === 'none';
        jobsList.style.display = isHidden ? 'block' : 'none';
        icon.classList.toggle('bi-chevron-down');
        icon.classList.toggle('bi-chevron-up');
    }
}