from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2AuthorizationCodeBearer
from fastapi.responses import RedirectResponse
import requests
import json
from typing import Dict, Any, Optional

from models.auth_schemas import GoogleAuthRequest, AuthResponse, UserOut
from services.auth_service import authenticate_google_user, create_access_token, get_current_user, AuthError, verify_google_token
from user_db import user_db
from config import Settings

# Load settings
settings = Settings()

# Auth router
router = APIRouter(
    prefix="/api/auth",
    tags=["authentication"],
    responses={401: {"description": "Unauthorized"}},
)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@router.get("/google/url")
async def get_google_auth_url():
    """Generate the Google OAuth URL for frontend redirection"""
    auth_url = f"https://accounts.google.com/o/oauth2/auth" \
               f"?client_id={settings.google_client_id}" \
               f"&redirect_uri={settings.google_redirect_uri}" \
               f"&response_type=code" \
               f"&scope=email%20profile" \
               f"&access_type=offline"
    
    return {"auth_url": auth_url}


@router.post("/google/callback", response_model=AuthResponse)
async def google_callback(auth_request: GoogleAuthRequest):
    """Handle Google OAuth callback with authorization code"""
    try:
        # Exchange code for token
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": auth_request.code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": auth_request.redirect_uri,
            "grant_type": "authorization_code"
        }
        
        token_response = requests.post(token_url, data=data)
        token_data = token_response.json()
        
        if "error" in token_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google OAuth error: {token_data.get('error_description', token_data.get('error'))}"
            )
        
        # Get user info with ID token
        id_token = token_data.get("id_token")
        if not id_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No ID token in Google response"
            )
        
        # Verify token and get user information
        user_info = await verify_google_token(id_token)
        
        # Authenticate or create the user
        user = await authenticate_google_user(user_info)
        
        # Create access token
        access_token = create_access_token(user)
        
        # Create user out model
        user_out = UserOut(
            id=user.id,
            email=user.email,
            name=user.name,
            picture=user.picture,
            is_active=user.is_active
        )
        
        # Return authentication response
        return AuthResponse(
            access_token=access_token,
            user=user_out
        )
        
    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


@router.get("/me", response_model=UserOut)
async def get_current_user_info(token: str = Depends(oauth2_scheme)):
    """Get current user information"""
    user = get_current_user(token)
    
    return UserOut(
        id=user.id,
        email=user.email,
        name=user.name,
        picture=user.picture,
        is_active=user.is_active
    )


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    """Log out the current user"""
    # In a stateless JWT system, we don't revoke tokens server-side
    # We rely on the client to remove the token
    
    return {"message": "Successfully logged out"}