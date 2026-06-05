from fastapi import APIRouter
from app.database import get_database

router = APIRouter()

@router.post("/test-db")
def test_database():
    db = get_database()

    result = db.test.insert_one({
        "message": "MongoDB is connected successfully"
    })

    return {
        "message": "Test data inserted successfully",
        "id": str(result.inserted_id)
    }