from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# Admin Models
class ResetDemoRequest(BaseModel):
    confirm: bool = Field(..., description="Must be true to execute reset")

class ResetDemoResponse(BaseModel):
    status: str
    message: str
    canonical_bill: Optional[str] = None
    stores: Optional[List[str]] = None

# Store Models
class StoreResponse(BaseModel):
    id: str
    retailer_id: Optional[str] = None
    name: str
    area: str
    code: str

# Product Models
class ProductResponse(BaseModel):
    id: str
    store_id: str
    barcode: str
    name: str
    category: str
    price: int
    stock: int
    in_stock: bool

class ProductCreateRequest(BaseModel):
    barcode: str = Field(..., min_length=1, description="Product barcode (must be unique within store)")
    name: str = Field(..., min_length=1, description="Generic product name")
    category: str = Field(..., min_length=1, description="Category name")
    price: int = Field(..., ge=0, description="Price in whole rupees (INR)")
    stock: int = Field(..., ge=0, description="Stock units available")

class ProductUpdateRequest(BaseModel):
    id: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[int] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)

class BarcodeLookupResponse(BaseModel):
    status: str # "EXISTS_CURRENT_STORE" | "EXISTS_OTHER_STORE" | "NEW_PRODUCT"
    barcode: str
    product: Optional[Dict[str, Any]] = None
    other_product: Optional[Dict[str, Any]] = None

# Scan Models
class ScanRequest(BaseModel):
    store_id: str
    barcode: str

# Checkout & Order Models
class CheckoutItem(BaseModel):
    barcode: str
    qty: int = 1

class CheckoutRequest(BaseModel):
    store_id: str
    items: List[CheckoutItem]
    payment_method: Optional[str] = "UPI_MOCK"

class CheckoutResponse(BaseModel):
    order_id: str
    total: int
    status: str
    store_id: str
    items: List[Any]

class MockPayRequest(BaseModel):
    method: str = "UPI_MOCK"

class MockPayResponse(BaseModel):
    order_id: str
    bill_no: str
    qr_token: str
    total: int
    status: str
    store_id: str
    paid_at: Optional[str] = None
    items: Optional[List[Any]] = None

# Staff Models
class CashConfirmResponse(BaseModel):
    order_id: str
    bill_no: str
    qr_token: str
    total: int
    status: str

class ExitVerifyRequest(BaseModel):
    bill_id: Optional[str] = None
    bill_no: Optional[str] = None
    bag_items: Optional[List[str]] = []

class ExitUseRequest(BaseModel):
    bill_id: Optional[str] = None
    bill_no: Optional[str] = None

class ExitVerifyResponse(BaseModel):
    status: str # VERIFIED, ALREADY_USED, INVALID, WRONG_STORE, MISMATCH
    message: Optional[str] = None
    bill_no: Optional[str] = None
    order_id: Optional[str] = None
    store_name: Optional[str] = None
    store_code: Optional[str] = None
    total: Optional[int] = None
    items: Optional[List[Any]] = None
    used_at: Optional[str] = None
    created_at: Optional[str] = None
    customer_name: Optional[str] = None

class RFIDCheckRequest(BaseModel):
    bill_id: Optional[str] = None
    bill_no: Optional[str] = None
    extra_item: bool = False

class RFIDCheckResponse(BaseModel):
    status: str # MATCH or MISMATCH
    message: str
    bill_no: Optional[str] = None
    order_id: Optional[str] = None
    billed_items: Optional[List[Any]] = []
    bag_items: Optional[List[Any]] = []
    extra_items: Optional[List[Any]] = []
    unbilled_count: int = 0

class ImpactMetrics(BaseModel):
    queue_time_saved_hours: float
    queue_time_saved_minutes: int
    paper_bills_avoided: int
    items_scanned: int
    disclaimer: str = "Estimates calculated directly from transaction data. No AI."

class DashboardSummaryResponse(BaseModel):
    store_id: str
    store_name: str
    store_code: str
    range: str
    sales_total: int
    orders_count: int
    items_sold: int
    average_bill: int
    digital_bills_total: int
    low_stock_count: int
    sales_last_7_days: List[Dict[str, Any]]
    top_products: List[Dict[str, Any]]
    recent_transactions: List[Dict[str, Any]]
    low_stock_items: List[Dict[str, Any]]
    impact: ImpactMetrics

