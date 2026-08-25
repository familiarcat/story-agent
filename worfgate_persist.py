# Checksum validation logic
import hashlib
from supabase import create_client, Client

class WorfGatePersist:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase = create_client(supabase_url, supabase_key)

    def validate_checksum(self, data):
        checksum = hashlib.sha256(data.encode()).hexdigest()
        return checksum

    def store_checksum(self, data):
        checksum = self.validate_checksum(data)
        response = self.supabase.table('checksums').insert({"data": data, "checksum": checksum}).execute()
        return response.data
