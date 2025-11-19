from fastapi import APIRouter, Body
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class ContactIn(BaseModel):
    name: str
    email: str  # Minimal validation for prototype to avoid extra deps
    message: str

@router.post("/contact")
async def contact_form(payload: ContactIn = Body(...)):
    # In a prototype, just acknowledge receipt. In production, send email or store in DB.
    print(f"[CONTACT] {datetime.utcnow().isoformat()}Z name={payload.name} email={payload.email} message={payload.message[:200]}")
    return {"success": True, "received_at": datetime.utcnow().isoformat()+"Z"}
