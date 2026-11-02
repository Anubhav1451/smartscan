from typing import List, Optional, Any
from pydantic import BaseModel, Field

# Admin Models
class ResetDemoRequest(BaseModel):
    confirm: bool = Field(..., description="Must be true to execute reset")

class ResetDemoResponse(BaseModel):
    status: str
    message: str
    canonical_bill: Optional[str] = None
    stores: Optional[List[str]] = None

# Scan Models
class ScanRequest(BaseModel):
    store_id: str
    barcode: str

class ProductResponse(BaseModel):
    id: str
    store_id: str
    barcode: str
    name: str
    category: str
    price: int
    stock: int
    in_stock: bool

# Store Models
class StoreResponse(BaseModel):
    id: str
    retailer_id: str
    name: str
    area: str
    code: str

# Order & Cart Models
class CreateOrderRequest(BaseModel):
    store_id: str

class AddItemRequest(BaseModel):
    barcode: str
    qty: int = 1

class UpdateItemRequest(BaseModel):
    qty: int

class PayMockRequest(BaseModel):
    method: str = "UPI_MOCK"

# Exit Verify Models
class ExitVerifyRequest(BaseModel):
    bill_no: str
    bag_items: List[str]

# Dashboard Models
class ImpactMetrics(BaseModel):
    digital_bills_total: int
    paper_saved_sheets: int
    checkout_time_saved_minutes: int
