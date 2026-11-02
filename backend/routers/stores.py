from fastapi import APIRouter
from typing import List
from models.schemas import StoreResponse, ProductResponse

router = APIRouter(prefix="/stores", tags=["Stores"])

@router.get("", response_model=List[StoreResponse])
def get_stores():
    """List all available stores. Customer selects store in-app (NO store-QR)."""
    return []

@router.get("/{store_id}/products")
def get_store_products(store_id: str, search: str = ""):
    """List products in a selected store with optional search filter."""
    return []
