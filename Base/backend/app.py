from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError
from database import init_database, get_db, User, ChatSession, Message, ChatHistory, SystemSettings
import os
from datetime import datetime
import time
import random
import asyncio
from llm_websocket import send_to_llm, generate_fallback_response, check_llm_health

app = Flask(__name__, static_folder='static')
CORS(app)

# Initialize database
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./chatbot.db')
db_manager = init_database(DATABASE_URL)

# Middleware to add database session to request
@app.before_request
def before_request():
    request.db = next(get_db())

@app.teardown_request
def teardown_request(exception):
    if hasattr(request, 'db'):
        request.db.close()

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'database': 'connected'
    })

# LLM health check endpoint
@app.route('/api/llm/health', methods=['GET'])
def llm_health_check():
    """Check LLM WebSocket service health"""
    try:
        # Run async health check in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        health_status = loop.run_until_complete(check_llm_health())
        loop.close()
        
        return jsonify({
            'success': True,
            'llm_service': health_status,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'llm_service': {
                'status': 'error',
                'connected': False
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 500

# ==================== USER APIS ====================

@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        search = request.args.get('search', '')
        
        offset = (page - 1) * limit
        
        query = request.db.query(User)
        
        if search:
            query = query.filter(
                (User.name.contains(search)) | (User.email.contains(search))
            )
        
        total = query.count()
        users = query.offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [user.to_dict() for user in users],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        user = request.db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'data': user.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('email'):
            return jsonify({'success': False, 'error': 'Name and email are required'}), 400
        
        user = User(
            name=data['name'],
            email=data['email'],
            avatar_url=data.get('avatar_url'),
            preferences=data.get('preferences', {})
        )
        
        request.db.add(user)
        request.db.commit()
        
        return jsonify({
            'success': True,
            'data': {'id': user.id, 'message': 'User created successfully'}
        }), 201
        
    except IntegrityError:
        request.db.rollback()
        return jsonify({'success': False, 'error': 'User with this email already exists'}), 409
    except Exception as e:
        request.db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        user = request.db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']
        if 'preferences' in data:
            user.preferences = data['preferences']
        if 'status' in data:
            user.status = data['status']
        
        user.updated_at = datetime.utcnow()
        request.db.commit()
        
        return jsonify({'success': True, 'message': 'User updated successfully'})
        
    except Exception as e:
        request.db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        user = request.db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        request.db.delete(user)
        request.db.commit()
        
        return jsonify({'success': True, 'message': 'User deleted successfully'})
        
    except Exception as e:
        request.db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== SESSION APIS ====================

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'user_id is required'}), 400
        
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        status = request.args.get('status', 'active')
        
        offset = (page - 1) * limit
        
        query = request.db.query(ChatSession).filter_by(user_id=user_id)
        
        if status != 'all':
            query = query.filter_by(status=status)
        
        total = query.count()
        sessions = query.order_by(ChatSession.updated_at.desc()).offset(offset).limit(limit).all()
        
        # Add message count to each session
        session_data = []
        for session in sessions:
            session_dict = session.to_dict()
            message_count = request.db.query(Message).filter_by(session_id=session.id).count()
            session_dict['message_count'] = message_count
            session_data.append(session_dict)
        
        return jsonify({
            'success': True,
            'data': session_data,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions', methods=['POST'])
def create_session():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'user_id is required'}), 400
        
        # Verify user exists
        user = request.db.query(User).filter_by(id=user_id).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        session = ChatSession(
            user_id=user_id,
            title=data.get('title', 'New Chat')
        )
        
        request.db.add(session)
        request.db.commit()
        
        # Create chat history entry
        chat_history = ChatHistory(
            user_id=user_id,
            session_id=session.id,
            message_preview='New chat session started',
            message_count=0
        )
        request.db.add(chat_history)
        request.db.commit()
        
        return jsonify({
            'success': True,
            'data': {'id': session.id, 'message': 'Session created successfully'}
        }), 201
        
    except Exception as e:
        request.db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sessions/<int:session_id>', methods=['GET'])
def get_session(session_id):
    try:
        include_messages = request.args.get('include_messages', 'false').lower() == 'true'
        
        session = request.db.query(ChatSession).filter_by(id=session_id).first()
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        session_data = session.to_dict()
        
        if include_messages:
            messages = request.db.query(Message).filter_by(session_id=session_id).order_by(Message.created_at.asc()).all()
            session_data['messages'] = [msg.to_dict() for msg in messages]
        
        return jsonify({
            'success': True,
            'data': session_data
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== MESSAGE APIS ====================

@app.route('/api/messages', methods=['GET'])
def get_messages():
    try:
        session_id = request.args.get('session_id')
        user_id = request.args.get('user_id')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        
        offset = (page - 1) * limit
        
        query = request.db.query(Message)
        
        if session_id:
            query = query.filter_by(session_id=session_id)
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        total = query.count()
        messages = query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [msg.to_dict() for msg in messages],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/messages', methods=['POST'])
def send_message():
    try:
        data = request.get_json()
        
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        message_text = data.get('message')
        
        if not all([session_id, user_id, message_text]):
            return jsonify({'success': False, 'error': 'session_id, user_id, and message are required'}), 400
        
        # Verify session exists and belongs to user
        session = request.db.query(ChatSession).filter_by(id=session_id, user_id=user_id).first()
        if not session:
            return jsonify({'success': False, 'error': 'Session not found or access denied'}), 404
        
        start_time = time.time()
        
        # Create message
        message = Message(
            session_id=session_id,
            user_id=user_id,
            message=message_text,
            message_type=data.get('message_type', 'text'),
            message_metadata=data.get('metadata', {})
        )
        
        request.db.add(message)
        request.db.commit()
        
        # Generate AI response (placeholder)
        ai_response = generate_ai_response(message_text, data.get('metadata', {}))
        response_time = time.time() - start_time
        
        # Update message with response
        message.response = ai_response['content']
        message.tokens_used = ai_response['tokens_used']
        message.response_time = response_time
        
        # Update session
        session.updated_at = datetime.utcnow()
        
        # Update chat history
        chat_history = request.db.query(ChatHistory).filter_by(session_id=session_id).first()
        if chat_history:
            preview = message_text[:100] + '...' if len(message_text) > 100 else message_text
            chat_history.message_preview = preview
            chat_history.last_activity = datetime.utcnow()
            chat_history.message_count += 1
        
        request.db.commit()
        
        return jsonify({
            'success': True,
            'data': message.to_dict()
        }), 201
        
    except Exception as e:
        request.db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== SYSTEM SETTINGS APIS ====================

@app.route('/api/settings', methods=['GET'])
def get_settings():
    try:
        category = request.args.get('category')
        
        query = request.db.query(SystemSettings)
        if category:
            query = query.filter_by(category=category)
        
        settings = query.order_by(SystemSettings.category, SystemSettings.key).all()
        
        return jsonify({
            'success': True,
            'data': [setting.to_dict() for setting in settings]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/settings/<key>', methods=['GET'])
def get_setting(key):
    try:
        setting = request.db.query(SystemSettings).filter_by(key=key).first()
        if not setting:
            return jsonify({'success': False, 'error': 'Setting not found'}), 404
        
        return jsonify({
            'success': True,
            'data': setting.to_dict()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/settings/<key>', methods=['PUT'])
def update_setting(key):
    try:
        data = request.get_json()
        
        setting = request.db.query(SystemSettings).filter_by(key=key).first()
        if not setting:
            return jsonify({'success': False, 'error': 'Setting not found'}), 404
        
        if 'value' in data:
            setting.value = data['value']
        if 'description' in data:
            setting.description = data['description']
        if 'category' in data:
            setting.category = data['category']
        
        setting.updated_at = datetime.utcnow()
        request.db.commit()
        
        return jsonify({'success': True, 'message': 'Setting updated successfully'})
        
    except Exception as e:
        request.db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== CHATBOT SPECIFIC APIS ====================

@app.route('/api/chat/send', methods=['POST'])
def send_chat_message():
    """Enhanced chat endpoint with advanced AI support"""
    try:
        data = request.get_json()
        
        # Get or create user
        user_email = data.get('user_email', 'default@example.com')
        user = request.db.query(User).filter_by(email=user_email).first()
        
        if not user:
            user = User(
                name=data.get('user_name', 'Anonymous User'),
                email=user_email
            )
            request.db.add(user)
            request.db.commit()
        
        # Get or create session
        session_id = data.get('session_id')
        if session_id:
            session = request.db.query(ChatSession).filter_by(id=session_id, user_id=user.id).first()
        else:
            session = None
        
        if not session:
            session = ChatSession(
                user_id=user.id,
                title=data.get('title', 'New Chat')
            )
            request.db.add(session)
            request.db.commit()
            
            # Create chat history
            chat_history = ChatHistory(
                user_id=user.id,
                session_id=session.id,
                message_preview='New chat started',
                message_count=0
            )
            request.db.add(chat_history)
            request.db.commit()
        
        # Send message
        message_text = data.get('message', '')
        if not message_text:
            return jsonify({'success': False, 'error': 'Message is required'}), 400
        
        start_time = time.time()
        
        # Create user message
        user_message = Message(
            session_id=session.id,
            user_id=user.id,
            message=message_text,
            is_user=True,
            message_type=data.get('message_type', 'text'),
            message_metadata=data.get('metadata', {})
        )
        
        request.db.add(user_message)
        request.db.commit()
        
        # Check if advanced AI mode is enabled
        ai_setting = request.db.query(SystemSettings).filter_by(key='enable_advanced_ai').first()
        use_advanced_ai = ai_setting and ai_setting.value.lower() == 'true'
        
        # Generate AI response
        ai_response = generate_ai_response(message_text, data.get('metadata', {}), use_advanced_ai)
        response_time = time.time() - start_time
        
        # Create AI response message
        ai_message = Message(
            session_id=session.id,
            user_id=user.id,
            message=ai_response['content'],
            is_user=False,
            message_type='text',
            tokens_used=ai_response['tokens_used'],
            response_time=response_time,
            message_metadata={
                'model': ai_response.get('model', 'unknown'),
                'finish_reason': ai_response.get('finish_reason', 'completed'),
                'advanced_ai': use_advanced_ai
            }
        )
        
        request.db.add(ai_message)
        
        # Update session
        session.updated_at = datetime.utcnow()
        
        # Update chat history
        chat_history = request.db.query(ChatHistory).filter_by(session_id=session.id).first()
        if chat_history:
            preview = message_text[:100] + '...' if len(message_text) > 100 else message_text
            chat_history.message_preview = preview
            chat_history.last_activity = datetime.utcnow()
            chat_history.message_count += 2  # User message + AI response
        
        request.db.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'message': {
                    'id': ai_message.id,
                    'message': message_text,
                    'response': ai_response['content'],
                    'tokens_used': ai_response['tokens_used'],
                    'response_time': response_time,
                    'created_at': ai_message.created_at.isoformat()
                },
                'session_id': session.id,
                'user_id': user.id,
                'claude_sonnet_4_enabled': use_advanced_ai
            }
        }), 201
        
    except Exception as e:
        request.db.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== HISTORY APIS ====================

@app.route('/api/history/stats', methods=['GET'])
def get_history_stats():
    """Get history statistics for a user"""
    try:
        user_id = request.args.get('userId', 'anonymous')
        
        # Get total sessions and messages for user
        total_sessions = request.db.query(ChatSession).filter_by(user_id=user_id).count()
        total_messages = request.db.query(Message).join(ChatSession).filter(ChatSession.user_id == user_id).count()
        
        return jsonify({
            'success': True,
            'enabled': True,
            'userId': user_id,
            'stats': {
                'total_sessions': total_sessions,
                'total_messages': total_messages
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'enabled': True}), 500

@app.route('/api/history/sessions', methods=['GET'])
def get_history_sessions():
    """Get chat sessions for a user"""
    try:
        user_id = request.args.get('userId', 'anonymous')
        
        # Get sessions for user
        sessions = request.db.query(ChatSession).filter_by(user_id=user_id).order_by(ChatSession.updated_at.desc()).limit(50).all()
        
        sessions_data = []
        for session in sessions:
            message_count = request.db.query(Message).filter_by(session_id=session.id).count()
            sessions_data.append({
                'id': session.id,
                'session_name': session.title or f'Chat {session.id}',
                'user_id': session.user_id,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat(),
                'is_active': session.status == 'active',
                'message_count': message_count,
                'last_message_at': session.updated_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'sessions': sessions_data,
            'userId': user_id
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'sessions': []}), 500

def generate_ai_response(message, metadata, use_advanced_ai=False):
    """Generate AI response using WebSocket LLM or fallback"""
    
    try:
        # Prepare metadata for LLM
        llm_metadata = {
            'sql_mode': metadata.get('sql_mode', False),
            'advanced_ai': use_advanced_ai,
            'session_context': metadata.get('session_context', {}),
            'user_preferences': metadata.get('user_preferences', {})
        }
        
        # Try to use WebSocket LLM first
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response = loop.run_until_complete(send_to_llm(message, llm_metadata))
            loop.close()
            return response
            
        except Exception as llm_error:
            print(f"LLM WebSocket error: {llm_error}")
            # Fall back to local response
            loop.close()
            return generate_fallback_response(message, llm_metadata)
            
    except Exception as e:
        print(f"Error in generate_ai_response: {e}")
        # Ultimate fallback
        return generate_fallback_response(message, metadata)


# Serve Angular index.html for root
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

# Serve static files and fallback to index.html for unknown routes
@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory(app.static_folder, path)
    except:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3001)
