import unittest
from unittest.mock import MagicMock
from worfgate_persist import WorfGatePersist

class TestWorfGatePersist(unittest.TestCase):
    def setUp(self):
        self.supabase_mock = MagicMock()
        self.worfgate = WorfGatePersist("https://example.supabase.co", "supabase_key")
        self.worfgate.supabase = self.supabase_mock

    def test_validate_checksum(self):
        data = "test_data"
        checksum = self.worfgate.validate_checksum(data)
        self.assertEqual(len(checksum), 64)  # SHA-256 produces a 64-character hex string

    def test_store_checksum(self):
        data = "test_data"
        self.supabase_mock.table.return_value.insert.return_value.execute.return_value.data = "success"
        response = self.worfgate.store_checksum(data)
        self.assertEqual(response, "success")
        self.supabase_mock.table.assert_called_once_with("checksums")

if __name__ == "__main__":
    unittest.main()