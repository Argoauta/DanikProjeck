from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    
    class Config:
        from_attributes = True

# Option schemas
class OptionCreate(BaseModel):
    option_text: str
    is_correct: bool

class OptionResponse(BaseModel):
    id: int
    option_text: str
    is_correct: bool
    
    class Config:
        from_attributes = True

class OptionResponseStudent(BaseModel):
    id: int
    option_text: str
    
    class Config:
        from_attributes = True

# Question schemas
class QuestionCreate(BaseModel):
    question_text: str
    options: List[OptionCreate]

class QuestionResponse(BaseModel):
    id: int
    question_text: str
    options: List[OptionResponse]
    
    class Config:
        from_attributes = True

class QuestionResponseStudent(BaseModel):
    id: int
    question_text: str
    options: List[OptionResponseStudent]
    
    class Config:
        from_attributes = True

# Test schemas
class TestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    questions: List[QuestionCreate]

class TestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    questions: Optional[List[QuestionCreate]] = None

class TestResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    teacher_id: int
    created_at: datetime
    questions: List[QuestionResponse]
    
    class Config:
        from_attributes = True

class TestListResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    created_at: datetime
    questions_count: int
    
    class Config:
        from_attributes = True

class TestResponseStudent(BaseModel):
    id: int
    title: str
    description: Optional[str]
    questions: List[QuestionResponseStudent]
    
    class Config:
        from_attributes = True

# Answer schemas
class AnswerSubmit(BaseModel):
    question_id: int
    selected_option_ids: List[int]

class TestSubmit(BaseModel):
    test_id: int
    answers: List[AnswerSubmit]

# Result schemas
class ResultResponse(BaseModel):
    id: int
    user_id: int
    test_id: int
    score: int
    total_questions: int
    completed_at: datetime
    username: str
    test_title: str
    
    class Config:
        from_attributes = True

class DetailedResultResponse(BaseModel):
    id: int
    score: int
    total_questions: int
    completed_at: datetime
    test_title: str
    questions: List[dict]
    
    class Config:
        from_attributes = True
