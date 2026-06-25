/* ========================================
   SCRIPT.JS - ДЛЯ GITHUB PAGES (ДЕМО-РЕЖИМ)
   ======================================== */

// API-запросы не работают на GitHub Pages
async function apiRequest(action, method = 'GET', data = null, id = null) {
    console.warn('[API] Запрос в демо-режиме:', action, method, data);
    return { success: true, data: [] };
}

function previewImage(input, previewId, placeholderId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            const placeholder = document.getElementById(placeholderId);
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function getImageBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

function showMessage(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = isError ? 'error' : 'success';
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Форматирование даты
function formatDate(dateString, withTime = false) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}