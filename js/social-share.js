class SocialShare {
    constructor() {
        this.init();
    }

    init() {
        this.createSocialBar();
    }

    createSocialBar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'social-share-sidebar';
        
        const socialButtons = [
            {
                name: 'facebook',
                icon: 'bi-facebook',
                url: 'https://www.facebook.com/profile.php?id=61575272554223'
            },
            {
                name: 'linkedin',
                icon: 'bi-linkedin',
                url: 'https://www.linkedin.com/in/bcv-world-7a294235a/'
            },
            {
                name: 'instagram',
                icon: 'bi-instagram',
                url: 'https://www.instagram.com/bcvworld18/'
            },
            
            {
                name: 'email',
                icon: 'bi-envelope-fill',
                url: 'mailto:help.bcv@bcvworld.com'
            },
            {
                name: 'whatsapp',
                icon: 'bi-whatsapp',
                url: 'https://whatsapp.com/channel/0029VasadwXLikgEikBhWE1o'
            },
            {
                name: 'telegram',
                icon: 'bi-telegram',
                url: 'https://t.me/bcvworld'
            },
            {
                name: 'github',
                icon: 'bi-github',
                url: 'https://github.com/bcvworld'
            }
        ];

        socialButtons.forEach(button => {
            const link = document.createElement('a');
            link.href = button.url;
            link.className = `social-share-btn ${button.name}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.innerHTML = `<i class="bi ${button.icon}"></i>`;
            
            if (button.name === 'email') {
                link.target = '_self';
            }
            
            sidebar.appendChild(link);
        });

        document.body.appendChild(sidebar);
    }
}

// Initialize social share
document.addEventListener('DOMContentLoaded', () => {
    new SocialShare();
});