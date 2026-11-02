from fastapi import APIRouter
from models.schemas import ScanRequest, ProductResponse

router = APIRouter(prefix="/scan", tags=["Scan"])

@router.post("")
def scan_product(req: ScanRequest):
    """
    Look up scanned barcode within specific store context.
    The backend is the sole authority on prices and stock.
    """
    return {"message": "Barcode scan handler ready for Phase 2"}
