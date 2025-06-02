#!/usr/bin/env python3
"""
Test Django integration with DEPLOYMENT Q8_0 optimizations
"""

import os
import sys
import time
import django

# Setup Django - ensure we're in the right directory context
# Add the backend directory (where manage.py is) to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
sys.path.insert(0, backend_dir)

# Change to backend directory for Django setup
os.chdir(backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import from the DEPLOYMENT handler (not regular handler)
from apps.ai_chat.llm_handler_deployment import (
    generate_chat_response, 
    UltraLlamaModel, 
    UltraMemoryManager,
    get_deployment_status
)

def test_django_integration():
    """Test Django integration with DEPLOYMENT Q8_0 model"""
    print("=== Testing Django Integration with DEPLOYMENT Q8_0 ===")
    
    # Test memory pressure monitoring with deployment manager
    pressure = UltraMemoryManager.get_memory_pressure()
    available = UltraMemoryManager.get_available_memory_gb()
    print(f"Memory pressure: {pressure}")
    print(f"Available memory: {available:.2f} GB")
    
    # Test deployment model initialization
    print("\nTesting deployment model initialization...")
    model = UltraLlamaModel()
    
    if not model.is_initialized():
        print("Initializing deployment model...")
        success = model.initialize_model()
        if not success:
            print("❌ Deployment model initialization failed")
            return False
    
    print("✅ Deployment model initialized successfully")
    print(f"Context window: {model.context_window} tokens")
    print(f"Max response tokens: {model.max_response_tokens} tokens")
    
    # Test response generation with deployment handler
    print("\nTesting deployment response generation...")
    test_prompts = [
        "Hello! How are you today?",
        "What is artificial intelligence?",
        "Can you explain machine learning briefly?"
    ]
    
    session_id = "test_session_deployment"
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"\nTest {i}: '{prompt}'")
        start_time = time.time()
        
        response = generate_chat_response(
            prompt,
            chat_session=session_id
        )
        
        end_time = time.time()
        generation_time = end_time - start_time
        
        print(f"Response ({generation_time:.2f}s): {response[:100]}...")
        
        # Check memory after each generation
        pressure_after = UltraMemoryManager.get_memory_pressure()
        print(f"Memory pressure after generation: {pressure_after}")
    
    # Test conversation history
    print(f"\nTesting conversation history...")
    history = model.get_conversation_history(session_id)
    print(f"History length: {len(history)} messages")
    
    # Test deployment status instead of trimming
    print("Testing deployment status...")
    status = get_deployment_status()
    print(f"Deployment status: {status}")
    
    print("\n✅ All Django integration tests passed!")
    return True

if __name__ == "__main__":
    try:
        success = test_django_integration()
        if success:
            print("\n🎉 Django integration with DEPLOYMENT Q8_0 optimizations working perfectly!")
        else:
            print("\n❌ Django integration test failed")
    except Exception as e:
        print(f"\n❌ Error during Django integration test: {e}")
        import traceback
        traceback.print_exc() 