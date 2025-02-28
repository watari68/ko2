// auth.js - Kimlik doğrulama ve kullanıcı yönetimi

const AUTH_API_URL = '/api/auth';
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Sayfa yüklendiğinde token kontrolü
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    checkAuthStatus();
});

function setupAuthListeners() {
    // Login form işleyici
    document.getElementById('login-button').addEventListener('click', handleLogin);
    
    // Register form işleyici
    document.getElementById('register-button').addEventListener('click', handleRegister);
    
    // Form geçiş butonları
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showLoginError('Kullanıcı adı ve şifre gereklidir.');
        return;
    }
    
    try {
        const response = await fetch(`${AUTH_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Giriş başarısız');
        }
        
        // Token'ı kaydet ve karakterleri yükle
        setAuthToken(data.token);
        currentUser = data.user;
        
        // Karakter seçim ekranına geç
        showCharacterSelection();
    } catch (error) {
        showLoginError(error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    // Basit doğrulama
    if (!username || !email || !password) {
        showRegisterError('Tüm alanları doldurun.');
        return;
    }
    
    if (password !== confirmPassword) {
        showRegisterError('Şifreler eşleşmiyor.');
        return;
    }
    
    try {
        const response = await fetch(`${AUTH_API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Kayıt başarısız');
        }
        
        // Başarılı kayıt sonrası login formuna geç
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
        
        // Kullanıcıya başarılı bir şekilde kayıt olduğunu bildir
        showLoginSuccess('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
    } catch (error) {
        showRegisterError(error.message);
    }
}

function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function showLoginSuccess(message) {
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = message;
    errorElement.style.color = '#4CAF50';
    errorElement.style.display = 'block';
}

function showRegisterError(message) {
    const errorElement = document.getElementById('register-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function setAuthToken(token) {
    authToken = token;
    localStorage.setItem('authToken', token);
}

function clearAuthToken() {
    authToken = null;
    localStorage.removeItem('authToken');
    currentUser = null;
}

async function checkAuthStatus() {
    if (!authToken) {
        return;
    }
    
    try {
        const response = await fetch(`${AUTH_API_URL}/verify`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token geçersiz');
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Kullanıcı oturum açmış, karakter seçimine yönlendir
        showCharacterSelection();
    } catch (error) {
        console.error('Token doğrulama hatası:', error);
        clearAuthToken();
    }
}

function logout() {
    clearAuthToken();
    hideGameContainers();
    document.getElementById('login-container').classList.remove('hidden');
}

function hideGameContainers() {
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('character-selection').classList.add('hidden');
    document.getElementById('character-creation').classList.add('hidden');
}

function showCharacterSelection() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('character-selection').classList.remove('hidden');
    loadCharacters();
}