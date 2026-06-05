import os
from dotenv import load_dotenv

load_dotenv()

APP_NAME = "AI Research Assistant"
APP_VERSION = "1.0.0"

MONGO_URI = os.getenv("MONGO_URI")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "ai-research-assistant-super-secret-jwt-2024-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
MAX_FILE_SIZE_MB = 50
MAX_VIDEO_SIZE_MB = 100

SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Free",
        "price": 0,
        "messages_per_day": -1,
        "documents_per_month": 5,
        "max_file_size_mb": 10,
        "max_video_size_mb": 0,
        "features": [
            "20 messages per day",
            "5 documents per month",
            "Up to 10MB file size",
            "Basic chat interface",
            "Conversation history",
        ],
    },
    "pro": {
        "name": "Pro",
        "price": 19,
        "messages_per_day": 500,
        "documents_per_month": 100,
        "max_file_size_mb": 50,
        "max_video_size_mb": 100,
        "features": [
            "500 messages per day",
            "100 documents per month",
            "Up to 50MB files / 100MB videos",
            "Voice input",
            "Priority AI responses",
            "Advanced RAG search",
            "Citation cards",
        ],
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 99,
        "messages_per_day": -1,
        "documents_per_month": -1,
        "max_file_size_mb": 500,
        "max_video_size_mb": 500,
        "features": [
            "Unlimited messages",
            "Unlimited documents",
            "Up to 500MB files & videos",
            "API access",
            "Custom AI models",
            "Team workspace",
            "Dedicated support",
            "Analytics dashboard",
        ],
    },
}
