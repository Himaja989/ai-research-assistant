from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.config import APP_NAME, APP_VERSION
from app.database import connect_to_mongo
from app.routes.test_routes import router as test_router
from app.routes.chat_routes import router as chat_router
from app.routes.conversation_routes import router as conversation_router
from app.routes.auth_routes import router as auth_router
from app.routes.document_routes import router as document_router
from app.routes.subscription_routes import router as subscription_router
from app.routes.image_routes import router as image_router

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI Research Assistant API - Perplexity-style research tool"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
uploads_dir = os.path.join(os.path.dirname(__file__), "app", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(test_router)
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(conversation_router, prefix="/api", tags=["conversations"])
app.include_router(document_router, prefix="/api", tags=["documents"])
app.include_router(subscription_router, prefix="/api", tags=["subscription"])
app.include_router(image_router, prefix="/api", tags=["images"])


@app.get("/")
def home():
    return {"message": f"{APP_NAME} backend is running", "version": APP_VERSION}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup_event():
    connect_to_mongo()
