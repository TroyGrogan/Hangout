from django.test import TestCase
from apps.users.models import User, UserPreference, Friendship
from apps.categories.models import Category

class UserModelTest(TestCase):
    def setUp(self):
        # Create test users
        self.user1 = User.objects.create_user(
            username='testuser1',
            email='test1@example.com',
            password='testpass123',
            bio='Test bio 1',
            location='Test Location 1'
        )
        
        self.user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            bio='Test bio 2',
            location='Test Location 2'
        )
        
        # Create test category
        self.category = Category.objects.create(
            name='Test Category',
            description='Test Description',
            icon='test-icon'
        )

    def test_user_creation(self):
        """Test that a user can be created with all fields"""
        self.assertEqual(self.user1.username, 'testuser1')
        self.assertEqual(self.user1.email, 'test1@example.com')
        self.assertEqual(self.user1.bio, 'Test bio 1')
        self.assertEqual(self.user1.location, 'Test Location 1')
        self.assertTrue(self.user1.check_password('testpass123'))

    def test_username_lowercase(self):
        """Test that username is converted to lowercase on save"""
        user = User.objects.create_user(
            username='TESTUSER',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.username, 'testuser')

    def test_user_preference_creation(self):
        """Test that user preferences can be created and linked to categories"""
        preference = UserPreference.objects.create(
            user=self.user1,
            notification_enabled=True
        )
        preference.preferred_categories.add(self.category)
        
        self.assertEqual(preference.user, self.user1)
        self.assertTrue(preference.notification_enabled)
        self.assertIn(self.category, preference.preferred_categories.all())

    def test_friendship_creation(self):
        """Test that friendships can be created between users"""
        friendship = Friendship.objects.create(
            user=self.user1,
            friend=self.user2,
            status='accepted'
        )
        
        self.assertEqual(friendship.user, self.user1)
        self.assertEqual(friendship.friend, self.user2)
        self.assertEqual(friendship.status, 'accepted')
        self.assertEqual(str(friendship), 'testuser1 -> testuser2')

    def test_friendship_unique_constraint(self):
        """Test that duplicate friendships cannot be created"""
        Friendship.objects.create(
            user=self.user1,
            friend=self.user2,
            status='accepted'
        )
        
        # Attempt to create duplicate friendship
        with self.assertRaises(Exception):
            Friendship.objects.create(
                user=self.user1,
                friend=self.user2,
                status='pending'
            )

    def test_friendship_status_choices(self):
        """Test that friendship status must be one of the valid choices"""
        # Create additional users for testing different statuses
        valid_statuses = ['pending', 'accepted', 'rejected']
        
        # Create a different user pair for each status test
        for i, status in enumerate(valid_statuses):
            test_user = User.objects.create_user(
                username=f'status_friend_{i}',
                email=f'status_friend_{i}@example.com',
                password='testpass123'
            )
            
            test_friend = User.objects.create_user(
                username=f'status_user_{i}',
                email=f'status_user_{i}@example.com',
                password='testpass123'
            )
            
            friendship = Friendship.objects.create(
                user=test_user,
                friend=test_friend,
                status=status
            )
            self.assertEqual(friendship.status, status)
        
        # Test invalid status with a fresh user pair
        invalid_user = User.objects.create_user(
            username='invalid_status_user',
            email='invalid_status_user@example.com',
            password='testpass123'
        )
        
        invalid_friend = User.objects.create_user(
            username='invalid_status_friend',
            email='invalid_status_friend@example.com',
            password='testpass123'
        )
        
        with self.assertRaises(Exception):
            Friendship.objects.create(
                user=invalid_user,
                friend=invalid_friend,
                status='invalid_status'
            ) 