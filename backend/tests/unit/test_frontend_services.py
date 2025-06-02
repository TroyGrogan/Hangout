from django.test import TestCase
import json

class FrontendServicesTest(TestCase):
    def setUp(self):
        pass

    def test_category_service_get_categories(self):
        """Test the category service"""
        # Test successful category fetch
        response = self.client.get('/api/categories/')
        
        self.assertEqual(response.status_code, 200)
        # Verify response is a direct array since pagination is disabled
        response_data = response.json()
        self.assertIsInstance(response_data, list)
        
        # Test that the endpoint returns a valid response even with error
        response = self.client.get('/api/categories/?invalid_param=true')
        self.assertEqual(response.status_code, 200) 