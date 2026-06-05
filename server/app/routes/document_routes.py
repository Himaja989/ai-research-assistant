from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os
import uuid
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from app.services.document_service import (
    process_document,
    is_video_file,
    is_image_file,
    get_file_type,
)
from app.routes.auth_routes import get_current_user
from app.config import UPLOAD_DIR, MAX_FILE_SIZE_MB, MAX_VIDEO_SIZE_MB, SUBSCRIPTION_PLANS

router = APIRouter()
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan_key = user.get("subscription", "free")
    plan = SUBSCRIPTION_PLANS[plan_key]

    # Read file content and check size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)

    is_video = is_video_file(file.filename)
    is_image = is_image_file(file.filename)

    # Determine max allowed size
    if is_video:
        max_size = plan["max_video_size_mb"]
        if max_size == 0:
            raise HTTPException(
                status_code=403,
                detail="Video upload is not available on the Free plan. Upgrade to Pro.",
            )
    else:
        max_size = plan["max_file_size_mb"]

    if size_mb > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f}MB). Your plan allows up to {max_size}MB.",
        )

    # Save file to disk
    ext = os.path.splitext(file.filename)[1].lower()
    saved_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    # Process text-based documents (extract + index)
    process_result = {"filename": file.filename, "has_content": False, "chunks": 0}
    if not is_video and not is_image and conversation_id:
        process_result = await process_document(file_path, file.filename, conversation_id)

    file_type = get_file_type(file.filename)

    # Persist metadata
    doc_data = {
        "user_id": user_id,
        "conversation_id": conversation_id,
        "original_filename": file.filename,
        "saved_filename": saved_filename,
        "file_path": file_path,
        "file_size_mb": round(size_mb, 2),
        "file_type": file_type,
        "has_content": process_result.get("has_content", False),
        "chunks": process_result.get("chunks", 0),
        "uploaded_at": datetime.utcnow(),
    }
    result = db.documents.insert_one(doc_data)

    return {
        "id": str(result.inserted_id),
        "filename": file.filename,
        "size_mb": round(size_mb, 2),
        "file_type": file_type,
        "indexed": process_result.get("has_content", False),
        "chunks": process_result.get("chunks", 0),
        "url": f"/uploads/{saved_filename}",
        "message": f"{file_type.capitalize()} uploaded and indexed successfully",
    }


@router.get("/documents/{conversation_id}")
def get_documents(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    docs = list(
        db.documents.find(
            {"conversation_id": conversation_id, "user_id": user_id}
        ).sort("uploaded_at", -1)
    )
    for doc in docs:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
        if "uploaded_at" in doc:
            doc["uploaded_at"] = doc["uploaded_at"].isoformat()
    return docs


class GeneratePDFRequest(BaseModel):
    content: str
    filename: Optional[str] = "document"


@router.post("/documents/generate-pdf")
async def generate_pdf(
    request: GeneratePDFRequest,
    user_id: str = Depends(get_current_user),
):
    import re
    import textwrap
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter

    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        saved_filename = f"generated_{uuid.uuid4().hex[:8]}.pdf"
        file_path = os.path.join(UPLOAD_DIR, saved_filename)

        # Clean content
        content = re.sub(r'\n?---\n\*\*Follow-up questions:\*\*[\s\S]*$', '', request.content).strip()
        content = re.sub(r'```[\s\S]*?```', '', content)

        def strip_markdown(t):
            t = re.sub(r'\*\*(.+?)\*\*', r'\1', t)
            t = re.sub(r'\*(.+?)\*', r'\1', t)
            t = re.sub(r'`(.+?)`', r'\1', t)
            return t.strip()

        PAGE_W, PAGE_H = letter
        MARGIN = 72
        MAX_W = PAGE_W - 2 * MARGIN
        c = canvas.Canvas(file_path, pagesize=letter)
        y = PAGE_H - MARGIN

        def new_page():
            nonlocal y
            c.showPage()
            y = PAGE_H - MARGIN

        def draw_line(text, font, size, indent=0, extra_space=0):
            nonlocal y
            c.setFont(font, size)
            line_h = size * 1.4
            # Word-wrap long lines
            chars_per_line = int(MAX_W / (size * 0.55))
            wrapped = textwrap.wrap(text, width=max(chars_per_line, 20)) or ['']
            for wline in wrapped:
                if y < MARGIN + size:
                    new_page()
                    c.setFont(font, size)
                c.drawString(MARGIN + indent, y, wline)
                y -= line_h
            y -= extra_space

        for line in content.split('\n'):
            s = line.strip()
            if not s:
                y -= 6
            elif s.startswith('### '):
                draw_line(strip_markdown(s[4:]), 'Helvetica-Bold', 12, extra_space=2)
            elif s.startswith('## '):
                y -= 4
                draw_line(strip_markdown(s[3:]), 'Helvetica-Bold', 14, extra_space=3)
            elif s.startswith('# '):
                y -= 8
                draw_line(strip_markdown(s[2:]), 'Helvetica-Bold', 18, extra_space=4)
                # underline
                c.setLineWidth(0.5)
                c.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2)
                y -= 4
            elif s.startswith('---'):
                c.setLineWidth(0.3)
                c.line(MARGIN, y, PAGE_W - MARGIN, y)
                y -= 8
            elif re.match(r'^[-*]\s+', s):
                draw_line('-  ' + strip_markdown(re.sub(r'^[-*]\s+', '', s)), 'Helvetica', 10, indent=12)
            elif re.match(r'^\d+\.\s+', s):
                num = re.match(r'^(\d+)\.\s+', s).group(1)
                draw_line(num + '.  ' + strip_markdown(re.sub(r'^\d+\.\s+', '', s)), 'Helvetica', 10, indent=12)
            else:
                draw_line(strip_markdown(s), 'Helvetica', 10)

        c.save()

        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', request.filename or 'document')
        return {"url": f"/uploads/{saved_filename}", "filename": f"{safe_name}.pdf"}

    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{str(e)} | {traceback.format_exc()}")


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    db = get_database()
    doc = db.documents.find_one(
        {"_id": ObjectId(document_id), "user_id": user_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from disk
    if os.path.exists(doc["file_path"]):
        os.remove(doc["file_path"])

    db.documents.delete_one({"_id": ObjectId(document_id)})
    return {"message": "Document deleted successfully"}
