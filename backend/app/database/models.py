"""
SQLite Database Models
Enterprise AI Data Analyst - Data Models
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, Integer, Float, Boolean, Text, JSON
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


class Dataset(Base):
    """Dataset metadata model"""
    __tablename__ = "datasets"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_id = Column(String, unique=True, index=True)
    upload_date = Column(DateTime, default=datetime.utcnow, index=True)
    num_rows = Column(Integer)
    num_columns = Column(Integer)
    file_size_bytes = Column(Integer)
    health_score = Column(Float, default=0.0)
    columns_info = Column(JSON)  # Column names and types
    preview_data = Column(JSON)  # First few rows
    analysis_status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)


class AnalysisResult(Base):
    """Analysis results storage"""
    __tablename__ = "analysis_results"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, index=True)
    analysis_type = Column(String, index=True)  # profiling, analytics, etc
    result_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    processing_time_seconds = Column(Float)


class Report(Base):
    """Generated reports storage"""
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, index=True)
    report_type = Column(String)  # markdown, pdf, executive
    title = Column(String)
    content = Column(Text)
    charts_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    """Chat conversation history"""
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    dataset_id = Column(String, index=True)
    role = Column(String)  # user, assistant
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    tokens_used = Column(Integer, default=0)


class AIProviderConfig(Base):
    """AI provider configuration per user"""
    __tablename__ = "ai_provider_configs"

    id = Column(String, primary_key=True, index=True)
    provider = Column(String, index=True)  # openai, claude, gemini, groq, ollama
    model = Column(String)
    api_key = Column(String)  # Encrypted in production
    is_active = Column(Boolean, default=True)
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=4000)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
