import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import jwt

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserRegister, UserLogin, UserResponse
from app.schemas.token import TokenResponse, TokenRefresh, AccessTokenResponse

router = APIRouter()


@router.get(
    "/",
    summary="Authentication service status",
)
def auth_status():
    """Return status and active authentication endpoints."""
    return {
        "status": "ready",
        "service": "authentication",
        "endpoints": ["/register", "/login", "/me", "/refresh"],
    }



@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new business user",
)
def register(
    user_in: UserRegister,
    db: Annotated[Session, Depends(get_db)],
):
    """Register a new user, hash password with Argon2, and issue authentication tokens."""
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Hash password securely
    hashed_pwd = get_password_hash(user_in.password)

    user = User(
        email=user_in.email.lower(),
        hashed_password=hashed_pwd,
        full_name=user_in.full_name.strip(),
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate JWT tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and obtain JWT tokens",
)
def login(
    login_data: UserLogin,
    db: Annotated[Session, Depends(get_db)],
):
    """Verify user credentials and return access and refresh tokens."""
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return identity and status of the current authenticated user."""
    return current_user


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Obtain a new access token using a refresh token",
)
def refresh_token(
    refresh_data: TokenRefresh,
    db: Annotated[Session, Depends(get_db)],
):
    """Validate refresh token and issue a fresh access token."""
    invalid_token_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(refresh_data.refresh_token)
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id_str is None or token_type != "refresh":
            raise invalid_token_exception

        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise invalid_token_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise invalid_token_exception

    new_access_token = create_access_token(subject=user.id)
    return AccessTokenResponse(
        access_token=new_access_token,
        token_type="bearer",
    )
