from fastapi import APIRouter
from models.schemas import CreateOrderRequest, AddItemRequest, UpdateItemRequest, PayMockRequest

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("")
def create_order(req: CreateOrderRequest):
    """Initialize a cart order tied to a single store."""
    return {"message": "Order creation handler ready for Phase 2"}

@router.post("/{order_id}/items")
def add_item_to_order(order_id: str, req: AddItemRequest):
    """Add item to cart; backend validates store stock and recalculates total."""
    return {"message": "Item addition handler ready for Phase 2"}

@router.patch("/{order_id}/items/{item_id}")
def update_item_qty(order_id: str, item_id: str, req: UpdateItemRequest):
    """Update quantity; backend recalculates total."""
    return {"message": "Item quantity update handler ready for Phase 2"}

@router.delete("/{order_id}/items/{item_id}")
def delete_item(order_id: str, item_id: str):
    """Remove line item from cart."""
    return {"message": "Item deletion handler ready for Phase 2"}

@router.get("/{order_id}")
def get_order(order_id: str):
    """Fetch order details and current totals."""
    return {"message": "Order detail handler ready for Phase 2"}

@router.post("/{order_id}/pay/mock")
def pay_mock(order_id: str, req: PayMockRequest):
    """Process mock UPI payment: decrement stock, assign bill_no, set BILL_ACTIVE."""
    return {"message": "Mock payment handler ready for Phase 2"}

@router.post("/{order_id}/pay/cash")
def pay_cash(order_id: str):
    """Place order into CASH_PENDING status awaiting staff confirmation."""
    return {"message": "Cash payment handler ready for Phase 2"}
