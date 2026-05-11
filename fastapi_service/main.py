"""
LITS FastAPI JWT Auth Microservice
Handles: login, token refresh, token verify, user info from token
"""
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional
import jwt
import httpx
import os
from decouple import config

app = FastAPI(
    title="LITS Auth Service",
    description="JWT Authentication microservice for Loan & Installment Tracking System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config("CORS_ALLOWED_ORIGINS", default="http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DJANGO_API = config("DJANGO_API_URL", default="http://localhost:8000")
SECRET_KEY = config("SECRET_KEY", default="supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24       # 1 day
REFRESH_TOKEN_EXPIRE_DAYS = 7

bearer_scheme = HTTPBearer()

# ─── Schemas ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access: str
    refresh: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh: str

class TokenPayload(BaseModel):
    sub: str
    email: str
    role: str
    first_name: str
    last_name: str
    exp: int
    type: str  # "access" | "refresh"

class UserInfo(BaseModel):
    id: str
    email: str
    role: str
    first_name: str
    last_name: str
    full_name: str

# ─── Helpers ──────────────────────────────────────────────────────────────────

def create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    payload = data.copy()
    payload.update({
        "exp": datetime.utcnow() + expires_delta,
        "iat": datetime.utcnow(),
        "type": token_type,
    })
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token.")

async def get_django_user(email: str, password: str) -> dict:
    """Authenticate against Django backend."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{DJANGO_API}/api/v1/auth/jwt/create/",
                json={"email": email, "password": password},
                timeout=10.0,
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Auth backend unavailable.")

    if resp.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Auth backend error.")

    django_tokens = resp.json()

    # Fetch user profile using Django access token
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            f"{DJANGO_API}/api/v1/users/me/",
            headers={"Authorization": f"Bearer {django_tokens['access']}"},
            timeout=10.0,
        )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=500, detail="Could not fetch user profile.")

    return user_resp.json()

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "LITS FastAPI Auth", "time": datetime.utcnow().isoformat()}

@app.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(body: LoginRequest):
    """Login and receive FastAPI-issued JWT tokens."""
    user = await get_django_user(body.email, body.password)

    token_data = {
        "sub": str(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
    }

    access = create_token(token_data, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access")
    refresh = create_token(token_data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")

    return TokenResponse(access=access, refresh=refresh)

@app.post("/auth/refresh", response_model=TokenResponse, tags=["Auth"])
def refresh_token(body: RefreshRequest):
    """Issue new access token from a valid refresh token."""
    payload = decode_token(body.refresh)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Not a refresh token.")

    token_data = {
        "sub": payload["sub"],
        "email": payload["email"],
        "role": payload["role"],
        "first_name": payload["first_name"],
        "last_name": payload["last_name"],
    }
    new_access = create_token(token_data, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES), "access")
    new_refresh = create_token(token_data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")
    return TokenResponse(access=new_access, refresh=new_refresh)

@app.post("/auth/verify", tags=["Auth"])
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """Verify a token and return its payload."""
    payload = decode_token(credentials.credentials)
    return {"valid": True, "payload": payload}

@app.get("/auth/me", response_model=UserInfo, tags=["Auth"])
def get_me(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """Get current user info from token."""
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=400, detail="Not an access token.")
    return UserInfo(
        id=payload["sub"],
        email=payload["email"],
        role=payload["role"],
        first_name=payload["first_name"],
        last_name=payload["last_name"],
        full_name=f"{payload['first_name']} {payload['last_name']}",
    )