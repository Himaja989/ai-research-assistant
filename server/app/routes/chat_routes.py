from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from datetime import datetime, date
from bson import ObjectId
from typing import Optional
import json
import base64
import os
from app.database import get_database
from app.services.ai_service import (
    stream_ai_response,
    generate_conversation_title,
    summarize_document,
)
from app.services.rag_service import search_documents, get_all_chunks as _get_all_chunks
from app.services.document_service import get_full_document_text
from app.routes.auth_routes import get_current_user
from app.config import SUBSCRIPTION_PLANS

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None


class SummarizeRequest(BaseModel):
    conversation_id: str


# ── Streaming chat ────────────────────────────────────────────────────────────

@router.post("/chat/stream")
async def stream_chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan_key = user.get("subscription", "free")
    plan = SUBSCRIPTION_PLANS[plan_key]
    today = date.today().isoformat()

    # Reset daily count if new day
    if user.get("last_message_date") != today:
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"messages_today": 0, "last_message_date": today}},
        )
        user["messages_today"] = 0

    # Enforce message limit
    if (
        plan["messages_per_day"] != -1
        and user.get("messages_today", 0) >= plan["messages_per_day"]
    ):
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit of {plan['messages_per_day']} messages reached. Upgrade your plan.",
        )

    # Build conversation history
    conversation_history = []
    conversation_id = request.conversation_id

    if conversation_id:
        chats = list(
            db.chats.find({"conversation_id": conversation_id})
            .sort("created_at", 1)
            .limit(10)
        )
        for chat in chats:
            conversation_history.append({"role": "user", "content": chat["question"]})
            conversation_history.append({"role": "assistant", "content": chat["answer"]})

    # Always fetch documents in this conversation so AI knows what's uploaded
    doc_names = []
    full_doc_context = ""
    if conversation_id:
        docs_in_conv = list(db.documents.find({"conversation_id": conversation_id, "user_id": user_id}))
        doc_names = [d["original_filename"] for d in docs_in_conv]

    # RAG: search uploaded documents for relevant chunks
    rag_context = ""
    if conversation_id and doc_names:
        rag_context = await search_documents(conversation_id, request.question)

    # Build context: always tell AI about uploaded docs + inject relevant chunks
    context = ""
    if doc_names:
        context = f"Documents in this conversation: {', '.join(doc_names)}\n\n"
        if rag_context:
            context += f"Relevant content:\n{rag_context[:3000]}"
        else:
            # Fallback: get all chunks, limit to 3000 chars to stay within TPM
            all_chunks = _get_all_chunks(conversation_id)
            if all_chunks:
                context += f"Document content:\n{' '.join(all_chunks)[:3000]}"

    async def generate():
        full_response = ""
        final_conv_id = conversation_id

        try:
            async for chunk in stream_ai_response(
                request.question, context, conversation_history
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Persist chat
            chat_data = {
                "user_id": user_id,
                "conversation_id": final_conv_id,
                "question": request.question,
                "answer": full_response,
                "has_context": bool(context),
                "created_at": datetime.utcnow(),
            }
            chat_result = db.chats.insert_one(chat_data)

            # Increment usage
            db.users.update_one(
                {"_id": ObjectId(user_id)}, {"$inc": {"messages_today": 1}}
            )

            # Auto-create conversation if none provided
            if not final_conv_id:
                title = await generate_conversation_title(request.question)
                conv_result = db.conversations.insert_one(
                    {
                        "user_id": user_id,
                        "title": title,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow(),
                    }
                )
                final_conv_id = str(conv_result.inserted_id)
                db.chats.update_one(
                    {"_id": chat_result.inserted_id},
                    {"$set": {"conversation_id": final_conv_id}},
                )
            else:
                db.conversations.update_one(
                    {"_id": ObjectId(final_conv_id)},
                    {"$set": {"updated_at": datetime.utcnow()}},
                )

            yield f"data: {json.dumps({'type': 'done', 'chat_id': str(chat_result.inserted_id), 'conversation_id': final_conv_id})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Summarize documents in a conversation ────────────────────────────────────

@router.post("/chat/summarize")
async def summarize_conversation_docs(
    request: SummarizeRequest,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    docs = list(
        db.documents.find(
            {"conversation_id": request.conversation_id, "user_id": user_id}
        ).sort("uploaded_at", -1)  # most recent first
    )
    if not docs:
        raise HTTPException(status_code=404, detail="No documents found in this conversation")

    # Pick the most recently uploaded text-based document (skip images/videos)
    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".mp4", ".mov", ".avi", ".mkv", ".webm"}
    doc = None
    for d in docs:
        ext = os.path.splitext(d["original_filename"])[1].lower()
        if ext not in IMAGE_EXTS:
            doc = d
            break

    if not doc:
        raise HTTPException(status_code=404, detail="No text documents found in this conversation")

    text = get_full_document_text(doc["file_path"], doc["original_filename"])

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from this document.")

    async def generate():
        async for chunk in summarize_document(text):
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Get chats by conversation ─────────────────────────────────────────────────

@router.get("/chats/{conversation_id}")
def get_chats_by_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    chats = list(
        db.chats.find({"conversation_id": conversation_id}).sort("created_at", 1)
    )
    for chat in chats:
        chat["id"] = str(chat["_id"])
        del chat["_id"]
        if "created_at" in chat:
            chat["created_at"] = chat["created_at"].isoformat()
    return chats


# ── Vision (image analysis) ───────────────────────────────────────────────────

class VisionRequest(BaseModel):
    image_base64: str
    question: Optional[str] = "Describe what you see in this image in detail."
    conversation_id: Optional[str] = None

@router.post("/chat/vision")
async def vision_chat(
    request: VisionRequest,
    user_id: str = Depends(get_current_user),
):
    from app.config import GROQ_API_KEY
    from groq import AsyncGroq

    client = AsyncGroq(api_key=GROQ_API_KEY)

    # image_base64 is like "data:image/jpeg;base64,/9j/..."
    image_url = request.image_base64  # already a data URL from frontend

    VISION_MODELS = [
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "llama-3.2-11b-vision-preview",
    ]

    async def generate():
        full_response = ""
        last_error = ""
        for model in VISION_MODELS:
            try:
                stream = await client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": image_url}},
                                {"type": "text", "text": request.question},
                            ],
                        }
                    ],
                    stream=True,
                    max_tokens=1500,
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        full_response += delta.content
                        yield f"data: {json.dumps({'type': 'chunk', 'content': delta.content})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
                return
            except Exception as e:
                last_error = str(e)
                continue
        yield f"data: {json.dumps({'type': 'error', 'message': f'Vision failed: {last_error}'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Search chats ──────────────────────────────────────────────────────────────

@router.get("/chats/search/{query}")
def search_chats(query: str, user_id: str = Depends(get_current_user)):
    db = get_database()
    results = list(
        db.chats.find(
            {
                "user_id": user_id,
                "$or": [
                    {"question": {"$regex": query, "$options": "i"}},
                    {"answer": {"$regex": query, "$options": "i"}},
                ],
            }
        ).limit(20)
    )
    for r in results:
        r["id"] = str(r["_id"])
        del r["_id"]
        if "created_at" in r:
            r["created_at"] = r["created_at"].isoformat()
    return results
