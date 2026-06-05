import numpy as np
import faiss
import pickle
import os
from typing import List
from app.config import UPLOAD_DIR

FAISS_INDEX_DIR = os.path.join(UPLOAD_DIR, "faiss_indexes")
os.makedirs(FAISS_INDEX_DIR, exist_ok=True)

# Lazy-load sentence-transformers (free, runs locally, no API key needed)
_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 80) -> List[str]:
    """Split text into overlapping chunks for better retrieval."""
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


def get_embeddings(texts: List[str]) -> np.ndarray:
    """Get embeddings using local sentence-transformers model (free, no API)."""
    model = get_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.array(embeddings, dtype=np.float32)


async def build_faiss_index(conversation_id: str, chunks: List[str]) -> None:
    """Build and persist a FAISS index for a conversation's documents."""
    if not chunks:
        return

    embeddings = get_embeddings(chunks)
    dimension = embeddings.shape[1]

    index = faiss.IndexFlatIP(dimension)  # Inner product = cosine similarity (after normalize)
    index.add(embeddings)

    index_path = os.path.join(FAISS_INDEX_DIR, f"{conversation_id}.index")
    chunks_path = os.path.join(FAISS_INDEX_DIR, f"{conversation_id}.chunks")

    faiss.write_index(index, index_path)
    with open(chunks_path, "wb") as f:
        pickle.dump(chunks, f)


async def append_to_faiss_index(conversation_id: str, new_chunks: List[str]) -> None:
    """Append new chunks to an existing FAISS index."""
    chunks_path = os.path.join(FAISS_INDEX_DIR, f"{conversation_id}.chunks")

    if os.path.exists(chunks_path):
        with open(chunks_path, "rb") as f:
            existing_chunks = pickle.load(f)
        all_chunks = existing_chunks + new_chunks
    else:
        all_chunks = new_chunks

    await build_faiss_index(conversation_id, all_chunks)


async def search_documents(
    conversation_id: str, query: str, top_k: int = 6
) -> str:
    """Search the FAISS index and return relevant context."""
    index_path = os.path.join(FAISS_INDEX_DIR, f"{conversation_id}.index")
    chunks_path = os.path.join(FAISS_INDEX_DIR, f"{conversation_id}.chunks")

    if not os.path.exists(index_path):
        return ""

    with open(chunks_path, "rb") as f:
        chunks = pickle.load(f)

    if not chunks:
        return ""

    index = faiss.read_index(index_path)
    query_embedding = get_embeddings([query])

    k = min(top_k, len(chunks))
    scores, indices = index.search(query_embedding, k)

    relevant_chunks = [
        chunks[idx]
        for score, idx in zip(scores[0], indices[0])
        if score > 0.3 and idx < len(chunks)
    ]

    return "\n\n---\n\n".join(relevant_chunks)


def get_all_chunks(conversation_id: str) -> List[str]:
    chunks_path = os.path.join(FAISS_INDEX_DIR, f"{conversation_id}.chunks")
    if not os.path.exists(chunks_path):
        return []
    with open(chunks_path, "rb") as f:
        return pickle.load(f)
