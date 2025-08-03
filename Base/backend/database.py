from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
from datetime import datetime
import os

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    avatar_url = Column(Text)
    status = Column(String(50), default='active')
    preferences = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar_url': self.avatar_url,
            'status': self.status,
            'preferences': self.preferences,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ChatSession(Base):
    __tablename__ = 'chat_sessions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), default='New Chat')
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="session", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey('chat_sessions.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    message = Column(Text, nullable=False)
    response = Column(Text)
    message_type = Column(String(50), default='text')
    message_metadata = Column(JSON, default={})  # Renamed from 'metadata' to avoid SQLAlchemy conflict
    tokens_used = Column(Integer, default=0)
    response_time = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    user = relationship("User", back_populates="messages")
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'user_id': self.user_id,
            'message': self.message,
            'response': self.response,
            'message_type': self.message_type,
            'metadata': self.message_metadata,  # Return as 'metadata' for API compatibility
            'tokens_used': self.tokens_used,
            'response_time': self.response_time,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ChatHistory(Base):
    __tablename__ = 'chat_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    session_id = Column(Integer, ForeignKey('chat_sessions.id'), nullable=False)
    message_preview = Column(Text)
    last_activity = Column(DateTime, default=datetime.utcnow)
    message_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User")
    session = relationship("ChatSession", back_populates="chat_history")
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'message_preview': self.message_preview,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'message_count': self.message_count
        }

class ApiKey(Base):
    __tablename__ = 'api_keys'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    key_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    permissions = Column(JSON, default=[])
    expires_at = Column(DateTime)
    last_used = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'permissions': self.permissions,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SystemSettings(Base):
    __tablename__ = 'system_settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(Text)
    description = Column(Text)
    category = Column(String(100), default='general')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'category': self.category,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DatabaseManager:
    def __init__(self, database_url=None):
        """
        Initialize database connection
        
        Examples:
        - SQLite: sqlite:///./chatbot.db
        - PostgreSQL: postgresql://user:password@localhost:5432/chatbot
        - MySQL: mysql+pymysql://user:password@localhost:3306/chatbot
        """
        if database_url is None:
            database_url = os.getenv('DATABASE_URL', 'sqlite:///./chatbot.db')
        
        self.engine = create_engine(database_url, echo=os.getenv('DB_ECHO', 'False').lower() == 'true')
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        
    def create_tables(self):
        """Create all tables"""
        Base.metadata.create_all(bind=self.engine)
        self.insert_default_settings()
        print("✅ Database tables created successfully")
    
    def get_session(self):
        """Get database session"""
        return self.SessionLocal()
    
    def insert_default_settings(self):
        """Insert default system settings"""
        default_settings = [
            {'key': 'max_tokens', 'value': '4000', 'description': 'Maximum tokens per response', 'category': 'llm'},
            {'key': 'temperature', 'value': '0.7', 'description': 'LLM temperature setting', 'category': 'llm'},
            {'key': 'max_history_items', 'value': '100', 'description': 'Maximum chat history items', 'category': 'chat'},
            {'key': 'enable_history', 'value': 'true', 'description': 'Enable chat history', 'category': 'chat'},
            {'key': 'history_retention_days', 'value': '30', 'description': 'Days to retain chat history', 'category': 'chat'},
            {'key': 'enable_claude_sonnet_4', 'value': 'true', 'description': 'Enable Claude Sonnet 4 for all clients', 'category': 'llm'}
        ]
        
        db = self.get_session()
        try:
            for setting_data in default_settings:
                # Check if setting already exists
                existing = db.query(SystemSettings).filter_by(key=setting_data['key']).first()
                if not existing:
                    setting = SystemSettings(**setting_data)
                    db.add(setting)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Error inserting default settings: {e}")
        finally:
            db.close()

# Global database manager instance
db_manager = None

def init_database(database_url=None):
    """Initialize database with given URL"""
    global db_manager
    db_manager = DatabaseManager(database_url)
    db_manager.create_tables()
    return db_manager

def get_db():
    """Dependency to get database session"""
    if db_manager is None:
        raise Exception("Database not initialized. Call init_database() first.")
    
    db = db_manager.get_session()
    try:
        yield db
    finally:
        db.close()
