from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import TestResult, User, Test
from schemas import ResultResponse

router = APIRouter(prefix="/teacher", tags=["teacher"])

@router.get("/results", response_model=List[ResultResponse])
def get_all_results(teacher_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - преподаватель
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view all results")
    
    # Получаем все результаты
    results = db.query(TestResult).all()
    
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

@router.get("/results/test/{test_id}", response_model=List[ResultResponse])
def get_results_by_test(test_id: int, teacher_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - преподаватель
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view results")
    
    # Проверка существования теста
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Получаем результаты по конкретному тесту
    results = db.query(TestResult).filter(TestResult.test_id == test_id).all()
    
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

@router.get("/results/student/{student_id}", response_model=List[ResultResponse])
def get_results_by_student(student_id: int, teacher_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - преподаватель
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view results")
    
    # Проверка существования студента
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Получаем результаты конкретного студента
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

@router.get("/statistics")
def get_statistics(teacher_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - преподаватель
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view statistics")
    
    # Общая статистика
    total_tests = db.query(Test).count()
    total_students = db.query(User).filter(User.role == "student").count()
    total_attempts = db.query(TestResult).count()
    
    # Статистика по тестам
    tests = db.query(Test).all()
    tests_stats = []
    
    for test in tests:
        results = db.query(TestResult).filter(TestResult.test_id == test.id).all()
        if results:
            avg_score = sum(r.score for r in results) / len(results)
            avg_percentage = (avg_score / test.questions.__len__() * 100) if test.questions else 0
        else:
            avg_score = 0
            avg_percentage = 0
        
        tests_stats.append({
            "test_id": test.id,
            "test_title": test.title,
            "attempts": len(results),
            "avg_score": round(avg_score, 2),
            "avg_percentage": round(avg_percentage, 2)
        })
    
    return {
        "total_tests": total_tests,
        "total_students": total_students,
        "total_attempts": total_attempts,
        "tests_statistics": tests_stats
    }
