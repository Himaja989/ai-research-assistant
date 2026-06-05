from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from app.routes.auth_routes import get_current_user

router = APIRouter()


class ConversationRequest(BaseModel):
    title: str


def serialize(conv: dict) -> dict:
    conv["id"] = str(conv["_id"])
    del conv["_id"]
    if "created_at" in conv and hasattr(conv["created_at"], "isoformat"):
        conv["created_at"] = conv["created_at"].isoformat()
    if "updated_at" in conv and hasattr(conv["updated_at"], "isoformat"):
        conv["updated_at"] = conv["updated_at"].isoformat()
    return conv


@router.post("/conversations")
def create_conversation(
    request: ConversationRequest,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    now = datetime.utcnow()
    conversation = {
        "user_id": user_id,
        "title": request.title,
        "created_at": now,
        "updated_at": now,
    }
    result = db.conversations.insert_one(conversation)
    conversation["_id"] = result.inserted_id
    return serialize(conversation)


@router.get("/conversations")
def get_conversations(user_id: str = Depends(get_current_user)):
    db = get_database()
    conversations = list(
        db.conversations.find({"user_id": user_id}).sort("updated_at", -1)
    )
    return [serialize(c) for c in conversations]


@router.get("/conversations/search")
def search_conversations(q: str, user_id: str = Depends(get_current_user)):
    db = get_database()
    conversations = list(
        db.conversations.find(
            {
                "user_id": user_id,
                "title": {"$regex": q, "$options": "i"},
            }
        ).sort("updated_at", -1)
    )
    return [serialize(c) for c in conversations]


@router.put("/conversations/{conversation_id}")
def rename_conversation(
    conversation_id: str,
    request: ConversationRequest,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    result = db.conversations.update_one(
        {"_id": ObjectId(conversation_id), "user_id": user_id},
        {"$set": {"title": request.title, "updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation renamed successfully"}


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    result = db.conversations.delete_one(
        {"_id": ObjectId(conversation_id), "user_id": user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Cascade delete chats in this conversation
    db.chats.delete_many({"conversation_id": conversation_id})
    db.documents.delete_many({"conversation_id": conversation_id})

    return {"message": "Conversation deleted successfully"}
