from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Test, Question, Option, User
from schemas import TestCreate, TestResponse, TestUpdate, TestListResponse

router = APIRouter(prefix="/tests", tags=["tests"])

@router.post("/", response_model=TestResponse)
def create_test(test: TestCreate, teacher_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - преподаватель
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=403, detail="Only teachers can create tests")
    
    # Создание теста
    new_test = Test(
        title=test.title,
        description=test.description,
        teacher_id=teacher_id
    )
    db.add(new_test)
    db.flush()
    
    # Создание вопросов и вариантов
    for question_data in test.questions:
        new_question = Question(
            test_id=new_test.id,
            question_text=question_data.question_text
        )
        db.add(new_question)
        db.flush()
        
        for option_data in question_data.options:
            new_option = Option(
                question_id=new_question.id,
                option_text=option_data.option_text,
                is_correct=option_data.is_correct
            )
            db.add(new_option)
    
    db.commit()
    db.refresh(new_test)
    
    return new_test

@router.get("/", response_model=List[TestListResponse])
def get_all_tests(db: Session = Depends(get_db)):
    tests = db.query(Test).all()
    
    result = []
    for test in tests:
        result.append(TestListResponse(
            id=test.id,
            title=test.title,
            description=test.description,
            created_at=test.created_at,
            questions_count=len(test.questions)
        ))
    
    return result

@router.get("/{test_id}", response_model=TestResponse)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    return test

@router.put("/{test_id}", response_model=TestResponse)
def update_test(test_id: int, test_update: TestUpdate, teacher_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - преподаватель
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=403, detail="Only teachers can update tests")
    
    # Поиск теста
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Проверка что тест принадлежит преподавателю
    if test.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="You can only update your own tests")
    
    # Обновление полей
    if test_update.title is not None:
        test.title = test_update.title
    if test_update.description is not None:
        test.description = test_update.description
    
    # Если есть новые вопросы - удаляем старые и создаем новые
    if test_update.questions is not None:
        # Удаление старых вопросов (каскадно удалятся и варианты)
        db.query(Question).filter(Question.test_id == test_id).delete()
        
        # Создание новых вопросов
        for question_data in test_update.questions:
            new_question = Question(
                test_id=test.id,
                question_text=question_data.question_text
            )
            db.add(new_question)
            db.flush()
            
            for option_data in question_data.options:
                new_option = Option(
                    question_id=new_question.id,
                    option_text=option_data.option_text,
                    is_correct=option_data.is_correct
                )
                db.add(new_option)
    
    db.commit()
    db.refresh(test)
    
    return test

@router.delete("/{test_id}")
def delete_test(test_id: int, teacher_id: int, db: Session = Depends(get_db)):
    # Проверка что пользователь - преподаватель
    teacher = db.query(User).filter(User.id == teacher_id, User.role == "teacher").first()
    if not teacher:
        raise HTTPException(status_code=403, detail="Only teachers can delete tests")
    
    # Поиск теста
    test = db.query(Test).filter(Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Проверка что тест принадлежит преподавателю
    if test.teacher_id != teacher_id:
        raise HTTPException(status_code=403, detail="You can only delete your own tests")
    
    db.delete(test)
    db.commit()
    
    return {"message": "Test deleted successfully"}
