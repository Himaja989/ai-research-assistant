from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from app.routes.auth_routes import get_current_user
from app.config import OPENAI_API_KEY

router = APIRouter()

client = OpenAI(api_key=OPENAI_API_KEY)


class ImageRequest(BaseModel):
    prompt: str


@router.post("/images/generate")
async def generate_image(
    request: ImageRequest,
    user_id: str = Depends(get_current_user),
):
    prompt = request.prompt.strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    try:
        result = client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
        )

        image_base64 = result.data[0].b64_json

        return {
            "image": image_base64,
            "prompt": prompt,
        }

    except Exception as e:
        print("OPENAI IMAGE ERROR:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed: {str(e)}"
        )
