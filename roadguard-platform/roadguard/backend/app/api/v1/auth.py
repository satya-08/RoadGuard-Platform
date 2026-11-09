from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from roadguard.backend.app.core.database import get_db
from roadguard.backend.app.core.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token
)
from roadguard.backend.app.models.entities import User
from roadguard.backend.app.models.enums import UserRole
from roadguard.backend.app.schemas.auth import (
    UserCreate, UserLogin, UserResponse, Token, PasswordChange
)
from roadguard.backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

DEMO_ACCOUNTS = [
    {
        "email": "citizen@roadguard.org",
        "full_name": "Ravi Kumar (Citizen)",
        "phone": "+91 98480 12345",
        "role": UserRole.CITIZEN.value,
        "department": "Civilian Resident - Ward 5"
    },
    {
        "email": "inspector@roadguard.org",
        "full_name": "P. Suresh (Field Survey Inspector)",
        "phone": "+91 98480 23456",
        "role": UserRole.FIELD_INSPECTOR.value,
        "department": "Infrastructure Quality Inspection Division"
    },
    {
        "email": "municipal@roadguard.org",
        "full_name": "K. Lakshmi (Municipal Engineering Officer)",
        "phone": "+91 98480 34567",
        "role": UserRole.MUNICIPAL_AUTHORITY.value,
        "department": "Tadepalligudem Municipal Corporation"
    },
    {
        "email": "pwd@roadguard.org",
        "full_name": "M. Ramesh (Executive Engineer, R&B)",
        "phone": "+91 98480 45678",
        "role": UserRole.STATE_HIGHWAY_AUTHORITY.value,
        "department": "Andhra Pradesh State PWD (Roads & Buildings)"
    },
    {
        "email": "nhai@roadguard.org",
        "full_name": "Dr. Ananya Sharma (Project Director, NHAI)",
        "phone": "+91 98480 56789",
        "role": UserRole.NHAI_AUTHORITY.value,
        "department": "National Highways Authority of India (PIU Rajahmundry)"
    },
    {
        "email": "contractor@roadguard.org",
        "full_name": "V. Prasad (Chief Maintenance Contractor)",
        "phone": "+91 98480 67890",
        "role": UserRole.MAINTENANCE_CONTRACTOR.value,
        "department": "Sri Sai Pavement Works & Asphalt Contractors"
    },
    {
        "email": "admin@roadguard.org",
        "full_name": "System Administrator",
        "phone": "+91 98480 99999",
        "role": UserRole.ADMIN.value,
        "department": "Central RoadGuard Administration"
    }
]

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        full_name=user_in.full_name,
        phone=user_in.phone,
        role=user_in.role.value if hasattr(user_in.role, 'value') else str(user_in.role),
        department=user_in.department,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login_user(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact an administrator."
        )
        
    access_token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully."}

@router.post("/seed-demo-users")
def seed_demo_users(db: Session = Depends(get_db)):
    """
    Development-only mechanism to provision demonstrator accounts across all organizational roles.
    Default demo password for all accounts: 'roadguard2026'
    """
    default_pwd = get_password_hash("roadguard2026")
    created_count = 0
    updated_count = 0
    
    for acct in DEMO_ACCOUNTS:
        user = db.query(User).filter(User.email == acct["email"]).first()
        if not user:
            user = User(
                email=acct["email"],
                hashed_password=default_pwd,
                full_name=acct["full_name"],
                phone=acct["phone"],
                role=acct["role"],
                department=acct["department"],
                is_active=True
            )
            db.add(user)
            created_count += 1
        else:
            user.full_name = acct["full_name"]
            user.role = acct["role"]
            user.department = acct["department"]
            user.hashed_password = default_pwd
            updated_count += 1
            
    db.commit()
    return {
        "message": f"Demo accounts synchronized. Created: {created_count}, Updated: {updated_count}",
        "default_password": "roadguard2026",
        "accounts": [a["email"] for a in DEMO_ACCOUNTS]
    }
