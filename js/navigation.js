// navigation.js
(function() {
    const navLinks = document.querySelectorAll('.header-link[data-page]');
    const pages = {};
    document.querySelectorAll('.page').forEach(p => pages[p.id] = p);

    function showPage(pageId) {
        Object.values(pages).forEach(p => p.classList.remove('active'));
        if (pages[pageId]) pages[pageId].classList.add('active');
        navLinks.forEach(link => link.classList.toggle('active', link.dataset.page === pageId));
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.dataset.page;
            if (pageId) {
                showPage(pageId);
                if (pageId === 'page-maps' && window.Maps) {
                    window.Maps.loadMaps();
                }
            }
        });
    });

    window.Navigation = {
        showPage: showPage
    };
})();
