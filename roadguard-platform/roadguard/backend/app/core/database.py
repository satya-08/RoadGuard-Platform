import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from roadguard.backend.app.core.config import settings

logger = logging.getLogger("roadguard.database")

# Handle database engine parameters dynamically
connect_args = {}
engine_kwargs = {"echo": False}

db_url = settings.DATABASE_URL
# Automatically normalize postgres:// to postgresql:// for SQLAlchemy 2.0+
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        **engine_kwargs
    )
else:
    # PostgreSQL / MySQL connection pooling
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 3600,
        "pool_pre_ping": True,
    })
    engine = create_engine(
        db_url,
        **engine_kwargs
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
