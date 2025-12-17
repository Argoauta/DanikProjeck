from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import auth, tests, student, teacher

# Создание таблиц
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Testing System API")

# CORS для работы с frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
app.include_router(auth.router)
app.include_router(tests.router)
app.include_router(student.router)
app.include_router(teacher.router)


