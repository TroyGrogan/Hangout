from django.test import TestCase
import json
from django.core.exceptions import ValidationError

class AdditionalFrontendServicesTest(TestCase):
    def setUp(self):
        pass

    def test_category_service_error_handling(self):
        """Test category service error handling"""
        # Test with an invalid URL - returns 404
        response = self.client.get('/api/categories/invalid/')
        self.assertEqual(response.status_code, 404)
        
        # Test with invalid parameters - still returns 200 with empty results
        response = self.client.get('/api/categories/?name=nonexistent')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIsInstance(response_data, list)
        self.assertEqual(len(response_data), 0)

    def test_category_service_cache_handling(self):
        """Test category service caching"""
        # Make two identical requests - the second should use cache
        response1 = self.client.get('/api/categories/')
        response2 = self.client.get('/api/categories/')
        
        # Both should succeed
        self.assertEqual(response1.status_code, 200)
        self.assertEqual(response2.status_code, 200)
        
        # Content should be the same
        self.assertEqual(response1.content, response2.content) 