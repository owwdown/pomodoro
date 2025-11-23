from sqlalchemy import Column, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "user" 
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(Text, nullable=False, unique=True)
    name = Column(Text, nullable=False)
    sub_status = Column(Boolean, default=False)
    pomodoro_count = Column(Integer, default=0)
    short_break_duration = Column(Integer, default=5)
    long_break_duration = Column(Integer, default=15)
    pomodoros_before_long_break = Column(Integer, default=4)

class AuthCode(Base):
    __tablename__ = "auth_code"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(Text, nullable=False)
    code = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_used = Column(Boolean, default=False)
