function switchTab(tabId) {
    state.activeTab = tabId;
    $$('.tab-content').forEach(tc => tc.classList.remove('tab-content--active'));
    const target = $(`#tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    if (target) requestAnimationFrame(() => target.classList.add('tab-content--active'));
    $$('.navbar__tab').forEach(t => t.classList.toggle('navbar__tab--active', t.dataset.tab === tabId));
    $$('.mobile-nav__item').forEach(t => t.classList.toggle('mobile-nav__item--active', t.dataset.tab === tabId));
    updateTabIndicator();
    updateToolsStatus();
    if (tabId === 'settings') ui.renderHistory(state.history);
}

function updateTabIndicator() {
    const active = $('.navbar__tab--active');
    if (!active || !els.tabIndicator) return;
    const tr = els.navTabs.getBoundingClientRect(), br = active.getBoundingClientRect();
    els.tabIndicator.style.left = (br.left - tr.left) + 'px';
    els.tabIndicator.style.width = br.width + 'px';
}

function updateToolsStatus() {
    const c = state.files.size;
    els.toolsHint.style.display = c > 0 ? 'none' : 'flex';
    els.toolsReady.style.display = c > 0 ? 'flex' : 'none';
    if (c > 0) els.toolsReadyCount.textContent = `${c} file${c !== 1 ? 's' : ''}`;
}

function loadHistory() {
    try { state.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { state.history = []; }
}

function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(-50))); } catch {}
}

function addHistoryEntry(name, fromExt, toFormat, saving) {
    state.history.push({ name, from: fromExt.toUpperCase(), to: toFormat.toUpperCase(), saving, time: Date.now() });
    saveHistory();
}

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY); if (!raw) return;
        const s = JSON.parse(raw);
        if (s.format && converter.FORMAT_EXT[s.format]) {
            state.format = s.format;
            $$('.format-btn').forEach(b => b.classList.toggle('format-btn--active', b.dataset.format === s.format));
            els.settingsDefaultFormat.value = s.format;
        }
        if (typeof s.quality === 'number' && s.quality >= 0.01 && s.quality <= 1) {
            state.quality = s.quality;
            const p = Math.round(s.quality * 100);
            els.qualitySlider.value = p; els.qualityValue.textContent = p + '%';
            els.qualityFill.style.width = p + '%';
            els.settingsDefaultQuality.value = p; els.settingsQualityVal.textContent = p + '%';
        }
        if (s.naming) { state.namingMode = s.naming; converter.namingMode = s.naming; els.settingsNaming.value = s.naming; }
        if (s.themeMode) syncThemePicker(s.themeMode);
    } catch {}
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ format: state.format, quality: state.quality, naming: state.namingMode, themeMode: getActiveThemeMode() }));
        flashSettingsSaved();
    } catch {}
}

function getActiveThemeMode() { const a = els.settingsThemePicker.querySelector('.settings-theme-btn--active'); return a ? a.dataset.setTheme : 'light'; }

let savedTimeout;
function flashSettingsSaved() {
    els.settingsSaved.classList.add('visible');
    clearTimeout(savedTimeout);
    savedTimeout = setTimeout(() => els.settingsSaved.classList.remove('visible'), 1800);
}

function initTheme() {
    let mode = 'light';
    try { const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); if (s.themeMode) mode = s.themeMode; } catch {}
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) { document.documentElement.setAttribute('data-theme', saved); mode = saved; }
    else if (mode === 'auto') { const d = window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light'); }
    else document.documentElement.setAttribute('data-theme', mode);
    syncThemePicker(mode);
}

function setTheme(mode) {
    if (mode === 'auto') { const d = window.matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light'); localStorage.setItem(THEME_KEY, d ? 'dark' : 'light'); }
    else { document.documentElement.setAttribute('data-theme', mode); localStorage.setItem(THEME_KEY, mode); }
    syncThemePicker(mode); saveSettings();
}

function syncThemePicker(mode) { $$('.settings-theme-btn').forEach(b => b.classList.toggle('settings-theme-btn--active', b.dataset.setTheme === mode)); }

function updateUI() {
    const c = state.files.size, has = c > 0;
    els.controlsPanel.classList.toggle('visible', has);
    els.filesPanel.classList.toggle('visible', has);
    els.convertBtn.disabled = !has || state.converting;
    els.smartCompressBtn.disabled = !has || state.converting;
    els.fileCount.textContent = `${c} file${c!==1?'s':''}`;
    els.filesPanelCounter.textContent = c;
    const anyDone = Array.from(state.files.values()).some(f => f.convertedBlob);
    els.downloadAllBtn.style.display = anyDone && c > 1 ? 'inline-flex' : 'none';
    updateFormatOptions(); updateToolsStatus();
    if (!has) els.formatRec.style.display = 'none';
}

function updateFormatOptions() {
    els.qualityGroup.style.display = ['jpeg','webp'].includes(state.format) ? 'flex' : 'none';
    els.transparencyGroup.style.display = ['png','webp','gif','ico'].includes(state.format) ? 'flex' : 'none';
}

function bumpCounter() { els.filesPanelCounter.classList.add('bump'); setTimeout(() => els.filesPanelCounter.classList.remove('bump'), 200); }

function removeFile(id) {
    const fd = state.files.get(id);
    if (fd?.thumbUrl) URL.revokeObjectURL(fd.thumbUrl);
    if (fd?.convertedUrl) URL.revokeObjectURL(fd.convertedUrl);
    state.files.delete(id); ui.removeCard(id);
    setTimeout(() => { updateUI(); bumpCounter(); }, 400);
}

function downloadFile(id) {
    const fd = state.files.get(id); if (!fd?.convertedBlob) return;
    ui.downloadBlob(fd.convertedBlob, fd.convertedName);
}
