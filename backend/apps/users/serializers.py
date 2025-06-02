from rest_framework import serializers
from .models import Friendship, User, UserPreference
# from apps.categories.models import Category

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model, used for general user data operations
    """
    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'email', 
            'bio', 
            'location', 
            'latitude', 
            'longitude', 
            'profile_image'
        ]
        read_only_fields = []
        extra_kwargs = {
            'password': {'write_only': True}
        }

class UserPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for UserPreference model
    """
    # preferred_categories = serializers.PrimaryKeyRelatedField(
    #     queryset=Category.objects.all(),
    #     many=True,
    #     required=False
    # )
    # Explicitly define preferred_categories to ensure it's handled as a list of integers,
    # even though JSONField in the model would accept various JSON structures.
    # This adds a layer of validation.
    preferred_categories = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = UserPreference
        fields = ['id', 'user', 'preferred_categories', 'notification_enabled']
        read_only_fields = ['user']

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration
    """
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'confirm_password'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def validate(self, data):
        """
        Check that the passwords match
        """
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "Passwords don't match"
            })
        return data

    def validate_email(self, value):
        """
        Check that the email is unique
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_username(self, value):
        """
        Check that the username is unique (case-insensitive)
        """
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value.lower()  # Convert to lowercase

    def create(self, validated_data):
        # Remove confirm_password from the data
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        # Create the user instance
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        return user
    
class BasicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'profile_image']

class FriendshipSerializer(serializers.ModelSerializer):
    friend_username = serializers.CharField(source='friend.username', read_only=True)
    friend_profile_image = serializers.URLField(source='friend.profile_image', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_profile_image = serializers.URLField(source='user.profile_image', read_only=True)
    
    class Meta:
        model = Friendship
        fields = ['id', 'user', 'friend', 'user_username', 'user_profile_image', 'friend_username', 'friend_profile_image', 'status', 'created_at']
        read_only_fields = ['created_at']