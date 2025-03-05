from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime


class UserBase(BaseModel):
    """Base user information shared across models"""
    email: EmailStr
    name: Optional[str] = None
    picture: Optional[str] = None


class UserCreate(UserBase):
    """Model for creating a new user"""
    pass


class UserDB(UserBase):
    """User model as stored in the database"""
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None
    oauth_provider: str = "google"
    oauth_provider_id: str
    # Additional user fields
    is_active: bool = True
    is_verified: bool = False


class UserOut(UserBase):
    """User information sent to the client"""
    id: str
    is_active: bool
    

class GoogleAuthRequest(BaseModel):
    """Google authentication request with authorization code"""
    code: str
    redirect_uri: str


class AuthResponse(BaseModel):
    """Authentication response with tokens"""
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str  # subject (user id)
    exp: int  # expiration time
    iat: Optional[int] = None  # issued at
    jti: Optional[str] = None  # JWT ID
    user_data: Dict[str, Any] = {}


class TokenData(BaseModel):
    """Data extracted from valid token"""
    user_id: str