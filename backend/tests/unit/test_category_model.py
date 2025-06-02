from django.test import TestCase
from apps.categories.models import Category

class CategoryModelTest(TestCase):
    def setUp(self):
        # Create a main category
        self.main_category = Category.objects.create(
            name="Sports",
            description="Sports activities",
            icon="sports"
        )
        
        # Create a subcategory
        self.subcategory = Category.objects.create(
            name="Basketball",
            description="Basketball activities",
            parent=self.main_category,
            icon="basketball"
        )

    def test_category_creation(self):
        """Test that a category can be created"""
        self.assertEqual(self.main_category.name, "Sports")
        self.assertEqual(self.main_category.description, "Sports activities")
        self.assertIsNone(self.main_category.parent)

    def test_subcategory_creation(self):
        """Test that a subcategory can be created with a parent"""
        self.assertEqual(self.subcategory.name, "Basketball")
        self.assertEqual(self.subcategory.parent, self.main_category)

    def test_is_main_category_property(self):
        """Test the is_main_category property works correctly"""
        self.assertTrue(self.main_category.is_main_category)
        self.assertFalse(self.subcategory.is_main_category)

    def test_string_representation(self):
        """Test the string representation of categories"""
        self.assertEqual(str(self.main_category), "Sports")
        self.assertEqual(str(self.subcategory), "Sports -> Basketball")