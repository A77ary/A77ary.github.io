/* ========================================
   STAMPCOLLECTION - ФИНАЛЬНЫЙ MOBILE-MENU.JS
   Мобильная навигация и сенсорные улучшения
   ======================================== */

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let menuOpen = false;
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let currentMenuToggle = null;
let isMobile = false;

// ========== ОПРЕДЕЛЕНИЕ МОБИЛЬНОГО УСТРОЙСТВА ==========

/**
 * Проверка, является ли устройство мобильным
 * @returns {boolean}
 */
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

/**
 * Обновление состояния мобильности при изменении размера окна
 */
function updateMobileStatus() {
    const wasMobile = isMobile;
    isMobile = window.innerWidth <= 768;
    
    if (wasMobile !== isMobile) {
        if (isMobile) {
            initMobileMenu();
        } else {
            destroyMobileMenu();
        }
    }
}

// ========== МОБИЛЬНОЕ МЕНЮ ==========

/**
 * Создание кнопки-бургера и адаптация навигации
 */
function initMobileMenu() {
    const navbar = document.querySelector('.navbar');
    const navLeft = document.querySelector('.nav-left');
    const navRight = document.querySelector('.nav-right');
    
    if (!navbar || !navLeft) return;
    
    // Удаляем существующую кнопку, если есть
    if (currentMenuToggle) {
        currentMenuToggle.remove();
        currentMenuToggle = null;
    }
    
    // Сохраняем исходное состояние меню
    const originalLeftDisplay = navLeft.style.display;
    const originalRightDisplay = navRight ? navRight.style.display : 'flex';
    
    // Создаём кнопку меню
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '☰';
    menuToggle.setAttribute('aria-label', 'Меню');
    menuToggle.setAttribute('aria-expanded', 'false');
    
    // Стили кнопки
    menuToggle.style.cssText = `
        background: rgba(255,255,255,0.15);
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        padding: 8px 16px;
        border-radius: 8px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        min-height: 48px;
        z-index: 1001;
    `;
    
    // Добавляем hover эффект (только для не-сенсорных)
    if (!('ontouchstart' in window)) {
        menuToggle.onmouseenter = () => menuToggle.style.background = 'rgba(255,255,255,0.25)';
        menuToggle.onmouseleave = () => menuToggle.style.background = 'rgba(255,255,255,0.15)';
    }
    
    // Позиционируем кнопку
    navbar.style.position = 'relative';
    navbar.style.display = 'flex';
    navbar.style.flexWrap = 'wrap';
    navbar.style.justifyContent = 'space-between';
    navbar.style.alignItems = 'center';
    
    // Проверяем, есть ли уже логотип или заголовок
    const existingLogo = navbar.querySelector('.mobile-logo');
    if (!existingLogo) {
        const logo = document.createElement('div');
        logo.className = 'mobile-logo';
        logo.innerHTML = '📮 StampCollection';
        logo.style.cssText = `
            color: white;
            font-weight: bold;
            font-size: 18px;
            padding: 8px 0;
        `;
        navbar.insertBefore(logo, navbar.firstChild);
    }
    
    // Добавляем кнопку в правую часть
    navbar.appendChild(menuToggle);
    currentMenuToggle = menuToggle;
    
    // Скрываем меню на мобильных по умолчанию
    navLeft.style.display = 'none';
    if (navRight) navRight.style.display = 'none';
    navLeft.style.flexDirection = 'column';
    navLeft.style.width = '100%';
    if (navRight) navRight.style.flexDirection = 'column';
    if (navRight) navRight.style.width = '100%';
    
    // Обработчик клика по кнопке
    menuToggle.onclick = (e) => {
        e.stopPropagation();
        toggleMobileMenu();
    };
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', closeMenuOnClickOutside);
    
    // Закрытие при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuOpen) {
            toggleMobileMenu();
        }
    });
}

/**
 * Переключение мобильного меню
 */
function toggleMobileMenu() {
    const navLeft = document.querySelector('.nav-left');
    const navRight = document.querySelector('.nav-right');
    
    if (!navLeft) return;
    
    menuOpen = !menuOpen;
    
    if (menuOpen) {
        // Открываем меню с анимацией
        navLeft.style.display = 'flex';
        if (navRight) navRight.style.display = 'flex';
        if (currentMenuToggle) {
            currentMenuToggle.innerHTML = '✕';
            currentMenuToggle.setAttribute('aria-expanded', 'true');
            currentMenuToggle.style.transform = 'rotate(90deg)';
        }
        
        // Анимация элементов меню
        const menuItems = [...navLeft.children, ...(navRight ? [...navRight.children] : [])];
        menuItems.forEach((item, index) => {
            item.style.animation = `fadeInMenu 0.3s ease forwards ${index * 0.05}s`;
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
        });
        
        // Блокируем прокрутку body
        document.body.style.overflow = 'hidden';
    } else {
        // Закрываем меню
        navLeft.style.display = 'none';
        if (navRight) navRight.style.display = 'none';
        if (currentMenuToggle) {
            currentMenuToggle.innerHTML = '☰';
            currentMenuToggle.setAttribute('aria-expanded', 'false');
            currentMenuToggle.style.transform = 'rotate(0deg)';
        }
        
        // Восстанавливаем прокрутку
        document.body.style.overflow = '';
    }
}

/**
 * Закрытие меню при клике вне области
 * @param {Event} e - Событие клика
 */
function closeMenuOnClickOutside(e) {
    if (!menuOpen) return;
    
    const navbar = document.querySelector('.navbar');
    const navLeft = document.querySelector('.nav-left');
    
    if (navbar && !navbar.contains(e.target)) {
        toggleMobileMenu();
    }
}

/**
 * Уничтожение мобильного меню (при переходе на десктоп)
 */
function destroyMobileMenu() {
    if (currentMenuToggle) {
        currentMenuToggle.remove();
        currentMenuToggle = null;
    }
    
    const navbar = document.querySelector('.navbar');
    const navLeft = document.querySelector('.nav-left');
    const navRight = document.querySelector('.nav-right');
    const mobileLogo = document.querySelector('.mobile-logo');
    
    if (mobileLogo) mobileLogo.remove();
    
    if (navLeft) {
        navLeft.style.display = 'flex';
        navLeft.style.flexDirection = 'row';
        navLeft.style.width = 'auto';
        navLeft.style.animation = '';
    }
    
    if (navRight) {
        navRight.style.display = 'flex';
        navRight.style.flexDirection = 'row';
        navRight.style.width = 'auto';
    }
    
    if (navbar) {
        navbar.style.position = '';
        navbar.style.flexWrap = '';
        navbar.style.justifyContent = '';
        navbar.style.alignItems = '';
    }
    
    document.removeEventListener('click', closeMenuOnClickOutside);
    document.body.style.overflow = '';
    menuOpen = false;
}

// ========== СЕНСОРНЫЕ УЛУЧШЕНИЯ ==========

/**
 * Добавление анимации нажатия для touch-устройств
 */
function initTouchFeedback() {
    const touchElements = document.querySelectorAll('button, .btn, .stamp-card, .tag, .condition-option, .user-chip');
    
    touchElements.forEach(el => {
        el.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.97)';
            this.style.transition = 'transform 0.1s ease';
        });
        
        el.addEventListener('touchend', function() {
            this.style.transform = '';
        });
        
        el.addEventListener('touchcancel', function() {
            this.style.transform = '';
        });
    });
}

/**
 * Обработка свайпов
 */
function initSwipeHandling() {
    const container = document.querySelector('.container');
    if (!container) return;
    
    // Отслеживание начала касания
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    });
    
    // Отслеживание окончания касания
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    });
}

/**
 * Обработка направления свайпа
 */
function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Минимальное расстояние для свайпа
    if (Math.abs(deltaX) < 50 && Math.abs(deltaY) < 50) return;
    
    // Горизонтальные свайпы
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
            // Свайп вправо
            onSwipeRight();
        } else {
            // Свайп влево
            onSwipeLeft();
        }
    } else {
        // Вертикальные свайпы
        if (deltaY > 0) {
            // Свайп вниз
            onSwipeDown();
        } else {
            // Свайп вверх
            onSwipeUp();
        }
    }
}

/**
 * Обработка свайпа вправо
 */
function onSwipeRight() {
    // Если меню закрыто - открываем
    if (!menuOpen && window.innerWidth <= 768) {
        toggleMobileMenu();
    }
}

/**
 * Обработка свайпа влево
 */
function onSwipeLeft() {
    // Если меню открыто - закрываем
    if (menuOpen) {
        toggleMobileMenu();
    }
}

/**
 * Обработка свайпа вверх
 */
function onSwipeUp() {
    // Можно добавить, например, прокрутку к верху
}

/**
 * Обработка свайпа вниз (обновление)
 */
function onSwipeDown() {
    // Проверяем, находится ли пользователь вверху страницы
    if (window.scrollY === 0) {
        // Обновление страницы (pull-to-refresh)
        showRefreshIndicator();
    }
}

// ========== PULL-TO-REFRESH ==========

let refreshIndicator = null;
let startPullY = 0;
let isPulling = false;

/**
 * Показ индикатора обновления
 */
function showRefreshIndicator() {
    if (refreshIndicator) return;
    
    refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'refresh-indicator';
    refreshIndicator.innerHTML = `
        <div class="refresh-spinner"></div>
        <span>Обновление...</span>
    `;
    refreshIndicator.style.cssText = `
        position: fixed;
        top: -60px;
        left: 0;
        right: 0;
        height: 60px;
        background: var(--primary, #2a5298);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        z-index: 9999;
        transition: top 0.3s ease;
        font-size: 14px;
    `;
    
    document.body.appendChild(refreshIndicator);
    
    setTimeout(() => {
        refreshIndicator.style.top = '0';
    }, 10);
    
    setTimeout(() => {
        location.reload();
    }, 500);
}

/**
 * Инициализация pull-to-refresh
 */
function initPullToRefresh() {
    let touchStartY = 0;
    let touchMoveY = 0;
    
    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
        }
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        
        touchMoveY = e.touches[0].clientY;
        const pullDistance = touchMoveY - touchStartY;
        
        if (pullDistance > 60 && window.scrollY === 0) {
            isPulling = false;
            showRefreshIndicator();
        }
    });
    
    document.addEventListener('touchend', () => {
        isPulling = false;
    });
}

// ========== УЛУЧШЕНИЯ ДЛЯ INPUT НА МОБИЛЬНЫХ ==========

/**
 * Предотвращение зума при фокусе на input (iOS)
 */
function preventZoomOnInput() {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (isMobileDevice()) {
                // Для iOS - временно отключаем зум
                const metaViewport = document.querySelector('meta[name="viewport"]');
                if (metaViewport) {
                    metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                    setTimeout(() => {
                        metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=yes');
                    }, 100);
                }
            }
        });
    });
}

/**
 * Автоматическое открытие цифровой клавиатуры для числовых полей
 */
function enhanceNumericInputs() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');
    });
}

// ========== ОПТИМИЗАЦИЯ СКОРОСТИ ==========

/**
 * Ленивая загрузка изображений на мобильных
 */
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });
        
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback для старых браузеров
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    }
}

// ========== ДИНАМИЧЕСКИЕ СТИЛИ ДЛЯ МОБИЛЬНЫХ ==========

/**
 * Добавление дополнительных стилей для мобильных устройств
 */
function addMobileStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInMenu {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .refresh-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }
        
        @media (max-width: 768px) {
            .navbar a {
                padding: 12px 16px;
                margin: 4px 0;
                border-radius: 12px;
                font-size: 16px;
            }
            
            .user-info {
                text-align: center;
                margin: 8px 0;
            }
            
            .menu-toggle {
                touch-action: manipulation;
            }
            
            /* Увеличение областей касания */
            button, .btn, .stamp-card, .tag, .condition-option, .user-chip {
                touch-action: manipulation;
            }
            
            /* Отключаем hover эффекты на мобильных */
            .stamp-card:hover {
                transform: none;
            }
            
            button:hover, .btn:hover {
                transform: none;
            }
        }
    `;
    document.head.appendChild(style);
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

/**
 * Полная инициализация мобильных функций
 */
function initMobileFeatures() {
    updateMobileStatus();
    
    // Инициализация функций
    initTouchFeedback();
    initSwipeHandling();
    initPullToRefresh();
    preventZoomOnInput();
    enhanceNumericInputs();
    initLazyLoading();
    addMobileStyles();
    
    // Следим за изменением размера окна
    window.addEventListener('resize', debounce(() => {
        updateMobileStatus();
    }, 250));
    
    console.log('Mobile features initialized');
}

/**
 * Debounce функция для оптимизации
 * @param {Function} func - Функция для вызова
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

// Запуск инициализации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileFeatures);
} else {
    initMobileFeatures();
}

// ========== ЭКСПОРТ ФУНКЦИЙ ==========
window.isMobileDevice = isMobileDevice;
window.initMobileMenu = initMobileMenu;
window.toggleMobileMenu = toggleMobileMenu;
window.initSwipeHandling = initSwipeHandling;
window.initPullToRefresh = initPullToRefresh;