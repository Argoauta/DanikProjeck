const API_URL = 'http://localhost:8000';
let currentUser = null;
let currentTest = null;

// Проверка авторизации
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'index.html';
        return null;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'student') {
        window.location.href = 'index.html';
        return null;
    }
    
    return user;
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    currentUser = checkAuth();
    if (currentUser) {
        document.getElementById('username').textContent = currentUser.username;
        loadTests();
    }
});

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Загрузка списка тестов
async function loadTests() {
    try {
        const response = await fetch(`${API_URL}/student/tests`);
        if (!response.ok) throw new Error('Failed to load tests');
        
        const tests = await response.json();
        displayTests(tests);
    } catch (error) {
        console.error('Error loading tests:', error);
        alert('Ошибка загрузки тестов');
    }
}

function displayTests(tests) {
    const container = document.getElementById('testsList');
    
    if (tests.length === 0) {
        container.innerHTML = '<p>Нет доступных тестов</p>';
        return;
    }
    
    container.innerHTML = tests.map(test => `
        <div class="test-card">
            <h3>${test.title}</h3>
            <p>${test.description || 'Без описания'}</p>
            <p><strong>Вопросов:</strong> ${test.questions.length}</p>
            <button onclick="startTest(${test.id})">Начать тест</button>
        </div>
    `).join('');
}

// Начало теста
async function startTest(testId) {
    try {
        const response = await fetch(`${API_URL}/student/tests/${testId}`);
        if (!response.ok) throw new Error('Failed to load test');
        
        currentTest = await response.json();
        displayTest(currentTest);
    } catch (error) {
        console.error('Error loading test:', error);
        alert('Ошибка загрузки теста');
    }
}

function displayTest(test) {
    document.getElementById('testsView').classList.add('hidden');
    document.getElementById('testView').classList.remove('hidden');
    
    document.getElementById('testTitle').textContent = test.title;
    document.getElementById('testDescription').textContent = test.description || '';
    
    const container = document.getElementById('questionsContainer');
    container.innerHTML = test.questions.map((question, index) => `
        <div class="question-block">
            <h3>Вопрос ${index + 1}: ${question.question_text}</h3>
            <div>
                ${question.options.map(option => `
                    <div class="option">
                        <input type="checkbox" 
                               name="question_${question.id}" 
                               value="${option.id}" 
                               id="option_${option.id}">
                        <label for="option_${option.id}">${option.option_text}</label>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    // Обработчик отправки
    const form = document.getElementById('testForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        submitTest();
    };
}

async function submitTest() {
    if (!confirm('Вы уверены, что хотите отправить ответы?')) {
        return;
    }
    
    // Собираем ответы
    const answers = currentTest.questions.map(question => {
        const checkboxes = document.querySelectorAll(`input[name="question_${question.id}"]:checked`);
        const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
        
        return {
            question_id: question.id,
            selected_option_ids: selectedIds
        };
    });
    
    try {
        const response = await fetch(`${API_URL}/student/submit?student_id=${currentUser.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                test_id: currentTest.id,
                answers: answers
            })
        });
        
        if (!response.ok) throw new Error('Failed to submit test');
        
        const result = await response.json();
        showResult(result.result_id);
        
    } catch (error) {
        console.error('Error submitting test:', error);
        alert('Ошибка отправки теста');
    }
}

async function showResult(resultId) {
    try {
        const response = await fetch(`${API_URL}/student/results/${resultId}?student_id=${currentUser.id}`);
        if (!response.ok) throw new Error('Failed to load result');
        
        const result = await response.json();
        displayResult(result);
        
    } catch (error) {
        console.error('Error loading result:', error);
        alert('Ошибка загрузки результата');
    }
}

function displayResult(result) {
    document.getElementById('testView').classList.add('hidden');
    document.getElementById('resultView').classList.remove('hidden');
    
    const percentage = Math.round((result.score / result.total_questions) * 100);
    document.getElementById('scoreDisplay').textContent = `${result.score} / ${result.total_questions}`;
    document.getElementById('scoreText').textContent = `Процент правильных ответов: ${percentage}%`;
    
    const container = document.getElementById('detailedResults');
    container.innerHTML = '<h2>Детальные результаты</h2>' + result.questions.map((question, index) => `
        <div class="question-block">
            <h3>Вопрос ${index + 1}: ${question.question_text}</h3>
            <div>
                ${question.options.map(option => {
                    let cssClass = '';
                    if (option.is_correct && option.was_selected) {
                        cssClass = 'correct';
                    } else if (option.is_correct && !option.was_selected) {
                        cssClass = 'not-selected';
                    } else if (!option.is_correct && option.was_selected) {
                        cssClass = 'incorrect';
                    }
                    
                    return `
                        <div class="option ${cssClass}">
                            <input type="checkbox" 
                                   ${option.was_selected ? 'checked' : ''} 
                                   disabled>
                            <label>${option.text}
                                ${option.is_correct ? ' ✓ (правильно)' : ''}
                                ${!option.is_correct && option.was_selected ? ' ✗ (неправильно)' : ''}
                            </label>
                        </div>
                    `;
                }).join('')}
            </div>
            <p><strong>${question.is_correct ? '✓ Правильно' : '✗ Неправильно'}</strong></p>
        </div>
    `).join('');
}

function backToTests() {
    document.getElementById('testsView').classList.remove('hidden');
    document.getElementById('testView').classList.add('hidden');
    document.getElementById('resultView').classList.add('hidden');
    document.getElementById('myResultsView').classList.add('hidden');
    loadTests();
}

async function showMyResults() {
    try {
        const response = await fetch(`${API_URL}/student/my-results?student_id=${currentUser.id}`);
        if (!response.ok) throw new Error('Failed to load results');
        
        const results = await response.json();
        displayMyResults(results);
        
    } catch (error) {
        console.error('Error loading results:', error);
        alert('Ошибка загрузки результатов');
    }
}

function displayMyResults(results) {
    document.getElementById('testsView').classList.add('hidden');
    document.getElementById('myResultsView').classList.remove('hidden');
    
    const tbody = document.querySelector('#resultsTable tbody');
    
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Нет результатов</td></tr>';
        return;
    }
    
    tbody.innerHTML = results.map(result => {
        const percentage = Math.round((result.score / result.total_questions) * 100);
        const date = new Date(result.completed_at).toLocaleString('ru-RU');
        
        return `
            <tr>
                <td>${result.test_title}</td>
                <td>${result.score} / ${result.total_questions} (${percentage}%)</td>
                <td>${date}</td>
                <td>
                    <button onclick="showResult(${result.id})" class="btn-small">Подробнее</button>
                </td>
            </tr>
        `;
    }).join('');
}
