const API_URL = 'http://localhost:8000';

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    clearErrors();
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    clearErrors();
}

function clearErrors() {
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
    document.getElementById('registerSuccess').textContent = '';
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    if (!username || !password) {
        errorDiv.textContent = 'Заполните все поля';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Ошибка входа';
            return;
        }
        
        const data = await response.json();
        
        // Сохраняем данные пользователя
        localStorage.setItem('user', JSON.stringify(data));
        
        // Перенаправляем в зависимости от роли
        if (data.role === 'student') {
            window.location.href = 'student.html';
        } else if (data.role === 'teacher') {
            window.location.href = 'teacher.html';
        }
        
    } catch (error) {
        errorDiv.textContent = 'Ошибка соединения с сервером';
        console.error('Login error:', error);
    }
}

async function register() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    
    errorDiv.textContent = '';
    successDiv.textContent = '';
    
    if (!username || !password) {
        errorDiv.textContent = 'Заполните все поля';
        return;
    }
    
    if (username.length < 3) {
        errorDiv.textContent = 'Имя пользователя должно быть минимум 3 символа';
        return;
    }
    
    if (password.length < 4) {
        errorDiv.textContent = 'Пароль должен быть минимум 4 символа';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, role })
        });
        
        if (!response.ok) {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Ошибка регистрации';
            return;
        }
        
        successDiv.textContent = 'Регистрация успешна! Войдите в систему.';
        
        // Очищаем поля
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        
        // Через 2 секунды показываем форму входа
        setTimeout(() => {
            showLogin();
        }, 2000);
        
    } catch (error) {
        errorDiv.textContent = 'Ошибка соединения с сервером';
        console.error('Register error:', error);
    }
}

// Enter для отправки формы
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    document.getElementById('registerPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            register();
        }
    });
});
