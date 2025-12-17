const API_URL = 'http://localhost:8000';
let currentUser = null;
let editingTestId = null;

// Проверка авторизации
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'index.html';
        return null;
    }
    
    const user = JSON.parse(userStr);
    if (user.role !== 'teacher') {
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
        const response = await fetch(`${API_URL}/tests/`);
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
        container.innerHTML = '<p>Нет созданных тестов</p>';
        return;
    }
    
    container.innerHTML = tests.map(test => `
        <div class="test-card">
            <h3>${test.title}</h3>
            <p>${test.description || 'Без описания'}</p>
            <p><strong>Вопросов:</strong> ${test.questions_count}</p>
            <p><small>Создан: ${new Date(test.created_at).toLocaleDateString('ru-RU')}</small></p>
            <div class="test-card-footer">
                <button onclick="editTest(${test.id})" class="btn-small">Редактировать</button>
                <button onclick="deleteTest(${test.id})" class="btn-small btn-danger">Удалить</button>
            </div>
        </div>
    `).join('');
}

// Модальное окно создания теста
function showCreateTestModal() {
    document.getElementById('createTestModal').classList.add('active');
    document.getElementById('testTitle').value = '';
    document.getElementById('testDescription').value = '';
    document.getElementById('questionsContainer').innerHTML = '';
    document.getElementById('createTestError').textContent = '';
    addQuestion();
}

function closeCreateTestModal() {
    document.getElementById('createTestModal').classList.remove('active');
}

let questionCounter = 0;

function addQuestion() {
    questionCounter++;
    const container = document.getElementById('questionsContainer');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-form';
    questionDiv.id = `question_${questionCounter}`;
    questionDiv.innerHTML = `
        <h4>Вопрос ${questionCounter}</h4>
        <div class="form-group">
            <label>Текст вопроса</label>
            <textarea class="question-text" placeholder="Введите текст вопроса"></textarea>
        </div>
        <div class="options-container"></div>
        <button type="button" onclick="addOption(${questionCounter})" class="btn-small add-option-btn">Добавить вариант</button>
        <button type="button" onclick="removeQuestion(${questionCounter})" class="btn-small btn-danger">Удалить вопрос</button>
    `;
    
    container.appendChild(questionDiv);
    
    // Добавляем 2 варианта по умолчанию
    addOption(questionCounter);
    addOption(questionCounter);
}

function removeQuestion(questionId) {
    const element = document.getElementById(`question_${questionId}`);
    if (element) {
        element.remove();
    }
}

let optionCounter = 0;

function addOption(questionId) {
    optionCounter++;
    const container = document.querySelector(`#question_${questionId} .options-container`);
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.id = `option_${optionCounter}`;
    optionDiv.innerHTML = `
        <input type="text" class="option-text" placeholder="Текст варианта">
        <label>
            <input type="checkbox" class="option-correct">
            Правильный
        </label>
        <button type="button" onclick="removeOption(${optionCounter})" class="btn-small btn-danger">✗</button>
    `;
    
    container.appendChild(optionDiv);
}

function removeOption(optionId) {
    const element = document.getElementById(`option_${optionId}`);
    if (element) {
        element.remove();
    }
}

async function saveTest() {
    const title = document.getElementById('testTitle').value.trim();
    const description = document.getElementById('testDescription').value.trim();
    const errorDiv = document.getElementById('createTestError');
    
    if (!title) {
        errorDiv.textContent = 'Введите название теста';
        return;
    }
    
    // Собираем вопросы
    const questions = [];
    const questionDivs = document.querySelectorAll('#questionsContainer .question-form');
    
    for (const questionDiv of questionDivs) {
        const questionText = questionDiv.querySelector('.question-text').value.trim();
        if (!questionText) {
            errorDiv.textContent = 'Заполните текст всех вопросов';
            return;
        }
        
        const options = [];
        const optionDivs = questionDiv.querySelectorAll('.option-input');
        
        if (optionDivs.length < 2) {
            errorDiv.textContent = 'В каждом вопросе должно быть минимум 2 варианта';
            return;
        }
        
        let hasCorrect = false;
        for (const optionDiv of optionDivs) {
            const optionText = optionDiv.querySelector('.option-text').value.trim();
            const isCorrect = optionDiv.querySelector('.option-correct').checked;
            
            if (!optionText) {
                errorDiv.textContent = 'Заполните текст всех вариантов';
                return;
            }
            
            if (isCorrect) hasCorrect = true;
            
            options.push({
                option_text: optionText,
                is_correct: isCorrect
            });
        }
        
        if (!hasCorrect) {
            errorDiv.textContent = 'В каждом вопросе должен быть хотя бы один правильный вариант';
            return;
        }
        
        questions.push({
            question_text: questionText,
            options: options
        });
    }
    
    if (questions.length === 0) {
        errorDiv.textContent = 'Добавьте хотя бы один вопрос';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tests/?teacher_id=${currentUser.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                description: description,
                questions: questions
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Ошибка создания теста';
            return;
        }
        
        closeCreateTestModal();
        loadTests();
        alert('Тест успешно создан!');
        
    } catch (error) {
        console.error('Error creating test:', error);
        errorDiv.textContent = 'Ошибка соединения с сервером';
    }
}

// Редактирование теста
async function editTest(testId) {
    try {
        const response = await fetch(`${API_URL}/tests/${testId}`);
        if (!response.ok) throw new Error('Failed to load test');
        
        const test = await response.json();
        showEditTestModal(test);
        
    } catch (error) {
        console.error('Error loading test:', error);
        alert('Ошибка загрузки теста');
    }
}

function showEditTestModal(test) {
    editingTestId = test.id;
    document.getElementById('editTestModal').classList.add('active');
    document.getElementById('editTestTitle').value = test.title;
    document.getElementById('editTestDescription').value = test.description || '';
    
    const container = document.getElementById('editQuestionsContainer');
    container.innerHTML = '';
    
    questionCounter = 0;
    optionCounter = 0;
    
    test.questions.forEach(question => {
        questionCounter++;
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-form';
        questionDiv.id = `edit_question_${questionCounter}`;
        
        let optionsHtml = '';
        question.options.forEach(option => {
            optionCounter++;
            optionsHtml += `
                <div class="option-input" id="edit_option_${optionCounter}">
                    <input type="text" class="option-text" placeholder="Текст варианта" value="${option.option_text}">
                    <label>
                        <input type="checkbox" class="option-correct" ${option.is_correct ? 'checked' : ''}>
                        Правильный
                    </label>
                    <button type="button" onclick="removeEditOption(${optionCounter})" class="btn-small btn-danger">✗</button>
                </div>
            `;
        });
        
        questionDiv.innerHTML = `
            <h4>Вопрос ${questionCounter}</h4>
            <div class="form-group">
                <label>Текст вопроса</label>
                <textarea class="question-text" placeholder="Введите текст вопроса">${question.question_text}</textarea>
            </div>
            <div class="options-container">${optionsHtml}</div>
            <button type="button" onclick="addEditOption(${questionCounter})" class="btn-small add-option-btn">Добавить вариант</button>
            <button type="button" onclick="removeEditQuestion(${questionCounter})" class="btn-small btn-danger">Удалить вопрос</button>
        `;
        
        container.appendChild(questionDiv);
    });
}

function closeEditTestModal() {
    document.getElementById('editTestModal').classList.remove('active');
    editingTestId = null;
}

function addEditQuestion() {
    questionCounter++;
    const container = document.getElementById('editQuestionsContainer');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-form';
    questionDiv.id = `edit_question_${questionCounter}`;
    questionDiv.innerHTML = `
        <h4>Вопрос ${questionCounter}</h4>
        <div class="form-group">
            <label>Текст вопроса</label>
            <textarea class="question-text" placeholder="Введите текст вопроса"></textarea>
        </div>
        <div class="options-container"></div>
        <button type="button" onclick="addEditOption(${questionCounter})" class="btn-small add-option-btn">Добавить вариант</button>
        <button type="button" onclick="removeEditQuestion(${questionCounter})" class="btn-small btn-danger">Удалить вопрос</button>
    `;
    
    container.appendChild(questionDiv);
    
    addEditOption(questionCounter);
    addEditOption(questionCounter);
}

function removeEditQuestion(questionId) {
    const element = document.getElementById(`edit_question_${questionId}`);
    if (element) {
        element.remove();
    }
}

function addEditOption(questionId) {
    optionCounter++;
    const container = document.querySelector(`#edit_question_${questionId} .options-container`);
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.id = `edit_option_${optionCounter}`;
    optionDiv.innerHTML = `
        <input type="text" class="option-text" placeholder="Текст варианта">
        <label>
            <input type="checkbox" class="option-correct">
            Правильный
        </label>
        <button type="button" onclick="removeEditOption(${optionCounter})" class="btn-small btn-danger">✗</button>
    `;
    
    container.appendChild(optionDiv);
}

function removeEditOption(optionId) {
    const element = document.getElementById(`edit_option_${optionId}`);
    if (element) {
        element.remove();
    }
}

async function updateTest() {
    const title = document.getElementById('editTestTitle').value.trim();
    const description = document.getElementById('editTestDescription').value.trim();
    const errorDiv = document.getElementById('editTestError');
    
    if (!title) {
        errorDiv.textContent = 'Введите название теста';
        return;
    }
    
    // Собираем вопросы
    const questions = [];
    const questionDivs = document.querySelectorAll('#editQuestionsContainer .question-form');
    
    for (const questionDiv of questionDivs) {
        const questionText = questionDiv.querySelector('.question-text').value.trim();
        if (!questionText) {
            errorDiv.textContent = 'Заполните текст всех вопросов';
            return;
        }
        
        const options = [];
        const optionDivs = questionDiv.querySelectorAll('.option-input');
        
        if (optionDivs.length < 2) {
            errorDiv.textContent = 'В каждом вопросе должно быть минимум 2 варианта';
            return;
        }
        
        let hasCorrect = false;
        for (const optionDiv of optionDivs) {
            const optionText = optionDiv.querySelector('.option-text').value.trim();
            const isCorrect = optionDiv.querySelector('.option-correct').checked;
            
            if (!optionText) {
                errorDiv.textContent = 'Заполните текст всех вариантов';
                return;
            }
            
            if (isCorrect) hasCorrect = true;
            
            options.push({
                option_text: optionText,
                is_correct: isCorrect
            });
        }
        
        if (!hasCorrect) {
            errorDiv.textContent = 'В каждом вопросе должен быть хотя бы один правильный вариант';
            return;
        }
        
        questions.push({
            question_text: questionText,
            options: options
        });
    }
    
    if (questions.length === 0) {
        errorDiv.textContent = 'Добавьте хотя бы один вопрос';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tests/${editingTestId}?teacher_id=${currentUser.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                description: description,
                questions: questions
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            errorDiv.textContent = error.detail || 'Ошибка обновления теста';
            return;
        }
        
        closeEditTestModal();
        loadTests();
        alert('Тест успешно обновлен!');
        
    } catch (error) {
        console.error('Error updating test:', error);
        errorDiv.textContent = 'Ошибка соединения с сервером';
    }
}

// Удаление теста
async function deleteTest(testId) {
    if (!confirm('Вы уверены, что хотите удалить этот тест?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tests/${testId}?teacher_id=${currentUser.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            alert(error.detail || 'Ошибка удаления теста');
            return;
        }
        
        loadTests();
        alert('Тест успешно удален!');
        
    } catch (error) {
        console.error('Error deleting test:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Статистика
async function showStatistics() {
    try {
        const response = await fetch(`${API_URL}/teacher/statistics?teacher_id=${currentUser.id}`);
        if (!response.ok) throw new Error('Failed to load statistics');
        
        const stats = await response.json();
        displayStatistics(stats);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
        alert('Ошибка загрузки статистики');
    }
}

function displayStatistics(stats) {
    document.getElementById('testsView').classList.add('hidden');
    document.getElementById('statisticsView').classList.remove('hidden');
    
    // Общие карточки
    const cardsContainer = document.getElementById('statsCards');
    cardsContainer.innerHTML = `
        <div class="stat-card">
            <h3>${stats.total_tests}</h3>
            <p>Всего тестов</p>
        </div>
        <div class="stat-card">
            <h3>${stats.total_students}</h3>
            <p>Студентов</p>
        </div>
        <div class="stat-card">
            <h3>${stats.total_attempts}</h3>
            <p>Попыток прохождения</p>
        </div>
    `;
    
    // Таблица статистики по тестам
    const tbody = document.querySelector('#statsTable tbody');
    if (stats.tests_statistics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Нет данных</td></tr>';
    } else {
        tbody.innerHTML = stats.tests_statistics.map(test => `
            <tr>
                <td>${test.test_title}</td>
                <td>${test.attempts}</td>
                <td>${test.avg_score}</td>
                <td>${test.avg_percentage}%</td>
            </tr>
        `).join('');
    }
}

function hideStatistics() {
    document.getElementById('statisticsView').classList.add('hidden');
    document.getElementById('testsView').classList.remove('hidden');
}

// Все результаты
async function showAllResults() {
    try {
        const response = await fetch(`${API_URL}/teacher/results?teacher_id=${currentUser.id}`);
        if (!response.ok) throw new Error('Failed to load results');
        
        const results = await response.json();
        displayAllResults(results);
        
    } catch (error) {
        console.error('Error loading results:', error);
        alert('Ошибка загрузки результатов');
    }
}

function displayAllResults(results) {
    document.getElementById('testsView').classList.add('hidden');
    document.getElementById('resultsView').classList.remove('hidden');
    
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
                <td>${result.username}</td>
                <td>${result.test_title}</td>
                <td>${result.score} / ${result.total_questions} (${percentage}%)</td>
                <td>${date}</td>
            </tr>
        `;
    }).join('');
}

function hideResults() {
    document.getElementById('resultsView').classList.add('hidden');
    document.getElementById('testsView').classList.remove('hidden');
}
