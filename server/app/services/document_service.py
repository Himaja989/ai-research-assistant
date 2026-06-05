import os
import uuid
from pypdf import PdfReader
from app.config import UPLOAD_DIR
from app.services.rag_service import chunk_text, append_to_faiss_index

os.makedirs(UPLOAD_DIR, exist_ok=True)

VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv", ".wmv", ".m4v"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".tiff"}
DOCUMENT_EXTENSIONS = {".pdf", ".txt", ".md", ".csv", ".json", ".html", ".xml"}


def is_video_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in VIDEO_EXTENSIONS


def is_image_file(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in IMAGE_EXTENSIONS


def get_file_type(filename: str) -> str:
    if is_video_file(filename):
        return "video"
    if is_image_file(filename):
        return "image"
    return "document"


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF. Tries pdfplumber first, then pypdf, then OCR for image-based PDFs."""
    text = ""

    # 1. Try pdfplumber (best for most PDFs)
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            pages_text = []
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    pages_text.append(f"[Page {i+1}]\n{page_text.strip()}")
            text = "\n\n".join(pages_text)
    except Exception:
        pass

    # 2. Fallback to pypdf
    if not text.strip():
        try:
            reader = PdfReader(file_path)
            pages_text = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    pages_text.append(f"[Page {i+1}]\n{page_text.strip()}")
            text = "\n\n".join(pages_text)
        except Exception:
            pass

    # 3. OCR fallback for image-based / scanned PDFs
    if not text.strip():
        try:
            from PIL import Image
            import pytesseract
            import fitz  # pymupdf — try if installed
            doc = fitz.open(file_path)
            pages_text = []
            for i, page in enumerate(doc):
                pix = page.get_pixmap(dpi=200)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                page_text = pytesseract.image_to_string(img)
                if page_text.strip():
                    pages_text.append(f"[Page {i+1}]\n{page_text.strip()}")
            text = "\n\n".join(pages_text)
        except ImportError:
            # pymupdf not available — use pdf2image + pytesseract
            try:
                from pdf2image import convert_from_path
                import pytesseract
                images = convert_from_path(file_path, dpi=200)
                pages_text = []
                for i, img in enumerate(images):
                    page_text = pytesseract.image_to_string(img)
                    if page_text.strip():
                        pages_text.append(f"[Page {i+1}]\n{page_text.strip()}")
                text = "\n\n".join(pages_text)
            except Exception:
                pass
        except Exception:
            pass

    return text


def extract_text_from_txt(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"


def extract_text_from_csv(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        # Limit CSV text for embedding
        return content[:20000]
    except Exception as e:
        return f"Error reading CSV: {str(e)}"


def extract_text(file_path: str, filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".csv":
        return extract_text_from_csv(file_path)
    elif ext in {".txt", ".md", ".json", ".html", ".xml"}:
        return extract_text_from_txt(file_path)
    return ""


async def process_document(
    file_path: str, filename: str, conversation_id: str
) -> dict:
    """Extract text from document and build/update FAISS index."""
    text = extract_text(file_path, filename)

    if not text.strip():
        return {"filename": filename, "text_length": 0, "chunks": 0, "has_content": False}

    chunks = chunk_text(text)
    await append_to_faiss_index(conversation_id, chunks)

    return {
        "filename": filename,
        "text_length": len(text),
        "chunks": len(chunks),
        "has_content": True,
        "preview": text[:500],
    }


def get_full_document_text(file_path: str, filename: str) -> str:
    """Get full text of a document for summarization."""
    return extract_text(file_path, filename)
