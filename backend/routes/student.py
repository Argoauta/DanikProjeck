from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from database import get_db
from models import Test, Question, Option, User, TestResult, UserAnswer
from schemas import TestResponseStudent, TestSubmit, DetailedResultResponse, ResultResponse

router = APIRouter(prefix="/student", tags=["student"])

@router.get("/tests", response_model=List[TestResponseStudent])
def get_tests_for_student(db: Session = Depends(get_db)):
    tests = db.query(Test).all()
    
    result = []
    for test in tests:
        questions_data = []
        for question in test.questions:
            options_data = [
                {"id": opt.id, "option_text": opt.option_text}
                for opt in question.options
            ]
            questions_data.append({
                "id": question.id,
                "question_text": question.question_text,
                "options": options_data
            })
        
        result.append(TestResponseStudent(
            id=test.id,
            title=test.title,
            description=test.description,
            questions=questions_data
        ))
    
    return result

@router.get("/tests/{test_id}", response_model=TestResponseStudent)
def get_test_for_student(test_id: int, db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    questions_data = []
    for question in test.questions:
        options_data = [
            {"id": opt.id, "option_text": opt.option_text}
            for opt in question.options
        ]
        questions_data.append({
            "id": question.id,
            "question_text": question.question_text,
            "options": options_data
        })
    
    return TestResponseStudent(
        id=test.id,
        title=test.title,
        description=test.description,
        questions=questions_data
    )

@router.post("/submit")
def submit_test(submission: TestSubmit, student_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - студент
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=403, detail="Only students can submit tests")
    
    # Поиск теста
    test = db.query(Test).filter(Test.id == submission.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Проверка ответов и подсчет баллов
    score = 0
    total_questions = len(test.questions)
    
    for answer in submission.answers:
        question = db.query(Question).filter(Question.id == answer.question_id).first()
        if not question:
            continue
        
        # Получаем правильные варианты для вопроса
        correct_options = set(
            opt.id for opt in question.options if opt.is_correct
        )
        
        # Получаем выбранные студентом варианты
        selected_options = set(answer.selected_option_ids)
        
        # Ответ правильный только если выбраны ВСЕ правильные и НЕ выбраны неправильные
        if correct_options == selected_options:
            score += 1
    
    # Создание результата
    result = TestResult(
        user_id=student_id,
        test_id=submission.test_id,
        score=score,
        total_questions=total_questions
    )
    db.add(result)
    db.flush()
    
    # Сохранение ответов
    for answer in submission.answers:
        user_answer = UserAnswer(
            result_id=result.id,
            question_id=answer.question_id,
            selected_options=json.dumps(answer.selected_option_ids)
        )
        db.add(user_answer)
    
    db.commit()
    db.refresh(result)
    
    return {
        "result_id": result.id,
        "score": score,
        "total_questions": total_questions,
        "percentage": round((score / total_questions * 100), 2) if total_questions > 0 else 0
    }

@router.get("/results/{result_id}", response_model=DetailedResultResponse)
def get_result_details(result_id: int, student_id: int, db: Session = Depends(get_db)):
    result = db.query(TestResult).filter(TestResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # Проверка что результат принадлежит студенту
    if result.user_id != student_id:
        raise HTTPException(status_code=403, detail="You can only view your own results")
    
    test = result.test
    questions_data = []
    
    for question in test.questions:
        # Находим ответ студента на этот вопрос
        user_answer = next(
            (ans for ans in result.answers if ans.question_id == question.id),
            None
        )
        
        selected_ids = []
        if user_answer:
            selected_ids = json.loads(user_answer.selected_options)
        
        # Собираем информацию о вариантах
        options_info = []
        correct_ids = []
        for opt in question.options:
            options_info.append({
                "id": opt.id,
                "text": opt.option_text,
                "is_correct": opt.is_correct,
                "was_selected": opt.id in selected_ids
            })
            if opt.is_correct:
                correct_ids.append(opt.id)
        
        # Определяем правильность ответа
        is_correct = set(selected_ids) == set(correct_ids)
        
        questions_data.append({
            "question_text": question.question_text,
            "options": options_info,
            "is_correct": is_correct
        })
    
    return DetailedResultResponse(
        id=result.id,
        score=result.score,
        total_questions=result.total_questions,
        completed_at=result.completed_at,
        test_title=test.title,
        questions=questions_data
    )

@router.get("/my-results", response_model=List[ResultResponse])
def get_my_results(student_id: int, db: Session = Depends(get_db)):
    results = db.query(TestResult).filter(TestResult.user_id == student_id).all()
    
    response = []
    for result in results:
        response.append(ResultResponse(
            id=result.id,
            user_id=result.user_id,
            test_id=result.test_id,
            score=result.score,
            total_questions=result.total_questions,
            completed_at=result.completed_at,
            username=result.user.username,
            test_title=result.test.title
        ))
    
    return response
