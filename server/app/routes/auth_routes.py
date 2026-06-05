from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId
import jwt
import bcrypt
from app.database import get_database
from app.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_HOURS

router = APIRouter()
security = HTTPBearer(auto_error=False)


# ── Pydantic models ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Auth helpers ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired, please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def format_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "subscription": user.get("subscription", "free"),
        "created_at": user.get("created_at"),
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register")
def register(request: RegisterRequest):
    db = get_database()

    if db.users.find_one({"email": request.email.lower().strip()}):
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = {
        "name": request.name.strip(),
        "email": request.email.lower().strip(),
        "password": hash_password(request.password),
        "subscription": "free",
        "messages_today": 0,
        "last_message_date": None,
        "documents_this_month": 0,
        "last_document_reset": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }

    result = db.users.insert_one(user)
    token = create_token(str(result.inserted_id))
    user["_id"] = result.inserted_id

    return {"token": token, "user": format_user(user)}


@router.post("/login")
def login(request: LoginRequest):
    db = get_database()

    user = db.users.find_one({"email": request.email.lower().strip()})
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(str(user["_id"]))
    return {"token": token, "user": format_user(user)}


@router.get("/me")
def get_me(user_id: str = Depends(get_current_user)):
    db = get_database()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return format_user(user)


@router.put("/me")
def update_profile(
    request: dict,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    allowed = {}
    if "name" in request:
        allowed["name"] = request["name"].strip()
    if not allowed:
        raise HTTPException(status_code=400, detail="Nothing to update")

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": allowed})
    user = db.users.find_one({"_id": ObjectId(user_id)})
    return format_user(user)
