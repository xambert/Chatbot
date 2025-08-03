#!/usr/bin/env python3
"""
Database reset script - drops all tables and recreates them
"""
import os
import sys
from database import init_database, Base

def reset_database():
    # Get database URL from environment or use default
    database_url = os.getenv('DATABASE_URL', 'sqlite:///./chatbot.db')
    
    print(f"Resetting database: {database_url}")
    
    # Remove SQLite file if it exists
    if database_url.startswith('sqlite:///'):
        db_file = database_url.replace('sqlite:///', '')
        if os.path.exists(db_file):
            os.remove(db_file)
            print(f"Removed existing database file: {db_file}")
    
    # Initialize database with fresh schema
    db_manager = init_database(database_url)
    print("✅ Database reset and recreated successfully!")
    
    return db_manager

if __name__ == "__main__":
    reset_database()
