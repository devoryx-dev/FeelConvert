els.navTabs.addEventListener('click', e => { const t = e.target.closest('.navbar__tab'); if (t) switchTab(t.dataset.tab); });
els.mobileNav.addEventListener('click', e => { const t = e.target.closest('.mobile-nav__item'); if (t) switchTab(t.dataset.tab); });
document.addEventListener('click', e => { const l = e.target.closest('.tools-hint-link'); if (l) switchTab(l.dataset.tab); });
els.mobileMenuToggle.addEventListener('click', () => { els.mobileNav.style.display = els.mobileNav.style.display === 'flex' ? '' : 'flex'; });

els.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    saveHistory();
    ui.renderHistory([]);
    ui.showToast('History cleared', 'info');
});

els.themeToggle.addEventListener('click', () => { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });
els.settingsThemePicker.addEventListener('click', e => { const b = e.target.closest('.settings-theme-btn'); if (b) setTheme(b.dataset.setTheme); });
els.settingsDefaultFormat.addEventListener('change', () => { state.format = els.settingsDefaultFormat.value; $$('.format-btn').forEach(b => b.classList.toggle('format-btn--active', b.dataset.format === state.format)); updateFormatOptions(); saveSettings(); });
els.settingsDefaultQuality.addEventListener('input', () => { const v = parseInt(els.settingsDefaultQuality.value); state.quality = v/100; els.settingsQualityVal.textContent = v+'%'; els.qualitySlider.value = v; els.qualityValue.textContent = v+'%'; els.qualityFill.style.width = v+'%'; });
els.settingsDefaultQuality.addEventListener('change', saveSettings);
els.settingsNaming.addEventListener('change', () => { state.namingMode = els.settingsNaming.value; converter.namingMode = els.settingsNaming.value; saveSettings(); });

els.uploadZone.addEventListener('click', e => { if (!e.target.closest('.upload-zone__drag-overlay')) els.fileInput.click(); });
els.browseBtn.addEventListener('click', e => { e.stopPropagation(); els.fileInput.click(); });

let dragCounter = 0;
els.uploadZone.addEventListener('dragenter', e => { e.preventDefault(); dragCounter++; els.uploadZone.classList.add('drag-over'); if (e.dataTransfer?.items) { const c = e.dataTransfer.items.length; if (c > 0) { els.dragCount.textContent = `${c} file${c>1?'s':''}`; els.dragCount.classList.add('visible'); } } });
els.uploadZone.addEventListener('dragover', e => e.preventDefault());
els.uploadZone.addEventListener('dragleave', e => { e.preventDefault(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; els.uploadZone.classList.remove('drag-over'); els.dragCount.classList.remove('visible'); } });
els.uploadZone.addEventListener('drop', e => { e.preventDefault(); dragCounter = 0; els.uploadZone.classList.remove('drag-over'); els.dragCount.classList.remove('visible'); handleFiles(Array.from(e.dataTransfer.files)); });
els.fileInput.addEventListener('change', e => { handleFiles(Array.from(e.target.files)); els.fileInput.value = ''; });

async function handleFiles(files) {
    let added = 0;
    for (const file of files) {
        const v = converter.validateFile(file);
        if (!v.valid) { ui.showToast(v.error, 'error'); continue; }
        const id = 'file-' + (++state.idCounter);
        let thumbUrl = null, dimensions = '...';
        try { const r = await converter.loadImage(file); thumbUrl = r.url; dimensions = `${r.width}×${r.height}`; } catch { thumbUrl = null; dimensions = 'N/A'; }
        const fd = { id, file, name: file.name, ext: file.name.split('.').pop().toUpperCase(), size: converter.formatSize(file.size), sizeBytes: file.size, dimensions, thumbUrl, convertedBlob: null, convertedName: null, convertedUrl: null, status: 'pending' };
        state.files.set(id, fd);
        const card = ui.createFileCard(fd);
        els.filesList.appendChild(card);
        card.querySelector('.file-card__thumb').addEventListener('click', e => { e.stopPropagation(); ui.openPreview(fd.thumbUrl, fd.name, fd.dimensions, fd.size, fd.convertedUrl); });
        added++;
    }
    if (added > 0) { updateUI(); bumpCounter(); ui.showToast(`${added} file${added>1?'s':''} added`, 'success'); showFormatRecommendation(); }
}

function showFormatRecommendation() {
    const first = state.files.values().next().value;
    if (!first) return;
    const rec = converter.recommendFormat(first.file);
    if (rec && rec.format !== state.format) {
        els.formatRecText.textContent = `Suggested: ${rec.format.toUpperCase()} — ${rec.reason}`;
        els.formatRec.style.display = 'flex';
        els.formatRec.dataset.recFormat = rec.format;
    } else {
        els.formatRec.style.display = 'none';
    }
}

els.formatRecApply.addEventListener('click', () => {
    const fmt = els.formatRec.dataset.recFormat;
    if (fmt) { state.format = fmt; $$('.format-btn').forEach(b => b.classList.toggle('format-btn--active', b.dataset.format === fmt)); els.settingsDefaultFormat.value = fmt; updateFormatOptions(); saveSettings(); ui.showToast(`Switched to ${fmt.toUpperCase()}`, 'success'); }
    els.formatRec.style.display = 'none';
});

els.formatRecDismiss.addEventListener('click', () => els.formatRec.style.display = 'none');

els.formatSelector.addEventListener('click', e => {
    const b = e.target.closest('.format-btn'); if (!b) return;
    $$('.format-btn').forEach(x => x.classList.remove('format-btn--active'));
    b.classList.add('format-btn--active');
    state.format = b.dataset.format; els.settingsDefaultFormat.value = state.format;
    updateFormatOptions(); saveSettings(); els.formatRec.style.display = 'none';
});

els.qualitySlider.addEventListener('input', e => { const v = parseInt(e.target.value); state.quality = v/100; els.qualityValue.textContent = v+'%'; els.qualityFill.style.width = v+'%'; els.settingsDefaultQuality.value = v; els.settingsQualityVal.textContent = v+'%'; });
els.qualitySlider.addEventListener('change', saveSettings);
els.aspectLock.addEventListener('click', () => { state.aspectLocked = !state.aspectLocked; els.aspectLock.classList.toggle('locked', state.aspectLocked); });
els.aspectLock.classList.add('locked');

let at;
els.resizeWidth.addEventListener('input', () => { clearTimeout(at); at = setTimeout(() => { if (state.aspectLocked && els.resizeWidth.value && state.files.size > 0) { const f = state.files.values().next().value; if (f?.dimensions !== 'N/A') { const [ow,oh] = f.dimensions.split('×').map(Number); if (ow && oh) els.resizeHeight.value = Math.round((parseInt(els.resizeWidth.value)/ow)*oh); } } state.resizeWidth = els.resizeWidth.value ? parseInt(els.resizeWidth.value) : null; state.resizeHeight = els.resizeHeight.value ? parseInt(els.resizeHeight.value) : null; }, 200); });
els.resizeHeight.addEventListener('input', () => { clearTimeout(at); at = setTimeout(() => { if (state.aspectLocked && els.resizeHeight.value && state.files.size > 0) { const f = state.files.values().next().value; if (f?.dimensions !== 'N/A') { const [ow,oh] = f.dimensions.split('×').map(Number); if (ow && oh) els.resizeWidth.value = Math.round((parseInt(els.resizeHeight.value)/oh)*ow); } } state.resizeWidth = els.resizeWidth.value ? parseInt(els.resizeWidth.value) : null; state.resizeHeight = els.resizeHeight.value ? parseInt(els.resizeHeight.value) : null; }, 200); });
els.transparencyToggle.addEventListener('click', () => { state.preserveTransparency = !state.preserveTransparency; els.transparencyToggle.classList.toggle('active', state.preserveTransparency); });

els.convertBtn.addEventListener('click', startConversion);

async function startConversion() {
    if (state.converting || state.files.size === 0) return;
    state.converting = true; els.convertBtn.disabled = true; els.smartCompressBtn.disabled = true;
    els.convertBtn.classList.add('converting');
    els.convertBtn.querySelector('.btn__text').textContent = 'Converting...';
    els.convertBtn.querySelector('.btn__icon').textContent = '';
    els.globalProgress.classList.add('active'); els.globalProgressBar.style.width = '0%';
    const entries = Array.from(state.files.entries());
    let completed = 0, failed = 0;
    for (const [id, fd] of entries) {
        if (fd.status === 'done') { completed++; els.globalProgressBar.style.width = Math.round((completed/entries.length)*100)+'%'; continue; }
        ui.updateCardStatus(id, 'converting', 'Converting...'); ui.updateCardProgress(id, 20);
        try {
            ui.updateCardProgress(id, 50);
            const blob = await converter.convert(fd.file, { format: state.format, quality: state.quality, width: state.resizeWidth, height: state.resizeHeight, maintainAspect: state.aspectLocked, preserveTransparency: state.preserveTransparency });
            ui.updateCardProgress(id, 90);
            fd.convertedBlob = blob; fd.convertedName = converter.getOutputFilename(fd.name, state.format);
            if (fd.convertedUrl) URL.revokeObjectURL(fd.convertedUrl);
            fd.convertedUrl = URL.createObjectURL(blob); fd.status = 'done';
            ui.updateCardProgress(id, 100); ui.updateCardStatus(id, 'done', 'Conversion successful');
            ui.showDownloadButton(id); ui.updateCardSizeComparison(id, fd.sizeBytes, blob.size, converter.formatSize(blob.size));
            const saving = fd.sizeBytes > 0 ? Math.round(((blob.size - fd.sizeBytes) / fd.sizeBytes) * 100) : 0;
            addHistoryEntry(fd.name, fd.ext, state.format, saving);
            completed++;
        } catch { fd.status = 'error'; ui.updateCardStatus(id, 'error', 'Conversion failed'); ui.updateCardProgress(id, 0); ui.showToast(`Failed: ${fd.name}`, 'error'); failed++; completed++; }
        els.globalProgressBar.style.width = Math.round((completed/entries.length)*100)+'%';
        await new Promise(r => setTimeout(r, 40));
    }
    state.converting = false; els.convertBtn.disabled = false; els.smartCompressBtn.disabled = false;
    els.convertBtn.classList.remove('converting');
    els.convertBtn.querySelector('.btn__text').textContent = 'Convert All';
    els.convertBtn.querySelector('.btn__icon').textContent = '→';
    setTimeout(() => { els.globalProgress.classList.remove('active'); els.globalProgressBar.style.width = '0%'; }, 600);
    const ok = completed - failed;
    if (ok > 0 && failed === 0) ui.showToast(`${ok} file${ok>1?'s':''} converted!`, 'success');
    else if (ok > 0) ui.showToast(`${ok} converted, ${failed} failed`, 'warning');
    else if (failed > 0) ui.showToast('All conversions failed', 'error');
    updateUI();
}

els.smartCompressBtn.addEventListener('click', async () => {
    if (state.converting || state.files.size === 0) return;
    state.converting = true; els.convertBtn.disabled = true; els.smartCompressBtn.disabled = true;
    els.globalProgress.classList.add('active'); els.globalProgressBar.style.width = '0%';
    const fmt = ['jpeg','webp'].includes(state.format) ? state.format : 'webp';
    const entries = Array.from(state.files.entries());
    let completed = 0, failed = 0;
    for (const [id, fd] of entries) {
        ui.updateCardStatus(id, 'converting', 'Smart compressing...'); ui.updateCardProgress(id, 20);
        try {
            ui.updateCardProgress(id, 50);
            const result = await converter.smartCompress(fd.file, fmt);
            ui.updateCardProgress(id, 90);
            fd.convertedBlob = result.blob; fd.convertedName = converter.getOutputFilename(fd.name, fmt);
            if (fd.convertedUrl) URL.revokeObjectURL(fd.convertedUrl);
            fd.convertedUrl = URL.createObjectURL(result.blob); fd.status = 'done';
            ui.updateCardProgress(id, 100);
            ui.updateCardStatus(id, 'done', `Smart · Q${result.quality}`);
            ui.showDownloadButton(id); ui.updateCardSizeComparison(id, fd.sizeBytes, result.blob.size, converter.formatSize(result.blob.size));
            const saving = fd.sizeBytes > 0 ? Math.round(((result.blob.size - fd.sizeBytes) / fd.sizeBytes) * 100) : 0;
            addHistoryEntry(fd.name, fd.ext, fmt, saving);
            completed++;
        } catch { fd.status = 'error'; ui.updateCardStatus(id, 'error', 'Failed'); ui.updateCardProgress(id, 0); failed++; completed++; }
        els.globalProgressBar.style.width = Math.round((completed/entries.length)*100)+'%';
        await new Promise(r => setTimeout(r, 40));
    }
    state.converting = false; els.convertBtn.disabled = false; els.smartCompressBtn.disabled = false;
    setTimeout(() => { els.globalProgress.classList.remove('active'); els.globalProgressBar.style.width = '0%'; }, 600);
    const ok = completed - failed;
    if (ok > 0) ui.showToast(`Smart compressed ${ok} file${ok>1?'s':''}`, 'success');
    updateUI();
});

els.clearBtn.addEventListener('click', () => {
    if (state.files.size === 0) return;
    const c = state.files.size;
    state.files.forEach(fd => { if (fd.thumbUrl) URL.revokeObjectURL(fd.thumbUrl); if (fd.convertedUrl) URL.revokeObjectURL(fd.convertedUrl); });
    state.files.clear(); els.filesList.innerHTML = ''; els.resizeWidth.value = ''; els.resizeHeight.value = '';
    els.downloadAllBtn.style.display = 'none'; updateUI(); ui.showToast(`${c} file${c>1?'s':''} cleared`, 'info');
});

els.downloadAllBtn.addEventListener('click', async () => {
    const items = Array.from(state.files.values()).filter(f => f.convertedBlob).map(f => ({ name: f.convertedName, blob: f.convertedBlob }));
    if (items.length === 0) return;
    if (items.length === 1) { ui.downloadBlob(items[0].blob, items[0].name); return; }
    els.downloadAllBtn.disabled = true; els.downloadAllBtn.querySelector('span').textContent = 'Zipping...';
    try { const z = await converter.createZip(items); ui.downloadBlob(z, 'feelconvert-images.zip'); ui.showToast(`ZIP with ${items.length} files downloaded!`, 'success'); }
    catch { ui.showToast('Failed to create ZIP', 'error'); }
    els.downloadAllBtn.disabled = false; els.downloadAllBtn.querySelector('span').textContent = 'Download All (.zip)';
});

els.filesList.addEventListener('click', e => {
    const rm = e.target.closest('.file-card__remove'); if (rm) { removeFile(rm.dataset.id); return; }
    const dl = e.target.closest('.file-card__download'); if (dl) downloadFile(dl.dataset.id);
});

async function applyToolToFiles(operation) {
    if (state.files.size === 0) { ui.showToast('Upload images first', 'warning'); return; }
    els.globalProgress.classList.add('active'); els.globalProgressBar.style.width = '0%';
    const entries = Array.from(state.files.entries()); let processed = 0;
    for (const [id, fd] of entries) {
        try {
            const blob = await operation(fd.file);
            const newFile = new File([blob], fd.name, { type: blob.type });
            fd.file = newFile; fd.sizeBytes = blob.size; fd.size = converter.formatSize(blob.size);
            if (fd.thumbUrl) URL.revokeObjectURL(fd.thumbUrl);
            if (fd.convertedUrl) URL.revokeObjectURL(fd.convertedUrl);
            fd.convertedUrl = null;
            const { url, width, height } = await converter.loadImage(newFile);
            fd.thumbUrl = url; fd.dimensions = `${width}×${height}`;
            const card = document.querySelector(`.file-card[data-id="${id}"]`);
            if (card) {
                const thumb = card.querySelector('.file-card__thumb img'); if (thumb) thumb.src = url;
                const sizeEl = card.querySelector('.file-card__meta .file-card__size-original') || card.querySelector('.file-card__meta .file-card__size-compare');
                if (sizeEl) { const sp = document.createElement('span'); sp.className = 'file-card__size-original'; sp.textContent = fd.size; sizeEl.replaceWith(sp); }
            }
            fd.convertedBlob = null; fd.convertedName = null; fd.status = 'pending';
            ui.updateCardStatus(id, 'pending', 'Ready'); ui.updateCardProgress(id, 0);
            const dlBtn = document.querySelector(`.file-card__download[data-id="${id}"]`);
            if (dlBtn) dlBtn.classList.remove('visible');
        } catch { ui.showToast(`Failed: ${fd.name}`, 'error'); }
        processed++; els.globalProgressBar.style.width = Math.round((processed/entries.length)*100)+'%';
        await new Promise(r => setTimeout(r, 30));
    }
    setTimeout(() => { els.globalProgress.classList.remove('active'); els.globalProgressBar.style.width = '0%'; }, 500);
    ui.showToast(`Tool applied to ${processed} file${processed>1?'s':''}`, 'success'); updateUI();
}

document.addEventListener('click', e => {
    const rot = e.target.closest('[data-rotate]');
    if (rot) { applyToolToFiles(f => converter.applyRotation(f, parseInt(rot.dataset.rotate))); return; }
    const flip = e.target.closest('[data-flip]');
    if (flip) { applyToolToFiles(f => converter.applyFlip(f, flip.dataset.flip)); return; }
    const filt = e.target.closest('[data-filter]');
    if (filt) {
        const ft = filt.dataset.filter;
        if (ft === 'brightness') applyToolToFiles(f => converter.applyFilter(f, 'brightness', parseInt(els.brightnessSlider.value)));
        else if (ft === 'contrast') applyToolToFiles(f => converter.applyFilter(f, 'contrast', parseInt(els.contrastSlider.value)));
        else if (ft === 'saturate') applyToolToFiles(f => converter.applyFilter(f, 'saturate', parseInt(els.saturationSlider.value)));
        else if (ft === 'pixelate') applyToolToFiles(f => converter.applyFilter(f, 'pixelate', parseInt(els.pixelSlider.value)));
        else applyToolToFiles(f => converter.applyFilter(f, ft));
    }
});

els.brightnessSlider.addEventListener('input', () => els.brightnessVal.textContent = els.brightnessSlider.value + '%');
els.contrastSlider.addEventListener('input', () => els.contrastVal.textContent = els.contrastSlider.value + '%');
els.saturationSlider.addEventListener('input', () => els.saturationVal.textContent = els.saturationSlider.value + '%');
els.pixelSlider.addEventListener('input', () => els.pixelVal.textContent = els.pixelSlider.value + 'px');
