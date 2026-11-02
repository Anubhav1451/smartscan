import os
from typing import List
from dotenv import load_dotenv

# Load .env file from project root or current working dir if available
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

class Settings:
    PROJECT_NAME: str = "SmartScan API"
    VERSION: str = "0.1.0"
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Port binding (Render provides PORT dynamically, default 8000)
    PORT: int = int(os.getenv("PORT", 8000))

    # CORS Configuration (reads FRONTEND_ORIGIN, with fallback to ALLOWED_ORIGINS, keeping localhost for dev)
    @property
    def FRONTEND_ORIGIN(self) -> str:
        return os.getenv("FRONTEND_ORIGIN", os.getenv("ALLOWED_ORIGINS", ""))

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:5180",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5180",
        ]
        frontend_origin = self.FRONTEND_ORIGIN
        if frontend_origin:
            for item in frontend_origin.split(","):
                cleaned = item.strip().rstrip("/")
                if cleaned and cleaned not in origins:
                    origins.append(cleaned)
        return origins

    # Shared demo password
    DEMO_PASSWORD: str = "SmartScanDemo2026!"

settings = Settings()
