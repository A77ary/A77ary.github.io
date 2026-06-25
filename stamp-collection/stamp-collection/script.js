/* ========================================
   STAMPCOLLECTION - ФИНАЛЬНЫЙ JS
   Общие функции для всех страниц
   ======================================== */

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
const API_URL = window.API_URL || 'https://backend.pythonanywhere.com/backend.php';

// ========== ОСНОВНЫЕ API ФУНКЦИИ ==========

/**
 * Универсальный запрос к API
 * @param {string} action - Действие API
 * @param {string} method - HTTP метод (GET, POST, DELETE)
 * @param {object} data - Данные для отправки
 * @param {number} id - ID для GET запроса
 * @returns {Promise<object>} - Ответ от сервера
 */
async function apiRequest(action, method = 'GET', data = null, id = null) {
    let url = `${API_URL}?action=${action}`;
    if (id) url += `&id=${id}`;
    
    const options = { 
        method, 
        credentials: 'include',
        headers: {}
    };
    
    if (method === 'GET' && data) {
        url += '&' + new URLSearchParams(data);
    } else if (data && method !== 'GET') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        showToast('⚠️ Ошибка соединения с сервером', true);
        return { success: false, error: error.message };
    }
}

// ========== РАБОТА С ИЗОБРАЖЕНИЯМИ ==========

/**
 * Предпросмотр изображения перед загрузкой
 * @param {HTMLInputElement} input - Поле ввода файла
 * @param {string} previewId - ID элемента для предпросмотра
 * @param {string} placeholderId - ID элемента-заглушки
 */
function previewImage(input, previewId, placeholderId) {
    const file = input.files[0];
    if (file) {
        // Проверка размера (максимум 5 МБ)
        if (file.size > 5 * 1024 * 1024) {
            showToast('❌ Файл слишком большой! Максимум 5 МБ', true);
            input.value = '';
            return;
        }
        
        // Проверка типа файла
        if (!file.type.match(/image\/(jpeg|png|gif|jpg)/)) {
            showToast('❌ Поддерживаются только JPG, PNG и GIF', true);
            input.value = '';
            return;
        }
        
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

/**
 * Преобразование файла в base64
 * @param {File} file - Файл изображения
 * @returns {Promise<string>} - Base64 строка
 */
function getImageBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve('');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========== СООБЩЕНИЯ И УВЕДОМЛЕНИЯ ==========

/**
 * Показать сообщение в указанном элементе
 * @param {string} elementId - ID элемента
 * @param {string} message - Текст сообщения
 * @param {boolean} isError - Ошибка или успех
 */
function showMessage(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = isError ? 'error' : 'success';
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 5000);
    }
}

/**
 * Показать всплывающее уведомление
 * @param {string} message - Текст уведомления
 * @param {boolean} isError - Ошибка или успех
 */
function showToast(message, isError = false) {
    // Удаляем старые уведомления
    const oldToasts = document.querySelectorAll('.toast-message');
    oldToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = isError ? 'error toast-message' : 'success toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
        cursor: pointer;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
    
    toast.onclick = () => toast.remove();
}

// ========== ФОРМАТИРОВАНИЕ ==========

/**
 * Форматирование цены
 * @param {number} price - Цена
 * @param {string} currency - Валюта (USD, EUR, RUB, GBP)
 * @returns {string} - Отформатированная цена
 */
function formatPrice(price, currency) {
    if (!price && price !== 0) return '—';
    const symbols = { 
        USD: '$', 
        EUR: '€', 
        RUB: '₽', 
        GBP: '£',
        UAH: '₴',
        KZT: '₸'
    };
    const symbol = symbols[currency] || currency;
    return `${symbol} ${Number(price).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Экранирование HTML для безопасности
 * @param {string} text - Текст для экранирования
 * @returns {string} - Безопасный HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Форматирование даты
 * @param {string} dateString - Дата в ISO формате
 * @param {boolean} withTime - Показывать время
 * @returns {string} - Отформатированная дата
 */
function formatDate(dateString, withTime = false) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    if (withTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return date.toLocaleDateString('ru-RU', options);
}

// ========== ВАЛИДАЦИЯ ==========

/**
 * Валидация email
 * @param {string} email - Email для проверки
 * @returns {boolean}
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return re.test(email);
}

/**
 * Валидация пароля
 * @param {string} password - Пароль для проверки
 * @returns {object} - Результат проверки
 */
function validatePassword(password) {
    const result = {
        isValid: false,
        strength: 0,
        errors: []
    };
    
    if (password.length < 8) {
        result.errors.push('Минимум 8 символов');
    } else {
        result.strength++;
    }
    
    if (!/[0-9]/.test(password)) {
        result.errors.push('Хотя бы одну цифру');
    } else {
        result.strength++;
    }
    
    if (!/[A-Z]/.test(password)) {
        result.errors.push('Хотя бы одну заглавную букву');
    } else {
        result.strength++;
    }
    
    if (!/[a-z]/.test(password)) {
        result.errors.push('Хотя бы одну строчную букву');
    } else {
        result.strength++;
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
        result.errors.push('Хотя бы один спецсимвол');
    } else {
        result.strength++;
    }
    
    result.isValid = result.errors.length === 0;
    return result;
}

/**
 * Валидация username
 * @param {string} username - Имя пользователя
 * @returns {boolean}
 */
function isValidUsername(username) {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
}

// ========== РАБОТА С LOCALSTORAGE ==========

/**
 * Сохранение данных в localStorage
 * @param {string} key - Ключ
 * @param {any} data - Данные
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('LocalStorage save error:', e);
        return false;
    }
}

/**
 * Загрузка данных из localStorage
 * @param {string} key - Ключ
 * @param {any} defaultValue - Значение по умолчанию
 * @returns {any}
 */
function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('LocalStorage load error:', e);
        return defaultValue;
    }
}

// ========== ДЕБАУНС ДЛЯ ОПТИМИЗАЦИИ ==========

/**
 * Дебаунс функция для ограничения частоты вызовов
 * @param {Function} func - Функция
 * @param {number} delay - Задержка в мс
 * @returns {Function}
 */
function debounce(func, delay) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, delay);
    };
}

// ========== СКАЧИВАНИЕ ФАЙЛОВ ==========

/**
 * Скачивание файла
 * @param {string} content - Содержимое файла
 * @param {string} filename - Имя файла
 * @param {string} mimeType - MIME тип
 */
function downloadFile(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Копирование текста в буфер обмена
 * @param {string} text - Текст для копирования
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('✅ Скопировано в буфер обмена');
        return true;
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('❌ Не удалось скопировать', true);
        return false;
    }
}

// ========== ГЕНЕРАЦИЯ ID ==========

/**
 * Генерация уникального ID
 * @returns {string}
 */
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ========== ОБРАБОТКА ОШИБОК ==========

/**
 * Глобальный обработчик ошибок
 */
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    if (e.message && e.message.includes('fetch')) {
        showToast('⚠️ Проблема с соединением. Проверьте интернет.', true);
    }
});

/**
 * Обработка Promise rejections
 */
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled rejection:', e.reason);
    showToast('⚠️ Произошла ошибка. Пожалуйста, обновите страницу.', true);
});

// ========== МОБИЛЬНЫЕ УЛУЧШЕНИЯ ==========

/**
 * Проверка мобильного устройства
 * @returns {boolean}
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Адаптация под мобильные устройства
 */
function adaptForMobile() {
    if (isMobileDevice()) {
        // Увеличиваем области касания для кнопок
        const buttons = document.querySelectorAll('button, .btn, .stamp-card');
        buttons.forEach(btn => {
            btn.style.cursor = 'pointer';
            if (btn.tagName === 'BUTTON') {
                btn.style.minHeight = '44px';
            }
        });
        
        // Отключаем hover эффекты на мобильных
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .stamp-card:hover {
                    transform: none;
                }
                button:hover {
                    transform: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ========== PWA УСТАНОВКА ==========

let deferredPrompt;

/**
 * Обработка установки PWA
 */
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Показываем кнопку установки через 5 секунд
    setTimeout(() => {
        if (deferredPrompt && !localStorage.getItem('pwa_installed')) {
            showInstallPrompt();
        }
    }, 5000);
});

function showInstallPrompt() {
    const installBtn = document.createElement('button');
    installBtn.textContent = '📱 Установить приложение';
    installBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 1000;
        background: #28a745;
        padding: 12px 20px;
        border-radius: 30px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    installBtn.onclick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                localStorage.setItem('pwa_installed', 'true');
                showToast('✅ Приложение установлено!');
            }
            deferredPrompt = null;
            installBtn.remove();
        }
    };
    
    document.body.appendChild(installBtn);
    
    setTimeout(() => {
        if (installBtn.parentNode) installBtn.remove();
    }, 10000);
}

// ========== СЕТЕВОЙ СТАТУС ==========

/**
 * Проверка сетевого подключения
 * @returns {boolean}
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Отслеживание изменения сетевого статуса
 */
window.addEventListener('online', () => {
    showToast('✅ Интернет подключён');
});

window.addEventListener('offline', () => {
    showToast('⚠️ Интернет отключён. Некоторые функции могут быть недоступны.', true);
});

// ========== АНИМАЦИЯ ПРИ ПРОКРУТКЕ ==========

/**
 * Плавная прокрутка к элементу
 * @param {string} elementId - ID элемента
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Intersection Observer для анимации появления
 */
function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(el => observer.observe(el));
}

// ========== ТЁМНАЯ ТЕМА ==========

/**
 * Получение текущей темы
 * @returns {string}
 */
function getCurrentTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Отслеживание изменения темы
 */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const theme = e.matches ? 'dark' : 'light';
    console.log(`Theme changed to: ${theme}`);
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========

/**
 * Общая инициализация для всех страниц
 */
function init() {
    // Адаптация под мобильные
    adaptForMobile();
    
    // Инициализация анимаций
    initScrollAnimations();
    
    // Добавляем стиль для анимаций, которых может не быть в CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .animate-on-scroll {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .animate-on-scroll.animated {
            opacity: 1;
            transform: translateY(0);
        }
        
        @media (max-width: 768px) {
            .toast-message {
                bottom: 10px !important;
                right: 10px !important;
                left: 10px !important;
                max-width: none !important;
                text-align: center;
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('StampCollection initialized');
}

// Запуск инициализации после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ========== ЭКСПОРТ ФУНКЦИЙ ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ ФАЙЛАХ ==========
// (Функции уже глобальные, но для ясности)

window.apiRequest = apiRequest;
window.previewImage = previewImage;
window.getImageBase64 = getImageBase64;
window.showMessage = showMessage;
window.showToast = showToast;
window.formatPrice = formatPrice;
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.isValidEmail = isValidEmail;
window.validatePassword = validatePassword;
window.isValidUsername = isValidUsername;
window.saveToLocalStorage = saveToLocalStorage;
window.loadFromLocalStorage = loadFromLocalStorage;
window.debounce = debounce;
window.downloadFile = downloadFile;
window.copyToClipboard = copyToClipboard;
window.generateUniqueId = generateUniqueId;
window.isMobileDevice = isMobileDevice;
window.isOnline = isOnline;
window.scrollToElement = scrollToElement;
window.getCurrentTheme = getCurrentTheme;