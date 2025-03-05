from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import Optional

from models.auth_schemas import UserDB
from services.auth_service import get_current_user

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

async def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[UserDB]:
    """Get the current user if authenticated, return None otherwise"""
    if not token:
        return None
        
    try:
        return get_current_user(token)
    except HTTPException:
        return None


async def get_current_active_user(current_user: UserDB = Depends(get_current_user)) -> UserDB:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user