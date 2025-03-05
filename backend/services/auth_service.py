from datetime import datetime, timedelta
import json
from typing import Any, Dict, Optional
from jose import jwt, JWTError
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests
import google.auth.exceptions
from fastapi import HTTPException, status

from models.auth_schemas import UserCreate, UserDB, TokenPayload
from config import Settings
from user_db import user_db

# Load settings
settings = Settings()

class AuthError(Exception):
    """Authentication error"""
    pass


async def verify_google_token(token: str) -> Dict[str, Any]:
    """Verify Google ID token and return user info"""
    try:
        # Specify the CLIENT_ID of the app that accesses the backend
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.google_client_id
        )
        
        # Verify the token is valid
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise AuthError('Wrong issuer.')
            
        # Return the user info
        return idinfo
        
    except google.auth.exceptions.GoogleAuthError as e:
        raise AuthError(f"Invalid token: {str(e)}")


async def authenticate_google_user(google_user_info: Dict[str, Any]) -> UserDB:
    """Authenticate or create a user from Google user info"""
    google_id = google_user_info.get('sub')
    email = google_user_info.get('email')
    
    if not google_id or not email:
        raise AuthError("Invalid Google user information")
    
    # Check if user already exists
    user = user_db.get_by_oauth("google", google_id)
    
    if user:
        # Update last login time
        user = user_db.update_last_login(user.id)
        return user
    
    # User doesn't exist, create a new one
    name = google_user_info.get('name', '')
    picture = google_user_info.get('picture', '')
    
    new_user = UserCreate(
        email=email,
        name=name,
        picture=picture
    )
    
    user = user_db.create_user(
        user_data=new_user,
        oauth_provider="google",
        oauth_provider_id=google_id
    )
    
    return user


def create_access_token(user: UserDB) -> str:
    """Create a new JWT access token"""
    # Token expiration time
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    # Create JWT payload
    to_encode = TokenPayload(
        sub=str(user.id),
        exp=int(expire.timestamp()),
        iat=int(datetime.utcnow().timestamp()),
        jti=str(uuid.uuid4()),
        user_data={
            "email": user.email,
            "name": user.name
        }
    ).dict()
    
    # Generate token
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )
    
    return encoded_jwt


def verify_access_token(token: str) -> TokenPayload:
    """Verify and decode a JWT access token"""
    try:
        # Decode and verify the token
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        
        # Create the token payload
        token_data = TokenPayload(**payload)
        
        # Check if token is expired
        if datetime.fromtimestamp(token_data.exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        return token_data
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str) -> UserDB:
    """Get the current user from a JWT token"""
    token_data = verify_access_token(token)
    user = user_db.get_by_id(token_data.sub)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user