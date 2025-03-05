import uuid
from datetime import datetime
from typing import Dict, Optional, List
from models.auth_schemas import UserDB, UserCreate


# Simple in-memory user database
# In a production app, you would use an actual database like PostgreSQL
class UserDatabase:
    def __init__(self):
        self.users: Dict[str, UserDB] = {}
        self.oauth_lookup: Dict[str, str] = {}  # Maps provider+providerID to user_id
    
    def get_by_email(self, email: str) -> Optional[UserDB]:
        """Get user by email"""
        for user in self.users.values():
            if user.email.lower() == email.lower():
                return user
        return None
    
    def get_by_id(self, user_id: str) -> Optional[UserDB]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def get_by_oauth(self, provider: str, provider_id: str) -> Optional[UserDB]:
        """Get user by OAuth provider and provider ID"""
        key = f"{provider}:{provider_id}"
        user_id = self.oauth_lookup.get(key)
        if user_id:
            return self.get_by_id(user_id)
        return None
    
    def create_user(self, user_data: UserCreate, oauth_provider: str, oauth_provider_id: str) -> UserDB:
        """Create a new user"""
        user_id = str(uuid.uuid4())
        
        new_user = UserDB(
            id=user_id,
            created_at=datetime.now(),
            last_login=datetime.now(),
            oauth_provider=oauth_provider,
            oauth_provider_id=oauth_provider_id,
            **user_data.dict()
        )
        
        # Store the user
        self.users[user_id] = new_user
        
        # Create oauth lookup entry
        key = f"{oauth_provider}:{oauth_provider_id}"
        self.oauth_lookup[key] = user_id
        
        return new_user
    
    def update_last_login(self, user_id: str) -> Optional[UserDB]:
        """Update the last login timestamp"""
        user = self.get_by_id(user_id)
        if user:
            user.last_login = datetime.now()
            self.users[user_id] = user
            return user
        return None
    
    def get_all_users(self) -> List[UserDB]:
        """Get all users"""
        return list(self.users.values())


# Create a singleton instance
user_db = UserDatabase()