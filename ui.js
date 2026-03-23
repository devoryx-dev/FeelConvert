class UIManager {
    constructor() {
        this.toastContainer = document.getElementById('toastContainer');
        this.previewModal = document.getElementById('previewModal');
        this.previewImage = document.getElementById('previewImage');
        this.previewInfo = document.getElementById('previewInfo');
        this.previewClose = document.getElementById('previewClose');
        this.previewBackdrop = document.getElementById('previewBackdrop');
        this.previewTabs = document.getElementById('previewTabs');
        this.previewOriginalView = document.getElementById('previewOriginalView');
        this.previewCompareView = document.getElementById('previewCompareView');
        this.compareBefore = document.getElementById('compareBefore');
        this.compareAfter = document.getElementById('compareAfter');
        this.compareAfterWrap = document.getElementById('compareAfterWrap');
        this.compareSlider = document.getElementById('compareSlider');
        this.compareHandle = document.getElementById('compareHandle');

        this.previewClose.addEventListener('click', () => this.closePreview());
        this.previewBackdrop.addEventListener('click', () => this.closePreview());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closePreview(); });

        this.previewTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.preview-modal__tab');
            if (!tab) return;
            this.previewTabs.querySelectorAll('.preview-modal__tab').forEach(t => t.classList.remove('preview-modal__tab--active'));
            tab.classList.add('preview-modal__tab--active');
            const view = tab.dataset.previewTab;
            this.previewOriginalView.style.display = view === 'original' ? '' : 'none';
            this.previewCompareView.style.display = view === 'compare' ? '' : 'none';
        });

        this._initCompareSlider();
    }

    _initCompareSlider() {
        let dragging = false;
        const move = (clientX) => {
            const rect = this.compareSlider.getBoundingClientRect();
            let pct = ((clientX - rect.left) / rect.width) * 100;
            pct = Math.max(2, Math.min(98, pct));
            this.compareAfterWrap.style.width = pct + '%';
            this.compareHandle.style.left = pct + '%';
        };
        this.compareSlider.addEventListener('mousedown', (e) => { dragging = true; move(e.clientX); });
        document.addEventListener('mousemove', (e) => { if (dragging) move(e.clientX); });
        document.addEventListener('mouseup', () => { dragging = false; });
        this.compareSlider.addEventListener('touchstart', (e) => { dragging = true; move(e.touches[0].clientX); }, { passive: true });
        document.addEventListener('touchmove', (e) => { if (dragging) move(e.touches[0].clientX); }, { passive: true });
        document.addEventListener('touchend', () => { dragging = false; });
    }

    showToast(message, type = 'info', duration = 3500) {
        const icons = { success: '✓', error: '✕', info: 'i', warning: '!' };
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `<span class="toast__icon">${icons[type] || 'i'}</span><span>${message}</span>`;
        this.toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); }, duration);
    }

    createFileCard(fileData) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.id = fileData.id;
        card.innerHTML = `
            <div class="file-card__progress"></div>
            <div class="file-card__thumb" data-preview-id="${fileData.id}">
                ${fileData.thumbUrl ? `<img src="${fileData.thumbUrl}" alt="${fileData.name}">` : `<span class="file-card__thumb-placeholder">${fileData.ext}</span>`}
            </div>
            <div class="file-card__info">
                <div class="file-card__name" title="${fileData.name}">${fileData.name}</div>
                <div class="file-card__meta">
                    <span class="file-card__size-original">${fileData.size}</span>
                    <span class="file-card__meta-dot"></span>
                    <span>${fileData.dimensions}</span>
                </div>
                <div class="file-card__status file-card__status--pending"><span class="file-card__status-dot"></span><span>Ready</span></div>
            </div>
            <div class="file-card__actions">
                <button class="file-card__download" data-id="${fileData.id}">Download</button>
                <button class="file-card__remove" data-id="${fileData.id}" title="Remove">×</button>
            </div>`;
        return card;
    }

    updateCardStatus(id, status, text) {
        const card = document.querySelector(`.file-card[data-id="${id}"]`);
        if (!card) return;
        const el = card.querySelector('.file-card__status');
        el.className = `file-card__status file-card__status--${status}`;
        el.querySelector('span:last-child').textContent = text;
    }

    updateCardProgress(id, progress) {
        const card = document.querySelector(`.file-card[data-id="${id}"]`);
        if (!card) return;
        const bar = card.querySelector('.file-card__progress');
        bar.style.width = progress + '%';
        if (progress >= 100) bar.classList.add('complete');
    }

    showDownloadButton(id) {
        const card = document.querySelector(`.file-card[data-id="${id}"]`);
        if (card) card.querySelector('.file-card__download').classList.add('visible');
    }

    updateCardSizeComparison(id, originalBytes, convertedBytes, convertedSize) {
        const card = document.querySelector(`.file-card[data-id="${id}"]`);
        if (!card) return;
        const el = card.querySelector('.file-card__size-original');
        if (!el) return;
        const diff = convertedBytes - originalBytes;
        const pct = originalBytes > 0 ? Math.round((diff / originalBytes) * 100) : 0;
        const smaller = diff < 0;
        const absPct = Math.abs(pct);
        let savings = absPct > 0 ? `<span class="file-card__size-savings${smaller ? '' : ' negative'}">${smaller ? '−' : '+'}${absPct}%</span>` : '';
        el.outerHTML = `<span class="file-card__size-compare"><span class="file-card__size-original">${el.textContent}</span><span class="file-card__size-arrow">→</span><span class="file-card__size-new${smaller ? '' : ' larger'}">${convertedSize}</span>${savings}</span>`;
    }

    removeCard(id) {
        const card = document.querySelector(`.file-card[data-id="${id}"]`);
        if (!card) return;
        card.classList.add('removing');
        setTimeout(() => card.remove(), 380);
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    openPreview(thumbUrl, name, dimensions, size, convertedUrl) {
        if (!thumbUrl) return;
        this.previewImage.src = thumbUrl;
        this.previewInfo.textContent = `${name} · ${dimensions} · ${size}`;
        this.previewTabs.querySelectorAll('.preview-modal__tab').forEach(t => t.classList.remove('preview-modal__tab--active'));
        this.previewTabs.querySelector('[data-preview-tab="original"]').classList.add('preview-modal__tab--active');
        this.previewOriginalView.style.display = '';
        this.previewCompareView.style.display = 'none';

        if (convertedUrl) {
            this.compareBefore.src = thumbUrl;
            this.compareAfter.src = convertedUrl;
            this.compareAfterWrap.style.width = '50%';
            this.compareHandle.style.left = '50%';
            this.previewTabs.querySelector('[data-preview-tab="compare"]').style.display = '';
        } else {
            this.previewTabs.querySelector('[data-preview-tab="compare"]').style.display = 'none';
        }

        this.previewModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closePreview() {
        this.previewModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    renderHistory(entries) {
        const list = document.getElementById('historyList');
        const clearBtn = document.getElementById('clearHistoryBtn');
        if (!entries || entries.length === 0) {
            list.innerHTML = '<p class="history-empty">No conversions yet.</p>';
            clearBtn.style.display = 'none';
            return;
        }
        clearBtn.style.display = '';
        list.innerHTML = entries.slice().reverse().slice(0, 30).map(e => {
            const savingClass = e.saving < 0 ? '' : ' negative';
            const savingText = e.saving !== 0 ? `<span class="history-item__saving${savingClass}">${e.saving < 0 ? '−' : '+'}${Math.abs(e.saving)}%</span>` : '';
            return `<div class="history-item"><span class="history-item__name">${e.name}</span><span class="history-item__detail">${e.from} → ${e.to}</span>${savingText}</div>`;
        }).join('');
    }
}

const ui = new UIManager();
