from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import admin, stores, scan, orders, bills, staff, dashboard

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SmartScan API — Multi-Retailer Scan-and-Go Checkout System"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(admin.router)
app.include_router(stores.router)
app.include_router(scan.router)
app.include_router(orders.router)
app.include_router(bills.router)
app.include_router(staff.router)
app.include_router(dashboard.router)

@app.get("/", tags=["Health"])
def root_health():
    """Health check endpoint to verify backend status."""
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "mode": "working_prototype"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
