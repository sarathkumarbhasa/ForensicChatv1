import firebase_admin
from firebase_admin import credentials, db
from config import FIREBASE_CREDENTIALS_PATH, FIREBASE_DATABASE_URL
import time

# Initialize Firebase Admin
try:
    if not firebase_admin._apps:
        if FIREBASE_CREDENTIALS_PATH and FIREBASE_DATABASE_URL:
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred, {
                'databaseURL': FIREBASE_DATABASE_URL
            })
except Exception as e:
    print(f"Firebase Admin initialization failed: {e}")

def log_query(session_id: str, query: str, intent: str, response_time_ms: float, success: bool):
    try:
        if not firebase_admin._apps:
            return
            
        ref = db.reference(f'/sessions/{session_id}/queries')
        ref.push({
            'query': query,
            'intent': intent,
            'response_time_ms': response_time_ms,
            'success': success,
            'timestamp': int(time.time() * 1000)
        })
    except Exception as e:
        print(f"Failed to log query: {e}")

def log_session_metadata(session_id: str, metadata: dict):
    try:
        if not firebase_admin._apps:
            return
            
        ref = db.reference(f'/sessions/{session_id}/metadata')
        ref.update(metadata)
    except Exception as e:
        print(f"Failed to log metadata: {e}")
