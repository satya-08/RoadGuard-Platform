"""
RoadGuard MongoDB Integration Module
Provides dual-database capability (Relational SQL + MongoDB Atlas M0 / Local MongoDB).
Stores unstructured audit events, detailed AI detection JSON trees, and geospatial telemetry.
Includes graceful fallback if MongoDB is not configured or offline.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

logger = logging.getLogger("roadguard.mongodb")

_client = None
_db = None
_is_connected = False
_connection_attempted = False
_connection_error = None

def get_mongodb():
    global _client, _db, _is_connected, _connection_attempted, _connection_error
    
    from roadguard.backend.app.core.config import settings

    if not settings.MONGODB_ENABLED or not settings.MONGODB_URI:
        _is_connected = False
        _connection_error = "MONGODB_URI is not set in environment or MongoDB is disabled."
        return None

    if _connection_attempted:
        return _db if _is_connected else None

    _connection_attempted = True
    try:
        from pymongo import MongoClient, ASCENDING, DESCENDING, GEOSPHERE
        
        # Connect with 3000ms timeout so offline status doesn't block startup
        client = MongoClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000
        )
        # Test connection
        client.admin.command('ping')
        
        db = client[settings.MONGODB_DB_NAME]
        
        # Initialize schema collections and ensure indexes
        try:
            db.audit_logs.create_index([("created_at", DESCENDING)])
            db.audit_logs.create_index([("action", ASCENDING)])
            db.audit_logs.create_index([("entity_id", ASCENDING)])
            
            db.complaint_documents.create_index([("reference_no", ASCENDING)], unique=False)
            db.complaint_documents.create_index([("location", GEOSPHERE)])
            db.complaint_documents.create_index([("created_at", DESCENDING)])
            
            db.ai_inspections.create_index([("complaint_id", ASCENDING)])
            db.ai_inspections.create_index([("created_at", DESCENDING)])
        except Exception as idx_err:
            logger.warning(f"Index creation note: {idx_err}")

        _client = client
        _db = db
        _is_connected = True
        logger.info(f"Connected successfully to MongoDB: {settings.MONGODB_DB_NAME}")
        return _db
    except Exception as e:
        _is_connected = False
        _connection_error = str(e)
        logger.warning(f"MongoDB not reachable ({str(e)}). Running in Relational-only fallback mode.")
        return None

def log_mongo_audit(
    action: str,
    entity_type: str,
    entity_id: Optional[str],
    user_email: Optional[str] = None,
    user_id: Optional[str] = None,
    details: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Persists audit event document into MongoDB audit_logs collection.
    Non-blocking / failsafe.
    """
    db = get_mongodb()
    if db is None:
        return False
    try:
        doc = {
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "user_email": user_email,
            "user_id": user_id,
            "details": details,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        db.audit_logs.insert_one(doc)
        return True
    except Exception as e:
        logger.warning(f"Failed to write audit document to MongoDB: {e}")
        return False

def log_mongo_complaint(complaint_data: Dict[str, Any]) -> bool:
    """
    Stores full complaint document with GeoJSON Point into MongoDB.
    """
    db = get_mongodb()
    if db is None:
        return False
    try:
        lat = complaint_data.get("latitude")
        lon = complaint_data.get("longitude")
        doc = {
            **complaint_data,
            "location": {
                "type": "Point",
                "coordinates": [lon, lat]
            } if lat is not None and lon is not None else None,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }
        db.complaint_documents.insert_one(doc)
        return True
    except Exception as e:
        logger.warning(f"Failed to log complaint document to MongoDB: {e}")
        return False

def log_mongo_ai_inspection(inspection_data: Dict[str, Any]) -> bool:
    """
    Stores AI inference perception tree and XAI saliency metadata into MongoDB.
    """
    db = get_mongodb()
    if db is None:
        return False
    try:
        doc = {
            **inspection_data,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }
        db.ai_inspections.insert_one(doc)
        return True
    except Exception as e:
        logger.warning(f"Failed to write AI inspection to MongoDB: {e}")
        return False

def get_mongodb_status() -> Dict[str, Any]:
    """
    Returns diagnostic connectivity status for Admin Dashboard.
    """
    from roadguard.backend.app.core.config import settings
    db = get_mongodb()
    return {
        "enabled": settings.MONGODB_ENABLED,
        "connected": _is_connected,
        "database_name": settings.MONGODB_DB_NAME if _is_connected else None,
        "uri_configured": bool(settings.MONGODB_URI),
        "status": "Online (Atlas / Local M0)" if _is_connected else "Relational-Only Fallback Mode",
        "error_message": _connection_error if not _is_connected else None
    }
