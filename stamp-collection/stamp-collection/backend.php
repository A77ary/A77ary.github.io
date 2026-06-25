<?php
/* ========================================
   STAMPCOLLECTION - ФИНАЛЬНЫЙ BACKEND.PHP
   API для управления коллекцией почтовых марок
   ======================================== */

// ========== НАСТРОЙКИ ==========
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ========== ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ ==========
class Database {
    private static $instance = null;
    private $db;
    
    private function __construct() {
        $this->db = new SQLite3('stamps.db');
        $this->db->exec("PRAGMA foreign_keys = ON");
        $this->db->exec("PRAGMA encoding = 'UTF-8'");
        $this->initTables();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->db;
    }
    
    private function initTables() {
        // Таблица пользователей
        $this->db->exec("CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar TEXT,
            is_public INTEGER DEFAULT 0,
            email_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Таблица марок
        $this->db->exec("CREATE TABLE IF NOT EXISTS stamps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            country TEXT NOT NULL,
            year INTEGER NOT NULL,
            denomination TEXT NOT NULL,
            description TEXT,
            condition TEXT CHECK(condition IN ('Отличное', 'Хорошее', 'Среднее', 'Плохое')),
            estimated_price DECIMAL(10,2),
            currency TEXT DEFAULT 'USD',
            is_favorite INTEGER DEFAULT 0,
            image_path TEXT,
            catalog_number TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        // Таблица тегов
        $this->db->exec("CREATE TABLE IF NOT EXISTS stamp_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stamp_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            FOREIGN KEY(stamp_id) REFERENCES stamps(id) ON DELETE CASCADE
        )");
        
        // Таблица истории действий
        $this->db->exec("CREATE TABLE IF NOT EXISTS stamp_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stamp_id INTEGER,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(stamp_id) REFERENCES stamps(id) ON DELETE SET NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        // Таблица маркетплейса
        $this->db->exec("CREATE TABLE IF NOT EXISTS marketplace_listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stamp_id INTEGER NOT NULL,
            seller_id INTEGER NOT NULL,
            price DECIMAL(10,2),
            type TEXT DEFAULT 'sale',
            trade_wanted TEXT,
            comment TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(stamp_id) REFERENCES stamps(id) ON DELETE CASCADE,
            FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        // Таблица предложений маркетплейса
        $this->db->exec("CREATE TABLE IF NOT EXISTS marketplace_offers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            listing_id INTEGER NOT NULL,
            buyer_id INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
            FOREIGN KEY(buyer_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        // Таблица сессий
        $this->db->exec("CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        // Создание индексов для ускорения запросов
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_stamps_user ON stamps(user_id)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_stamps_country ON stamps(country)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_stamps_year ON stamps(year)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_tags_stamp ON stamp_tags(stamp_id)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_tags_name ON stamp_tags(tag)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_listings_status ON marketplace_listings(status)");
        $this->db->exec("CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)");
    }
}

$db = Database::getInstance()->getConnection();

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Проверка авторизации
 */
function checkAuth() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Не авторизован']);
        exit;
    }
    return $_SESSION['user_id'];
}

/**
 * Получение пользователя по ID
 */
function getUserById($id) {
    global $db;
    $stmt = $db->prepare("SELECT id, username, email, avatar, is_public, created_at FROM users WHERE id = :id");
    $stmt->bindValue(':id', $id);
    $result = $stmt->execute();
    return $result->fetchArray(SQLITE3_ASSOC);
}

/**
 * Логирование действий
 */
function logHistory($user_id, $action, $stamp_id = null, $details = null) {
    global $db;
    $stmt = $db->prepare("INSERT INTO stamp_history (user_id, stamp_id, action, details) VALUES (:uid, :sid, :action, :details)");
    $stmt->bindValue(':uid', $user_id);
    $stmt->bindValue(':sid', $stamp_id);
    $stmt->bindValue(':action', $action);
    $stmt->bindValue(':details', $details);
    return $stmt->execute();
}

/**
 * Получение тегов марки
 */
function getStampTags($stamp_id) {
    global $db;
    $stmt = $db->prepare("SELECT tag FROM stamp_tags WHERE stamp_id = :sid");
    $stmt->bindValue(':sid', $stamp_id);
    $result = $stmt->execute();
    $tags = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $tags[] = $row['tag'];
    }
    return $tags;
}

/**
 * Обновление тегов марки
 */
function updateStampTags($stamp_id, $tags_string) {
    global $db;
    // Удаляем старые теги
    $db->exec("DELETE FROM stamp_tags WHERE stamp_id = $stamp_id");
    
    // Добавляем новые
    if ($tags_string) {
        $tags = explode(',', $tags_string);
        foreach ($tags as $tag) {
            $tag = trim($tag);
            if ($tag) {
                $stmt = $db->prepare("INSERT INTO stamp_tags (stamp_id, tag) VALUES (:sid, :tag)");
                $stmt->bindValue(':sid', $stamp_id);
                $stmt->bindValue(':tag', $tag);
                $stmt->execute();
            }
        }
    }
}

// ========== АВТОРИЗАЦИЯ ==========

$action = $_GET['action'] ?? '';

// Регистрация
if ($action === 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    // Валидация
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Заполните все поля']);
        exit;
    }
    
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        echo json_encode(['success' => false, 'error' => 'Имя пользователя должно содержать 3-20 символов (латиница, цифры, _)']);
        exit;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'error' => 'Некорректный email']);
        exit;
    }
    
    if (strlen($password) < 4) {
        echo json_encode(['success' => false, 'error' => 'Пароль должен быть не менее 4 символов']);
        exit;
    }
    
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    $verification_token = bin2hex(random_bytes(32));
    
    try {
        $stmt = $db->prepare("INSERT INTO users (username, email, password_hash, verification_token) 
                              VALUES (:username, :email, :password, :token)");
        $stmt->bindValue(':username', $username);
        $stmt->bindValue(':email', $email);
        $stmt->bindValue(':password', $password_hash);
        $stmt->bindValue(':token', $verification_token);
        $stmt->execute();
        
        $user_id = $db->lastInsertRowID();
        logHistory($user_id, 'register');
        
        echo json_encode(['success' => true, 'message' => 'Регистрация успешна! Проверьте email для подтверждения.']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => 'Пользователь с таким именем или email уже существует']);
    }
}

// Вход
elseif ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $login = trim($data['login'] ?? '');
    $password = $data['password'] ?? '';
    
    $stmt = $db->prepare("SELECT * FROM users WHERE username = :login OR email = :login");
    $stmt->bindValue(':login', $login);
    $result = $stmt->execute();
    $user = $result->fetchArray(SQLITE3_ASSOC);
    
    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        
        // Обновляем время последней активности
        $update = $db->prepare("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = :id");
        $update->bindValue(':id', $user['id']);
        $update->execute();
        
        logHistory($user['id'], 'login');
        
        echo json_encode(['success' => true, 'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'avatar' => $user['avatar'],
            'is_public' => $user['is_public']
        ]]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Неверный логин или пароль']);
    }
}

// Проверка авторизации
elseif ($action === 'check_auth') {
    if (isset($_SESSION['user_id'])) {
        $user = getUserById($_SESSION['user_id']);
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false]);
    }
}

// Выход
elseif ($action === 'logout') {
    if (isset($_SESSION['user_id'])) {
        logHistory($_SESSION['user_id'], 'logout');
    }
    session_destroy();
    echo json_encode(['success' => true]);
}

// ========== МАРКИ ==========

// Получение списка марок
elseif ($action === 'list') {
    $user_id = $_SESSION['user_id'] ?? null;
    $public_only = $_GET['public_only'] ?? 'false';
    $search = $_GET['search'] ?? '';
    $country = $_GET['country'] ?? '';
    $year = $_GET['year'] ?? '';
    $tag = $_GET['tag'] ?? '';
    
    if ($public_only === 'true') {
        $sql = "SELECT s.*, u.username FROM stamps s 
                JOIN users u ON s.user_id = u.id 
                WHERE u.is_public = 1";
    } else {
        if (!$user_id) {
            echo json_encode(['success' => false, 'error' => 'Не авторизован']);
            exit;
        }
        $sql = "SELECT s.*, u.username FROM stamps s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.user_id = :user_id";
    }
    
    if ($search) {
        $sql .= " AND (s.country LIKE :search OR s.description LIKE :search OR s.denomination LIKE :search)";
    }
    if ($country) $sql .= " AND s.country = :country";
    if ($year) $sql .= " AND s.year = :year";
    if ($tag) $sql .= " AND s.id IN (SELECT stamp_id FROM stamp_tags WHERE tag = :tag)";
    
    $sql .= " ORDER BY s.created_at DESC";
    
    $stmt = $db->prepare($sql);
    if (!$public_only && $user_id) $stmt->bindValue(':user_id', $user_id);
    if ($search) $stmt->bindValue(':search', "%$search%");
    if ($country) $stmt->bindValue(':country', $country);
    if ($year) $stmt->bindValue(':year', $year);
    if ($tag) $stmt->bindValue(':tag', $tag);
    
    $result = $stmt->execute();
    $stamps = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $row['tags'] = getStampTags($row['id']);
        $stamps[] = $row;
    }
    
    echo json_encode(['success' => true, 'data' => $stamps]);
}

// Получение одной марки
elseif ($action === 'get') {
    $user_id = checkAuth();
    $id = $_GET['id'] ?? 0;
    
    $stmt = $db->prepare("SELECT * FROM stamps WHERE id = :id AND user_id = :user_id");
    $stmt->bindValue(':id', $id);
    $stmt->bindValue(':user_id', $user_id);
    $result = $stmt->execute();
    $stamp = $result->fetchArray(SQLITE3_ASSOC);
    
    if ($stamp) {
        $stamp['tags'] = getStampTags($stamp['id']);
        echo json_encode(['success' => true, 'data' => $stamp]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Марка не найдена']);
    }
}

// Добавление марки
elseif ($action === 'add') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Создаём папку пользователя
    $user_upload_dir = "uploads/user_{$user_id}/";
    if (!file_exists($user_upload_dir)) mkdir($user_upload_dir, 0777, true);
    
    $image_path = '';
    if (!empty($data['image_base64'])) {
        $img_data = str_replace('data:image/jpeg;base64,', '', $data['image_base64']);
        $img_data = str_replace('data:image/png;base64,', '', $img_data);
        $img_data = base64_decode($img_data);
        $filename = uniqid() . '.jpg';
        file_put_contents($user_upload_dir . $filename, $img_data);
        $image_path = $user_upload_dir . $filename;
    }
    
    $stmt = $db->prepare("INSERT INTO stamps (user_id, country, year, denomination, description, condition, estimated_price, currency, is_favorite, image_path) 
                          VALUES (:uid, :country, :year, :denom, :desc, :cond, :price, :curr, :fav, :img)");
    $stmt->bindValue(':uid', $user_id);
    $stmt->bindValue(':country', $data['country']);
    $stmt->bindValue(':year', $data['year']);
    $stmt->bindValue(':denom', $data['denomination']);
    $stmt->bindValue(':desc', $data['description'] ?? '');
    $stmt->bindValue(':cond', $data['condition'] ?? 'Хорошее');
    $stmt->bindValue(':price', $data['estimated_price'] ?? null);
    $stmt->bindValue(':curr', $data['currency'] ?? 'USD');
    $stmt->bindValue(':fav', $data['is_favorite'] ?? 0);
    $stmt->bindValue(':img', $image_path);
    
    if ($stmt->execute()) {
        $stamp_id = $db->lastInsertRowID();
        
        // Сохраняем теги
        if (!empty($data['tags'])) {
            updateStampTags($stamp_id, $data['tags']);
        }
        
        logHistory($user_id, 'add', $stamp_id);
        echo json_encode(['success' => true, 'id' => $stamp_id]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка добавления']);
    }
}

// Обновление марки
elseif ($action === 'update') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $user_upload_dir = "uploads/user_{$user_id}/";
    $image_path = $data['existing_image'] ?? '';
    
    if (!empty($data['image_base64'])) {
        if (!file_exists($user_upload_dir)) mkdir($user_upload_dir, 0777, true);
        $img_data = str_replace('data:image/jpeg;base64,', '', $data['image_base64']);
        $img_data = str_replace('data:image/png;base64,', '', $img_data);
        $img_data = base64_decode($img_data);
        $filename = uniqid() . '.jpg';
        file_put_contents($user_upload_dir . $filename, $img_data);
        $image_path = $user_upload_dir . $filename;
    }
    
    $stmt = $db->prepare("UPDATE stamps SET 
                          country = :country,
                          year = :year,
                          denomination = :denom,
                          description = :desc,
                          condition = :cond,
                          estimated_price = :price,
                          currency = :curr,
                          is_favorite = :fav,
                          image_path = :img,
                          updated_at = CURRENT_TIMESTAMP
                          WHERE id = :id AND user_id = :uid");
    
    $stmt->bindValue(':id', $data['id']);
    $stmt->bindValue(':uid', $user_id);
    $stmt->bindValue(':country', $data['country']);
    $stmt->bindValue(':year', $data['year']);
    $stmt->bindValue(':denom', $data['denomination']);
    $stmt->bindValue(':desc', $data['description'] ?? '');
    $stmt->bindValue(':cond', $data['condition'] ?? 'Хорошее');
    $stmt->bindValue(':price', $data['estimated_price'] ?? null);
    $stmt->bindValue(':curr', $data['currency'] ?? 'USD');
    $stmt->bindValue(':fav', $data['is_favorite'] ?? 0);
    $stmt->bindValue(':img', $image_path);
    
    if ($stmt->execute()) {
        // Обновляем теги
        if (isset($data['tags'])) {
            updateStampTags($data['id'], $data['tags']);
        }
        
        logHistory($user_id, 'update', $data['id']);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка обновления']);
    }
}

// Удаление марки
elseif ($action === 'delete') {
    $user_id = checkAuth();
    $id = $_GET['id'] ?? 0;
    
    logHistory($user_id, 'delete', $id);
    
    $stmt = $db->prepare("DELETE FROM stamps WHERE id = :id AND user_id = :uid");
    $stmt->bindValue(':id', $id);
    $stmt->bindValue(':uid', $user_id);
    $stmt->execute();
    
    $db->exec("DELETE FROM stamp_tags WHERE stamp_id = $id");
    
    echo json_encode(['success' => true]);
}

// ========== ПРОФИЛЬ ==========

// Получение данных пользователя
elseif ($action === 'get_user') {
    $user_id = checkAuth();
    $user = getUserById($user_id);
    echo json_encode(['success' => true, 'user' => $user]);
}

// Обновление профиля
elseif ($action === 'update_profile') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare("UPDATE users SET username = :username, email = :email, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
    $stmt->bindValue(':username', $data['username']);
    $stmt->bindValue(':email', $data['email']);
    $stmt->bindValue(':id', $user_id);
    
    echo json_encode(['success' => $stmt->execute()]);
}

// Обновление приватности
elseif ($action === 'update_privacy') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare("UPDATE users SET is_public = :is_public WHERE id = :id");
    $stmt->bindValue(':is_public', $data['is_public']);
    $stmt->bindValue(':id', $user_id);
    
    echo json_encode(['success' => $stmt->execute()]);
}

// Смена пароля
elseif ($action === 'change_password') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = :id");
    $stmt->bindValue(':id', $user_id);
    $result = $stmt->execute();
    $user = $result->fetchArray(SQLITE3_ASSOC);
    
    if (password_verify($data['current'], $user['password_hash'])) {
        $new_hash = password_hash($data['new'], PASSWORD_DEFAULT);
        $update = $db->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
        $update->bindValue(':hash', $new_hash);
        $update->bindValue(':id', $user_id);
        echo json_encode(['success' => $update->execute()]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Неверный текущий пароль']);
    }
}

// Загрузка аватара
elseif ($action === 'upload_avatar') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $avatar_dir = "uploads/avatars/";
    if (!file_exists($avatar_dir)) mkdir($avatar_dir, 0777, true);
    
    $filename = "user_{$user_id}_" . uniqid() . ".jpg";
    $img_data = str_replace('data:image/jpeg;base64,', '', $data['avatar']);
    $img_data = str_replace('data:image/png;base64,', '', $img_data);
    $img_data = base64_decode($img_data);
    file_put_contents($avatar_dir . $filename, $img_data);
    
    $stmt = $db->prepare("UPDATE users SET avatar = :avatar WHERE id = :id");
    $stmt->bindValue(':avatar', $avatar_dir . $filename);
    $stmt->bindValue(':id', $user_id);
    
    echo json_encode(['success' => $stmt->execute()]);
}

// Получение истории
elseif ($action === 'get_history') {
    $user_id = checkAuth();
    
    $stmt = $db->prepare("SELECT * FROM stamp_history WHERE user_id = :uid ORDER BY created_at DESC LIMIT 50");
    $stmt->bindValue(':uid', $user_id);
    $result = $stmt->execute();
    
    $history = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $history[] = $row;
    }
    
    echo json_encode(['success' => true, 'data' => $history]);
}

// ========== МАРКЕТПЛЕЙС ==========

// Получение объявлений
elseif ($action === 'marketplace_list') {
    $search = $_GET['search'] ?? '';
    $type = $_GET['type'] ?? '';
    $condition = $_GET['condition'] ?? '';
    $min_price = $_GET['min_price'] ?? '';
    $max_price = $_GET['max_price'] ?? '';
    $sort = $_GET['sort'] ?? 'newest';
    
    $sql = "SELECT ml.*, s.country, s.year, s.denomination, s.condition as stamp_condition, s.image_path, u.username as seller_username
            FROM marketplace_listings ml
            JOIN stamps s ON ml.stamp_id = s.id
            JOIN users u ON ml.seller_id = u.id
            WHERE ml.status = 'active'";
    
    if ($search) $sql .= " AND (s.country LIKE '%$search%' OR s.description LIKE '%$search%')";
    if ($type) $sql .= " AND ml.type = '$type'";
    if ($condition) $sql .= " AND s.condition = '$condition'";
    if ($min_price) $sql .= " AND ml.price >= $min_price";
    if ($max_price) $sql .= " AND ml.price <= $max_price";
    
    switch ($sort) {
        case 'price_asc': $sql .= " ORDER BY ml.price ASC"; break;
        case 'price_desc': $sql .= " ORDER BY ml.price DESC"; break;
        case 'newest': $sql .= " ORDER BY ml.created_at DESC"; break;
        default: $sql .= " ORDER BY ml.created_at DESC";
    }
    
    $result = $db->query($sql);
    $listings = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $listings[] = $row;
    }
    
    echo json_encode(['success' => true, 'data' => $listings]);
}

// Добавление объявления
elseif ($action === 'marketplace_add') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare("INSERT INTO marketplace_listings (stamp_id, seller_id, price, type, trade_wanted, comment) 
                          VALUES (:sid, :uid, :price, :type, :trade, :comment)");
    $stmt->bindValue(':sid', $data['stamp_id']);
    $stmt->bindValue(':uid', $user_id);
    $stmt->bindValue(':price', $data['price'] ?? null);
    $stmt->bindValue(':type', $data['type']);
    $stmt->bindValue(':trade', $data['trade_wanted'] ?? '');
    $stmt->bindValue(':comment', $data['comment'] ?? '');
    
    echo json_encode(['success' => $stmt->execute()]);
}

// Мои объявления
elseif ($action === 'marketplace_my') {
    $user_id = checkAuth();
    
    $stmt = $db->prepare("SELECT ml.*, s.country, s.year, s.denomination 
                          FROM marketplace_listings ml
                          JOIN stamps s ON ml.stamp_id = s.id
                          WHERE ml.seller_id = :uid
                          ORDER BY ml.created_at DESC");
    $stmt->bindValue(':uid', $user_id);
    $result = $stmt->execute();
    
    $listings = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $listings[] = $row;
    }
    
    echo json_encode(['success' => true, 'data' => $listings]);
}

// Удаление объявления
elseif ($action === 'marketplace_delete') {
    $user_id = checkAuth();
    $id = $_GET['id'] ?? 0;
    
    $stmt = $db->prepare("DELETE FROM marketplace_listings WHERE id = :id AND seller_id = :uid");
    $stmt->bindValue(':id', $id);
    $stmt->bindValue(':uid', $user_id);
    
    echo json_encode(['success' => $stmt->execute()]);
}

// ========== ЭКСПОРТ/ИМПОРТ ==========

// Экспорт коллекции
elseif ($action === 'export') {
    $user_id = checkAuth();
    
    $stmt = $db->prepare("SELECT * FROM stamps WHERE user_id = :uid");
    $stmt->bindValue(':uid', $user_id);
    $result = $stmt->execute();
    
    $stamps = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $row['tags'] = getStampTags($row['id']);
        unset($row['user_id']);
        $stamps[] = $row;
    }
    
    echo json_encode(['success' => true, 'data' => $stamps]);
}

// Импорт коллекции
elseif ($action === 'import') {
    $user_id = checkAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    $stamps = $data['stamps'];
    $imported = 0;
    
    foreach ($stamps as $stamp) {
        $stmt = $db->prepare("INSERT INTO stamps (user_id, country, year, denomination, description, condition, estimated_price, currency, is_favorite) 
                              VALUES (:uid, :country, :year, :denom, :desc, :cond, :price, :curr, :fav)");
        $stmt->bindValue(':uid', $user_id);
        $stmt->bindValue(':country', $stamp['country']);
        $stmt->bindValue(':year', $stamp['year']);
        $stmt->bindValue(':denom', $stamp['denomination']);
        $stmt->bindValue(':desc', $stamp['description'] ?? '');
        $stmt->bindValue(':cond', $stamp['condition'] ?? 'Хорошее');
        $stmt->bindValue(':price', $stamp['estimated_price'] ?? null);
        $stmt->bindValue(':curr', $stamp['currency'] ?? 'USD');
        $stmt->bindValue(':fav', $stamp['is_favorite'] ?? 0);
        
        if ($stmt->execute()) {
            $stamp_id = $db->lastInsertRowID();
            if (!empty($stamp['tags'])) {
                updateStampTags($stamp_id, implode(',', $stamp['tags']));
            }
            $imported++;
        }
    }
    
    echo json_encode(['success' => true, 'imported' => $imported]);
}

// Поиск в каталоге
elseif ($action === 'search_catalog') {
    $query = $_GET['query'] ?? '';
    // Здесь можно подключить внешний API каталога
    // Пока возвращаем заглушку
    echo json_encode(['success' => true, 'data' => []]);
}

// По умолчанию
else {
    echo json_encode(['success' => false, 'error' => 'Неизвестное действие']);
}
?>