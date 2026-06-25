/* ========================================
   AUTH.JS - ДЛЯ GITHUB PAGES (ДЕМО-РЕЖИМ)
   Авторизация отключена
   ======================================== */

const API_URL = '';

// Авторизация всегда успешна (демо-режим)
async function checkAuth() {
    return { 
        success: true, 
        user: { 
            id: 1, 
            username: 'demo',
            email: 'demo@example.com',
            avatar: null,
            is_public: 1,
            created_at: new Date().toISOString()
        } 
    };
}

async function requireAuth() {
    return { id: 1, username: 'demo' };
}

async function updateNavbar() {
    const navRight = document.querySelector('.nav-right');
    if (navRight) {
        navRight.innerHTML = `
            <span class="user-info">👤 demo</span>
            <a href="profile.html">⚙️ Профиль</a>
            <a href="#" onclick="alert('Выход (демо-версия)')">🚪 Выйти</a>
        `;
    }
}

async function login(login, password, rememberMe = false) {
    return { success: true, user: { id: 1, username: 'demo' } };
}

async function register(username, email, password) {
    return { success: true, message: 'Регистрация успешна! (демо-версия)' };
}

async function logout() {
    return true;
}

async function logoutAndRedirect() {
    alert('Выход (демо-версия)');
    window.location.href = 'login.html';
}

// Переопределяем formatPrice для демо
function formatPrice(price, currency) {
    if (!price && price !== 0) return '—';
    const symbols = { USD: '$', EUR: '€', RUB: '₽', GBP: '£' };
    return `${symbols[currency] || currency} ${price}`;
}

// Показ уведомлений
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = isError ? 'error message' : 'success message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        cursor: pointer;
        background: ${isError ? '#f8d7da' : '#d4edda'};
        color: ${isError ? '#721c24' : '#155724'};
        padding: 10px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    toast.onclick = () => toast.remove();
}