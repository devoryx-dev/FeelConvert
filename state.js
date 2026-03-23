const SETTINGS_KEY = 'feelconvert-settings';
const THEME_KEY = 'feelconvert-theme';
const HISTORY_KEY = 'feelconvert-history';

const state = {
    files: new Map(),
    format: 'png',
    quality: 0.92,
    resizeWidth: null,
    resizeHeight: null,
    aspectLocked: true,
    preserveTransparency: true,
    converting: false,
    idCounter: 0,
    activeTab: 'convert',
    namingMode: 'suffix',
    history: []
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const els = {};
[
    'uploadZone', 'dragCount', 'fileInput', 'browseBtn', 'controlsPanel', 'filesPanel',
    'filesList', 'fileCount', 'filesPanelCounter', 'formatSelector', 'qualitySlider',
    'qualityValue', 'qualityFill', 'qualityGroup', 'resizeWidth', 'resizeHeight',
    'aspectLock', 'transparencyToggle', 'transparencyGroup', 'convertBtn', 'clearBtn',
    'downloadAllBtn', 'themeToggle', 'globalProgress', 'globalProgressBar', 'settingsSaved',
    'navTabs', 'tabIndicator', 'mobileNav', 'mobileMenuToggle', 'toolsHint', 'toolsReady',
    'toolsReadyCount', 'brightnessSlider', 'brightnessVal', 'contrastSlider', 'contrastVal',
    'saturationSlider', 'saturationVal', 'pixelSlider', 'pixelVal', 'settingsDefaultFormat',
    'settingsDefaultQuality', 'settingsQualityVal', 'settingsNaming', 'settingsThemePicker',
    'formatRec', 'formatRecText', 'formatRecApply', 'formatRecDismiss', 'smartCompressBtn',
    'clearHistoryBtn'
].forEach(id => els[id] = $('#' + id));
