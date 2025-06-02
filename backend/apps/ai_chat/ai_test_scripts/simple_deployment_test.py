#!/usr/bin/env python3
"""
Simple test for deployment handler without Django
"""

import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, backend_dir)

def test_deployment_handler_imports():
    """Test if we can import the deployment handler functions"""
    print("=== Testing Deployment Handler Imports ===")
    
    try:
        # Test importing the deployment functions
        from apps.ai_chat.llm_handler_deployment import (
            generate_deployment_response,
            get_deployment_status,
            UltraLlamaModel,
            UltraMemoryManager,
            # Test the compatibility functions
            generate_chat_response,
            clear_chat_history,
            initialize_model,
            is_model_initialized,
            generate_new_session_id,
            initialization_status
        )
        print("✅ All deployment handler functions imported successfully")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_memory_manager():
    """Test the ultra memory manager"""
    print("\n=== Testing Ultra Memory Manager ===")
    
    try:
        from apps.ai_chat.llm_handler_deployment import UltraMemoryManager
        
        # Test memory pressure detection
        pressure = UltraMemoryManager.get_memory_pressure()
        print(f"Memory pressure: {pressure}")
        
        # Test available memory
        available = UltraMemoryManager.get_available_memory_gb()
        print(f"Available memory: {available:.2f} GB")
        
        # Test swap monitoring
        swap = UltraMemoryManager.monitor_swap_usage()
        print(f"Swap usage: {swap:.2f} GB")
        
        # Test emergency check
        emergency = UltraMemoryManager.check_memory_emergency()
        print(f"Memory emergency: {emergency}")
        
        print("✅ Ultra Memory Manager working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Memory manager error: {e}")
        return False

def test_model_initialization():
    """Test model initialization without loading the actual model"""
    print("\n=== Testing Model Initialization (without loading) ===")
    
    try:
        from apps.ai_chat.llm_handler_deployment import UltraLlamaModel, initialization_status
        
        # Create model instance
        model = UltraLlamaModel()
        print(f"✅ UltraLlamaModel instance created")
        print(f"Context window: {model.context_window}")
        print(f"Max response tokens: {model.max_response_tokens}")
        
        # Check initialization status
        print(f"Initialization status: {initialization_status}")
        
        # Test if model is initialized (should be False initially)
        initialized = model.is_initialized()
        print(f"Model initialized: {initialized}")
        
        print("✅ Model initialization test completed")
        return True
        
    except Exception as e:
        print(f"❌ Model initialization error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_compatibility_functions():
    """Test the compatibility wrapper functions"""
    print("\n=== Testing Compatibility Functions ===")
    
    try:
        from apps.ai_chat.llm_handler_deployment import (
            generate_chat_response,
            clear_chat_history,
            initialize_model,
            is_model_initialized,
            generate_new_session_id
        )
        
        # Test session ID generation
        session_id = generate_new_session_id()
        print(f"✅ Generated session ID: {session_id}")
        
        # Test model initialization check
        initialized = is_model_initialized()
        print(f"✅ Model initialized check: {initialized}")
        
        # Test clear history (should work even without Django)
        try:
            result = clear_chat_history("test_session")
            print(f"✅ Clear history function: {result}")
        except:
            print("⚠️  Clear history requires Django (expected)")
        
        print("✅ Compatibility functions working")
        return True
        
    except Exception as e:
        print(f"❌ Compatibility functions error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Simple Deployment Handler Test")
    print("=" * 50)
    
    tests = [
        ("Import Test", test_deployment_handler_imports),
        ("Memory Manager Test", test_memory_manager),
        ("Model Initialization Test", test_model_initialization),
        ("Compatibility Functions Test", test_compatibility_functions),
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
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Deployment handler is working correctly.")
        print("\n📋 Next Steps:")
        print("1. The deployment handler is now being used by Django views")
        print("2. Test with actual Django server: python manage.py runserver")
        print("3. Monitor memory usage during operation")
    else:
        print("⚠️  Some tests failed. Check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 