from pymongo import MongoClient
from app.config import MONGO_URI

client = None
database = None

def connect_to_mongo():
    global client, database

    if not MONGO_URI:
        raise ValueError("MONGO_URI is missing in .env file")

    client = MongoClient(MONGO_URI)
    database = client["ai_research_assistant"]

    print("Connected to MongoDB")

def get_database():
    if database is None:
        raise ValueError("Database is not connected")
    return database