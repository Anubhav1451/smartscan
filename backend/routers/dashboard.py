from fastapi import APIRouter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/{store_id}/summary")
def get_dashboard_summary(store_id: str):
    """
    Retrieve rule-based store metrics:
    KPIs (Sales, Orders, Digital Bills, Low Stock),
    7-day sales bar chart data, Top Products, Recent Transactions,
    and Impact metrics (paper sheets saved, checkout minutes saved).
    NOTE: All insights are rule-based analytics from transaction data.
    Never labelled as AI.
    """
    return {
        "message": "Dashboard summary handler ready for Phase 3",
        "impact_disclaimer": "Metrics calculated directly from transaction data."
    }
