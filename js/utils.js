// utils.js
(function() {
    'use strict';

    window.Utils = {
        formatTime: function(seconds) {
            if (!isFinite(seconds)) return '00:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },

        apiRequest: function(url, method, body) {
            return fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            }).then(res => res.json());
        },

        playNotificationSound: function() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;
                oscillator.start();
                setTimeout(() => oscillator.stop(), 150);
            } catch (e) {}
        },

        showLoading: function(container, text) {
            container.innerHTML = `<div class="no-data">${text || 'Загрузка...'}</div>`;
        },

        createTreeNode: function(item) {
            const wrapper = document.createElement('div');
            wrapper.className = 'atak-node';
            const header = document.createElement('div');
            header.className = 'node-header';
            const titleSpan = document.createElement('span');
            titleSpan.textContent = item.title || 'Без названия';
            header.appendChild(titleSpan);
            const hasChildren = item.children && item.children.length > 0;
            const hasContent = item.content && item.content.trim().length > 0;
            if (hasChildren || hasContent) {
                const arrow = document.createElement('span');
                arrow.className = 'arrow';
                arrow.textContent = '▶';
                header.appendChild(arrow);
                const childContainer = document.createElement('div');
                childContainer.className = 'node-children';
                if (hasContent) {
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'node-content';
                    contentDiv.innerHTML = item.content;
                    childContainer.appendChild(contentDiv);
                }
                if (hasChildren) {
                    item.children.forEach(child => {
                        const childNode = window.Utils.createTreeNode(child);
                        childContainer.appendChild(childNode);
                    });
                }
                wrapper.appendChild(header);
                wrapper.appendChild(childContainer);
                header.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const arrowEl = this.querySelector('.arrow');
                    const childrenEl = this.parentElement.querySelector('.node-children');
                    if (childrenEl) {
                        childrenEl.classList.toggle('open');
                        if (arrowEl) arrowEl.classList.toggle('open');
                    }
                });
            } else {
                wrapper.classList.add('node-leaf');
                wrapper.appendChild(header);
            }
            return wrapper;
        },

        openLightbox: function(imgSrc) {
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            if (!lightbox || !lightboxImg) return;
            lightboxImg.src = imgSrc;
            lightbox.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        },

        closeLightbox: function() {
            const lightbox = document.getElementById('lightbox');
            if (!lightbox) return;
            lightbox.style.display = 'none';
            document.body.style.overflow = '';
        },

        initLightbox: function() {
            const lightbox = document.getElementById('lightbox');
            const closeBtn = document.querySelector('#lightbox .close-btn');
            if (!lightbox) return;

            if (closeBtn) {
                closeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    window.Utils.closeLightbox();
                });
            }

            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    window.Utils.closeLightbox();
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && lightbox.style.display === 'flex') {
                    window.Utils.closeLightbox();
                }
            });
        }
    };

    window.openLightbox = window.Utils.openLightbox;
    window.closeLightbox = window.Utils.closeLightbox;
})();
