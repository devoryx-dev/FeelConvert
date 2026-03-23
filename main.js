initTheme();
loadSettings();
loadHistory();
updateFormatOptions();
els.qualityFill.style.width = els.qualitySlider.value + '%';
requestAnimationFrame(updateTabIndicator);
window.addEventListener('resize', updateTabIndicator);
