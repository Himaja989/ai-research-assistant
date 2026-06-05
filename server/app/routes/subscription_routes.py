from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.routes.auth_routes import get_current_user
from app.config import SUBSCRIPTION_PLANS

router = APIRouter()


class UpgradeRequest(BaseModel):
    plan: str


@router.get("/subscription/plans")
def get_plans():
    """Return all available subscription plans."""
    return SUBSCRIPTION_PLANS


@router.get("/subscription/current")
def get_current_subscription(user_id: str = Depends(get_current_user)):
    """Return the current user's subscription details and usage."""
    db = get_database()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan_key = user.get("subscription", "free")
    plan = SUBSCRIPTION_PLANS[plan_key]

    return {
        "current_plan": plan_key,
        "plan_details": plan,
        "usage": {
            "messages_today": user.get("messages_today", 0),
            "messages_limit": plan["messages_per_day"],
            "documents_this_month": user.get("documents_this_month", 0),
            "documents_limit": plan["documents_per_month"],
        },
    }


@router.post("/subscription/upgrade")
def upgrade_subscription(
    request: UpgradeRequest,
    user_id: str = Depends(get_current_user),
):
    """Upgrade or change the user's subscription plan."""
    if request.plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan. Choose from: {', '.join(SUBSCRIPTION_PLANS.keys())}",
        )

    db = get_database()
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"subscription": request.plan, "updated_at": datetime.utcnow()}},
    )

    plan = SUBSCRIPTION_PLANS[request.plan]
    return {
        "message": f"Successfully upgraded to {plan['name']} plan",
        "plan": plan,
    }
