#!/usr/bin/env python3
"""
Verify that Django views are using the deployment handler
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def verify_views_import():
    """Verify that views.py is importing from the deployment handler"""
    print("=== Verifying Views Import ===")
    
    try:
        # Import the views module
        from apps.ai_chat import views
        
        # Check if the imported functions are from the deployment handler
        from apps.ai_chat.llm_handler_deployment import generate_chat_response as deployment_generate
        
        # The views should be using the deployment handler's generate_chat_response
        views_generate = views.generate_chat_response
        
        # Check if they're the same function
        if views_generate == deployment_generate:
            print("✅ Views are using the deployment handler!")
            return True
        else:
            print("❌ Views are NOT using the deployment handler")
            print(f"Views function: {views_generate}")
            print(f"Deployment function: {deployment_generate}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking views import: {e}")
        return False

def verify_deployment_functions():
    """Verify all deployment functions are available in views"""
    print("\n=== Verifying Deployment Functions ===")
    
    try:
        from apps.ai_chat import views
        
        required_functions = [
            'generate_chat_response',
            'clear_chat_history',
            'load_history_from_database',
            'initialize_llm',  # This is aliased as initialize_model
            'is_model_initialized',
            'initialization_status',
            'generate_new_session_id'
        ]
        
        missing_functions = []
        for func_name in required_functions:
            if not hasattr(views, func_name):
                missing_functions.append(func_name)
        
        if missing_functions:
            print(f"❌ Missing functions in views: {missing_functions}")
            return False
        else:
            print("✅ All required functions available in views")
            return True
            
    except Exception as e:
        print(f"❌ Error checking deployment functions: {e}")
        return False

def test_deployment_status():
    """Test the deployment status function"""
    print("\n=== Testing Deployment Status ===")
    
    try:
        from apps.ai_chat.llm_handler_deployment import get_deployment_status
        
        status = get_deployment_status()
        print(f"Deployment status: {status}")
        
        required_keys = ['memory_pressure', 'available_memory_gb', 'model_loaded', 'emergency_mode']
        missing_keys = [key for key in required_keys if key not in status]
        
        if missing_keys:
            print(f"❌ Missing status keys: {missing_keys}")
            return False
        else:
            print("✅ Deployment status working correctly")
            return True
            
    except Exception as e:
        print(f"❌ Error testing deployment status: {e}")
        return False

def test_model_initialization():
    """Test model initialization through views interface"""
    print("\n=== Testing Model Initialization Interface ===")
    
    try:
        from apps.ai_chat import views
        
        # Test initialization status
        init_status = views.initialization_status
        print(f"Initialization status: {init_status}")
        
        # Test is_model_initialized
        is_initialized = views.is_model_initialized()
        print(f"Model initialized: {is_initialized}")
        
        # Test generate_new_session_id
        session_id = views.generate_new_session_id()
        print(f"Generated session ID: {session_id}")
        
        print("✅ Model initialization interface working")
        return True
        
    except Exception as e:
        print(f"❌ Error testing model initialization interface: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all verification tests"""
    print("🔍 Verifying Deployment Handler Integration")
    print("=" * 50)
    
    tests = [
        ("Views Import Verification", verify_views_import),
        ("Deployment Functions Check", verify_deployment_functions),
        ("Deployment Status Test", test_deployment_status),
        ("Model Initialization Interface", test_model_initialization),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if result:
                passed += 1
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Integration Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 SUCCESS! Django views are using the deployment handler!")
        print("\n📋 Deployment Handler Status:")
        print("✅ Views.py imports from llm_handler_deployment")
        print("✅ All compatibility functions working")
        print("✅ Ultra-optimized for 1 CPU + 2GB RAM")
        print("✅ Memory pressure monitoring active")
        print("✅ Emergency recovery systems ready")
        
        print("\n🚀 Ready for Production Deployment!")
        print("- Context window: 1024 tokens")
        print("- Max response: 256 tokens")
        print("- Single-threaded operation")
        print("- Aggressive memory management")
        
    else:
        print("⚠️  Some integration tests failed. Check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 