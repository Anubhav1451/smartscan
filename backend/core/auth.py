import logging
from typing import Optional, List
import jwt
from jwt import PyJWKClient, PyJWTError
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from core.config import settings
from core.db import get_supabase

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# JWKS client for asymmetric ECC keys (Supabase Auth default for ES256)
jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)

class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "customer"
    store_id: Optional[str] = None
    display_name: str = "Customer"

def verify_token(token: str) -> dict:
    """
    Verifies Supabase JWT token:
    1. First tries JWKS asymmetric ECC verification (ES256).
    2. Falls back to legacy HS256 secret (SUPABASE_JWT_SECRET).
    """
    # Try JWKS verification first
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "HS256"],
            audience="authenticated"
        )
        return payload
    except Exception as e_jwks:
        # Fallback to legacy HS256 secret
        if settings.SUPABASE_JWT_SECRET:
            try:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated"
                )
                return payload
            except Exception as e_hs:
                logger.warning(f"JWT HS256 fallback verification failed: {e_hs}")
        
        logger.error(f"JWT verification failed: {e_jwks}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Invalid or expired authentication token", "code": "INVALID_TOKEN"},
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> UserProfile:
    """
    FastAPI dependency to verify JWT and load caller's profile server-side.
    Never trusts role or store_id sent by the client.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Authentication required", "code": "AUTH_REQUIRED"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = verify_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "Malformed token: sub claim missing", "code": "INVALID_TOKEN"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    sb = get_supabase()
    # Query profiles table server-side
    res = sb.table("profiles").select("id, role, store_id, display_name").eq("id", user_id).execute()
    
    if res.data and len(res.data) > 0:
        row = res.data[0]
        return UserProfile(
            id=row["id"],
            email=payload.get("email"),
            role=row.get("role", "customer"),
            store_id=row.get("store_id"),
            display_name=row.get("display_name") or payload.get("email", "Customer")
        )
    
    # If no profile row yet, create default customer profile
    email = payload.get("email", "")
    display_name = payload.get("user_metadata", {}).get("display_name") or email.split("@")[0].capitalize() or "Customer"
    insert_res = sb.table("profiles").insert({
        "id": user_id,
        "role": "customer",
        "store_id": None,
        "display_name": display_name
    }).execute()
    
    return UserProfile(
        id=user_id,
        email=email,
        role="customer",
        store_id=None,
        display_name=display_name
    )

def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[UserProfile]:
    """Optional user dependency for public routes that can benefit from user context."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials)
    except Exception:
        return None

def require_staff_or_manager(user: UserProfile = Depends(get_current_user)) -> UserProfile:
    """Enforces caller role is exit_staff or manager with assigned store."""
    if user.role not in ("exit_staff", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Access forbidden: staff or manager role required", "code": "FORBIDDEN"}
        )
    if not user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "Staff profile must be assigned to a store", "code": "NO_STORE_ASSIGNED"}
        )
    return user
