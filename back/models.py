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

class Timer(Base):
    __tablename__ = "timer"
    timer_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    type = Column(Text, nullable=False)  # 'work', 'short_break', 'long_break'
    work_time = Column(Integer, default=25)
    break_time = Column(Integer, default=5)
    start_time = Column(DateTime, nullable=False, default=func.now())
    end_time = Column(DateTime)
    is_completed = Column(Boolean, default=False)
    is_interrupted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", back_populates="timers")

class Tomato(Base):
    __tablename__ = "tomato"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    start_time = Column(DateTime, nullable=False, default=func.now())
    end_time = Column(DateTime)
    was_successful = Column(Boolean, default=False)
    sequence_number = Column(Integer)

    user = relationship("User", back_populates="tomatoes")

class Notification(Base):
    __tablename__ = "notification"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Text, nullable=False) 
    created_at = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="notifications")

class Statistic(Base):
    __tablename__ = "statistic"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id"), nullable=False)
    date = Column(DateTime, default=func.now())
    tomatoes = Column(Integer, default=0)
    completed_timers = Column(Integer, default=0)
    total_focus_time = Column(Integer, default=0)
    
    user = relationship("User", back_populates="statistics")

class AuthCode(Base):
    __tablename__ = "auth_code"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(Text, nullable=False)
    code = Column(Text, nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_used = Column(Boolean, default=False)

User.timers = relationship("Timer", back_populates="user", cascade="all, delete-orphan")
User.tomatoes = relationship("Tomato", back_populates="user", cascade="all, delete-orphan")
User.notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
User.statistics = relationship("Statistic", back_populates="user", cascade="all, delete-orphan")