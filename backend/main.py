import logging
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from routers import admin, stores, scan, orders, bills, staff, dashboard

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SmartScan API — Multi-Retailer Scan-and-Go Checkout System"
)

# Part 5: Error Hygiene — Never leak stack traces, SQL or file paths to API clients
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail} if isinstance(exc.detail, (dict, list)) else {"detail": {"error": str(exc.detail), "code": "HTTP_ERROR"}}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_msg = "; ".join([f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}" for err in exc.errors()])
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": {"error": error_msg, "code": "VALIDATION_ERROR"}}
    )

@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": {"error": "An unexpected server error occurred. Please try again.", "code": "INTERNAL_SERVER_ERROR"}}
    )

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
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

from fastapi import Depends
from core.auth import get_current_user, UserProfile
from core.db import get_supabase

@app.get("/auth/me", tags=["Auth"])
def get_me(user: UserProfile = Depends(get_current_user)):
    """Return authenticated caller profile loaded server-side."""
    sb = get_supabase()
    store = None
    if user.store_id:
        s_res = sb.table("stores").select("id, name, code, area").eq("id", user.store_id).execute()
        if s_res.data:
            store = s_res.data[0]
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "store_id": user.store_id,
        "display_name": user.display_name,
        "store": store
    }

@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
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
    import os
    port = int(os.getenv("PORT", settings.PORT))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

