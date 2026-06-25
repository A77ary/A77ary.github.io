/* ========================================
   STAMPCOLLECTION - ФИНАЛЬНЫЙ AUTH.JS
   Управление авторизацией и сессиями
   ======================================== */

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
const AUTH_API_URL = window.API_URL || 'https://backend.pythonanywhere.com/backend.php';
let currentUser = null;
let authCheckInterval = null;

// ========== ОСНОВНЫЕ ФУНКЦИИ АВТОРИЗАЦИИ ==========

/**
 * Проверка авторизации пользователя
 * @returns {Promise<object|null>} - Данные пользователя или null
 */
async function checkAuth() {
    try {
        const result = await apiRequest('check_auth', 'GET');
        
        if (result.success && result.user) {
            currentUser = result.user;
            // Сохраняем в localStorage для быстрого доступа
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            return currentUser;
        } else {
            currentUser = null;
            localStorage.removeItem('currentUser');
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

/**
 * Требование авторизации - перенаправляет на страницу входа
 * @returns {Promise<object|null>}
 */
async function requireAuth() {
    const user = await checkAuth();
    
    if (!user) {
        const currentPath = window.location.pathname;
        const publicPages = ['/login.html', '/register.html', '/verify.html', '/reset_password.html', '/add_stamp.html', '/calculator.html', '/chatbot.html', '/edit_stamp.html', '/index.html', '/marketplace.html', '/profile.html', '/public_gallery.html', '/qrcodes.html', '/reports.html', '/scanner.html'];
        
        if (!publicPages.some(page => currentPath.includes(page))) {
            sessionStorage.setItem('redirectAfterLogin', currentPath);
            window.location.href = 'login.html';
        }
        return null;
    }
    
    return user;
}

/**
 * Вход в систему
 * @param {string} login - Логин или email
 * @param {string} password - Пароль
 * @param {boolean} rememberMe - Запомнить пользователя
 * @returns {Promise<object>}
 */
async function login(login, password, rememberMe = false) {
    try {
        const result = await apiRequest('login', 'POST', { login, password });
        
        if (result.success) {
            currentUser = result.user;
            
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('savedLogin', login);
            } else {
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('savedLogin');
            }
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            sessionStorage.setItem('userLoggedIn', 'true');
            
            return { success: true, user: currentUser };
        } else {
            return { success: false, error: result.error || 'Неверный логин или пароль' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Ошибка соединения' };
    }
}

/**
 * Регистрация нового пользователя
 * @param {string} username - Имя пользователя
 * @param {string} email - Email
 * @param {string} password - Пароль
 * @returns {Promise<object>}
 */
async function register(username, email, password) {
    try {
        const result = await apiRequest('register', 'POST', { username, email, password });
        
        if (result.success) {
            return { success: true, message: result.message || 'Регистрация успешна! Проверьте email для подтверждения.' };
        } else {
            return { success: false, error: result.error || 'Ошибка регистрации' };
        }
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: 'Ошибка соединения' };
    }
}

/**
 * Выход из системы
 * @returns {Promise<boolean>}
 */
async function logout() {
    try {
        const result = await apiRequest('logout', 'POST');
        
        if (result.success) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberMe');
            sessionStorage.removeItem('userLoggedIn');
            sessionStorage.removeItem('redirectAfterLogin');
            
            // Очищаем все данные сессии
            clearSessionData();
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}

/**
 * Очистка данных сессии
 */
function clearSessionData() {
    // Очищаем данные маркетплейса
    localStorage.removeItem('marketplace_favorites');
    // Очищаем историю сканера (опционально)
    // localStorage.removeItem('scanner_history');
    // Очищаем историю чата (опционально)
    // localStorage.removeItem('chatbot_history');
}

/**
 * Обновление навигационной панели (отображение пользователя)
 */
async function updateNavbar() {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;
    
    const user = await checkAuth();
    
    if (user && user.username) {
        navRight.innerHTML = `
            <span class="user-info">👤 ${escapeHtml(user.username)}</span>
            <a href="profile.html">⚙️ Профиль</a>
            <a href="#" onclick="logoutAndRedirect()" class="logout-btn">🚪 Выйти</a>
        `;
    } else {
        navRight.innerHTML = `
            <a href="login.html">🔐 Вход</a>
            <a href="register.html">📝 Регистрация</a>
        `;
    }
}

/**
 * Выход с перенаправлением
 */
async function logoutAndRedirect() {
    const success = await logout();
    if (success) {
        showToast('👋 До свидания!');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    } else {
        showToast('❌ Ошибка при выходе', true);
    }
}

// ========== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ==========

/**
 * Отправка запроса на восстановление пароля
 * @param {string} email - Email пользователя
 * @returns {Promise<object>}
 */
async function forgotPassword(email) {
    try {
        const result = await apiRequest('forgot_password', 'POST', { email });
        return result;
    } catch (error) {
        console.error('Forgot password error:', error);
        return { success: false, error: 'Ошибка соединения' };
    }
}

/**
 * Сброс пароля с токеном
 * @param {string} token - Токен сброса
 * @param {string} newPassword - Новый пароль
 * @returns {Promise<object>}
 */
async function resetPassword(token, newPassword) {
    try {
        const result = await apiRequest('reset_password', 'POST', { token, new_password: newPassword });
        return result;
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: 'Ошибка соединения' };
    }
}

// ========== ПРОВЕРКА ПОЛЕЙ ==========

/**
 * Проверка силы пароля с визуализацией
 * @param {string} password - Пароль
 * @param {HTMLElement} strengthElement - Элемент для отображения силы
 * @returns {number} - Сила пароля (0-100)
 */
function checkPasswordStrength(password, strengthElement = null) {
    let strength = 0;
    const checks = {
        length: password.length >= 8,
        digit: /[0-9]/.test(password),
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };
    
    // Подсчёт силы
    if (checks.length) strength += 20;
    if (checks.digit) strength += 20;
    if (checks.upper) strength += 20;
    if (checks.lower) strength += 20;
    if (checks.special) strength += 20;
    
    // Визуализация
    if (strengthElement) {
        let color = '#dc3545';
        let text = 'Слабый';
        
        if (strength >= 80) {
            color = '#28a745';
            text = 'Отличный';
        } else if (strength >= 60) {
            color = '#17a2b8';
            text = 'Хороший';
        } else if (strength >= 40) {
            color = '#ffc107';
            text = 'Средний';
        }
        
        strengthElement.style.width = `${strength}%`;
        strengthElement.style.backgroundColor = color;
        
        const textElement = document.getElementById('strengthText');
        if (textElement) {
            textElement.textContent = `💪 Сложность: ${text}`;
            textElement.style.color = color;
        }
        
        // Показываем требования
        updatePasswordRequirements(checks);
    }
    
    return strength;
}

/**
 * Обновление отображения требований к паролю
 * @param {object} checks - Результаты проверок
 */
function updatePasswordRequirements(checks) {
    const requirements = {
        length: document.getElementById('reqLength'),
        digit: document.getElementById('reqDigit'),
        upper: document.getElementById('reqUpper'),
        lower: document.getElementById('reqLower'),
        special: document.getElementById('reqSpecial')
    };
    
    for (const [key, element] of Object.entries(requirements)) {
        if (element) {
            if (checks[key]) {
                element.innerHTML = element.innerHTML.replace('🔴', '✅');
                element.style.color = '#28a745';
            } else {
                element.innerHTML = element.innerHTML.replace('✅', '🔴');
                element.style.color = '#dc3545';
            }
        }
    }
}

// ========== ЗАЩИТА ОТ БРУТФОРСА ==========

// Хранение попыток входа
let loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
let blockUntil = parseInt(localStorage.getItem('blockUntil') || '0');

/**
 * Проверка блокировки после неудачных попыток
 * @returns {boolean} - Заблокирован ли пользователь
 */
function isAccountBlocked() {
    if (blockUntil > Date.now()) {
        const minutesLeft = Math.ceil((blockUntil - Date.now()) / 60000);
        showToast(`⚠️ Слишком много попыток. Попробуйте через ${minutesLeft} мин.`, true);
        return true;
    }
    return false;
}

/**
 * Регистрация неудачной попытки входа
 */
function registerFailedAttempt() {
    loginAttempts++;
    localStorage.setItem('loginAttempts', loginAttempts.toString());
    
    if (loginAttempts >= 5) {
        blockUntil = Date.now() + 15 * 60 * 1000; // Блокировка на 15 минут
        localStorage.setItem('blockUntil', blockUntil.toString());
        showToast('⚠️ Превышено количество попыток. Доступ заблокирован на 15 минут.', true);
    }
}

/**
 * Сброс попыток входа после успешного входа
 */
function resetLoginAttempts() {
    loginAttempts = 0;
    blockUntil = 0;
    localStorage.setItem('loginAttempts', '0');
    localStorage.removeItem('blockUntil');
}

// ========== CAPTCHA ==========

let currentCaptcha = '';

/**
 * Генерация CAPTCHA
 * @returns {string} - Сгенерированный код
 */
function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let captcha = '';
    for (let i = 0; i < 6; i++) {
        captcha += chars[Math.floor(Math.random() * chars.length)];
    }
    currentCaptcha = captcha;
    
    const captchaElement = document.getElementById('captchaCode');
    if (captchaElement) {
        captchaElement.innerHTML = currentCaptcha;
    }
    
    return currentCaptcha;
}

/**
 * Проверка CAPTCHA
 * @param {string} userInput - Введённый пользователем код
 * @returns {boolean}
 */
function verifyCaptcha(userInput) {
    return userInput && userInput.toUpperCase() === currentCaptcha;
}

// ========== АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ СЕССИИ ==========

/**
 * Проверка сессии каждые 5 минут
 */
function startSessionMonitor() {
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
    }
    
    authCheckInterval = setInterval(async () => {
        const isLoggedIn = sessionStorage.getItem('userLoggedIn') === 'true';
        if (isLoggedIn) {
            const user = await checkAuth();
            if (!user) {
                // Сессия истекла
                showToast('⏰ Сессия истекла. Пожалуйста, войдите снова.', true);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        }
    }, 5 * 60 * 1000); // Каждые 5 минут
}

/**
 * Остановка монитора сессии
 */
function stopSessionMonitor() {
    if (authCheckInterval) {
        clearInterval(authCheckInterval);
        authCheckInterval = null;
    }
}

// ========== СОХРАНЕНИЕ ПРОГРЕССА ==========

/**
 * Автосохранение формы перед отправкой
 * @param {string} formId - ID формы
 * @param {string} storageKey - Ключ для хранения
 */
function enableAutoSave(formId, storageKey) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    // Загрузка сохранённых данных
    const savedData = loadFromLocalStorage(storageKey);
    if (savedData) {
        for (const [key, value] of Object.entries(savedData)) {
            const field = form.elements[key];
            if (field) field.value = value;
        }
    }
    
    // Сохранение при изменении
    form.addEventListener('input', debounce(() => {
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        saveToLocalStorage(storageKey, data);
    }, 500));
    
    // Очистка после отправки
    form.addEventListener('submit', () => {
        localStorage.removeItem(storageKey);
    });
}

// ========== СОЦИАЛЬНЫЙ ВХОД ==========

/**
 * Инициализация социального входа
 * @param {string} provider - Провайдер (google, github, vk)
 */
function socialLogin(provider) {
    // В реальном проекте здесь будет OAuth redirect
    showToast(`🌐 Вход через ${provider.toUpperCase()} будет доступен в следующем обновлении`, false);
    
    // Пример для Google OAuth:
    /*
    const clientId = 'YOUR_GOOGLE_CLIENT_ID';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const scope = 'email profile';
    window.location.href = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    */
}

// ========== ДВУХФАКТОРНАЯ АУТЕНТИФИКАЦИЯ ==========

/**
 * Запрос 2FA кода
 * @param {string} userId - ID пользователя
 * @returns {Promise<boolean>}
 */
async function request2FA(userId) {
    try {
        const result = await apiRequest('request_2fa', 'POST', { user_id: userId });
        if (result.success) {
            showToast('📱 Код подтверждения отправлен на ваш email/телефон');
            return true;
        }
        return false;
    } catch (error) {
        console.error('2FA request error:', error);
        return false;
    }
}

/**
 * Проверка 2FA кода
 * @param {string} code - Введённый код
 * @returns {Promise<boolean>}
 */
async function verify2FA(code) {
    try {
        const result = await apiRequest('verify_2fa', 'POST', { code });
        return result.success;
    } catch (error) {
        console.error('2FA verify error:', error);
        return false;
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========

/**
 * Инициализация модуля авторизации
 */
async function initAuth() {
    // Проверяем сохранённую сессию
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && !currentUser) {
        try {
            const user = JSON.parse(savedUser);
            const isValid = await checkAuth();
            if (isValid) {
                currentUser = user;
            } else {
                localStorage.removeItem('currentUser');
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
    
    // Запускаем монитор сессии
    startSessionMonitor();
    
    // Обновляем навбар
    await updateNavbar();
}

// Запуск инициализации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

// ========== ЭКСПОРТ ФУНКЦИЙ ==========
window.checkAuth = checkAuth;
window.requireAuth = requireAuth;
window.login = login;
window.register = register;
window.logout = logout;
window.logoutAndRedirect = logoutAndRedirect;
window.updateNavbar = updateNavbar;
window.forgotPassword = forgotPassword;
window.resetPassword = resetPassword;
window.checkPasswordStrength = checkPasswordStrength;
window.generateCaptcha = generateCaptcha;
window.verifyCaptcha = verifyCaptcha;
window.socialLogin = socialLogin;
window.isAccountBlocked = isAccountBlocked;
window.registerFailedAttempt = registerFailedAttempt;
window.resetLoginAttempts = resetLoginAttempts;
window.enableAutoSave = enableAutoSave;