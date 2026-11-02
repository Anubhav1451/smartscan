from supabase import create_client, Client
from core.config import settings

# Shared admin/service-role Supabase client
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)

def get_supabase() -> Client:
    return supabase_admin
