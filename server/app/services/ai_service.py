from groq import AsyncGroq
from typing import AsyncGenerator, List
from app.config import GROQ_API_KEY

client = AsyncGroq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """You are an expert AI Research Assistant with full document generation capabilities.

Rules:
1. Answer the question directly and thoroughly using Markdown formatting
2. Use bullet points, bold text, and code blocks where it helps clarity
3. Do NOT use section headers like "Answer", "Summary", "Key Takeaways", or "Sources"
4. When the user uploads a document (resume, PDF, report), you have full access to its content via the context provided. NEVER say "I didn't receive any file" or "I can't access files." The file content is injected into your context — use it.
5. When asked to create, update, send, or generate a document/PDF/resume: write the COMPLETE, FULL content in clean Markdown. Do NOT truncate, abbreviate, or write "... (rest of content)" or "You can save this as a PDF". Write every single section in full. Do NOT output raw PDF bytes or PDF syntax. The system will automatically convert your Markdown response into a real downloadable PDF.
6. At the very end, always add exactly 3 short follow-up questions like this:

---
**Follow-up questions:**
1. [Question 1]
2. [Question 2]
3. [Question 3]

That's the only label allowed. Everything else should be plain, clean response."""


CHAT_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "gemma-7b-it",
]

async def stream_ai_response(
    question: str,
    context: str = "",
    conversation_history: List[dict] = [],
) -> AsyncGenerator[str, None]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in conversation_history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    if context:
        user_message = (
            f"**Relevant context from uploaded documents:**\n\n{context}\n\n"
            f"---\n\n**Question:** {question}"
        )
    else:
        user_message = question

    messages.append({"role": "user", "content": user_message})

    last_error = None
    for model in CHAT_MODELS:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=2000,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
            return
        except Exception as e:
            last_error = e
            # Only retry on rate-limit / server errors
            err_str = str(e).lower()
            if any(code in err_str for code in ["429", "503", "decommissioned", "not found"]):
                continue
            raise

    raise last_error


async def generate_conversation_title(question: str) -> str:
    for model in CHAT_MODELS:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "Generate a short title (max 6 words) for a conversation. Return ONLY the title, nothing else.",
                    },
                    {"role": "user", "content": question},
                ],
                max_tokens=20,
                temperature=0.5,
            )
            return response.choices[0].message.content.strip().strip('"')
        except Exception:
            continue
    return question[:40] + ("..." if len(question) > 40 else "")


async def summarize_document(text: str) -> AsyncGenerator[str, None]:
    for model in CHAT_MODELS:
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a document summarization expert. Provide a clear, structured summary with key points, main themes, and important details. Use Markdown formatting.",
                    },
                    {
                        "role": "user",
                        "content": f"Please summarize the following document:\n\n{text[:8000]}",
                    },
                ],
                stream=True,
                temperature=0.5,
                max_tokens=1500,
            )
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
            return
        except Exception as e:
            err_str = str(e).lower()
            if any(code in err_str for code in ["429", "503", "decommissioned", "not found"]):
                continue
            raise
