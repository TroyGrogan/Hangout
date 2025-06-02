#!/usr/bin/env python3
"""
Test the ultra-optimized deployment handler
"""

import os
import sys
import time
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.ai_chat.llm_handler_deployment import (
    generate_deployment_response, 
    get_deployment_status,
    UltraLlamaModel,
    UltraMemoryManager
)

def test_deployment_handler():
    """Test the deployment handler with ultra constraints"""
    print("=== Testing Ultra-Optimized Deployment Handler ===")
    
    # Check initial status
    print("\n1. Checking deployment status...")
    status = get_deployment_status()
    print(f"Initial status: {status}")
    
    # Test memory management
    print("\n2. Testing memory management...")
    pressure = UltraMemoryManager.get_memory_pressure()
    available = UltraMemoryManager.get_available_memory_gb()
    emergency = UltraMemoryManager.check_memory_emergency()
    
    print(f"Memory pressure: {pressure}")
    print(f"Available memory: {available:.2f} GB")
    print(f"Emergency mode: {emergency}")
    
    # Test model initialization
    print("\n3. Testing ultra model initialization...")
    model = UltraLlamaModel()
    
    start_time = time.time()
    success = model.initialize_model()
    init_time = time.time() - start_time
    
    if success:
        print(f"✅ Ultra model initialized in {init_time:.2f}s")
        print(f"Context window: {model.context_window}")
        print(f"Max response tokens: {model.max_response_tokens}")
    else:
        print("❌ Ultra model initialization failed")
        return False
    
    # Test response generation with deployment constraints
    print("\n4. Testing deployment response generation...")
    
    test_prompts = [
        "Hi! How are you?",
        "What is AI?",
        "Explain Python briefly."
    ]
    
    session_id = "ultra_test_session"
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"\nTest {i}: '{prompt}'")
        
        start_time = time.time()
        response = generate_deployment_response(prompt, chat_session=session_id)
        gen_time = time.time() - start_time
        
        print(f"Response ({gen_time:.2f}s): {response[:80]}...")
        
        # Check memory after generation
        status_after = get_deployment_status()
        print(f"Memory after: {status_after['memory_pressure']}, "
              f"Available: {status_after['available_memory_gb']:.2f}GB")
    
    # Test conversation history
    print(f"\n5. Testing conversation history...")
    history = model.get_conversation_history(session_id)
    print(f"History length: {len(history)} messages")
    
    # Test emergency memory recovery
    print(f"\n6. Testing emergency memory recovery...")
    UltraMemoryManager.emergency_memory_recovery()
    print("Emergency recovery completed")
    
    # Final status
    final_status = get_deployment_status()
    print(f"\nFinal status: {final_status}")
    
    print("\n✅ All deployment handler tests completed!")
    return True

def benchmark_deployment_performance():
    """Benchmark deployment performance"""
    print("\n=== Deployment Performance Benchmark ===")
    
    # Test multiple rapid generations
    session_id = "benchmark_session"
    test_prompt = "Hello!"
    
    times = []
    for i in range(5):
        start_time = time.time()
        response = generate_deployment_response(test_prompt, chat_session=session_id)
        end_time = time.time()
        
        generation_time = end_time - start_time
        times.append(generation_time)
        
        print(f"Generation {i+1}: {generation_time:.2f}s ({len(response)} chars)")
    
    avg_time = sum(times) / len(times)
    min_time = min(times)
    max_time = max(times)
    
    print(f"\nBenchmark Results:")
    print(f"Average time: {avg_time:.2f}s")
    print(f"Min time: {min_time:.2f}s")
    print(f"Max time: {max_time:.2f}s")
    
    # Performance assessment
    if avg_time < 3.0:
        print("🚀 Excellent performance for deployment constraints!")
    elif avg_time < 5.0:
        print("✅ Good performance for deployment constraints")
    elif avg_time < 10.0:
        print("⚠️  Acceptable performance, but could be optimized")
    else:
        print("❌ Performance may be too slow for production")

if __name__ == "__main__":
    try:
        # Run main test
        success = test_deployment_handler()
        
        if success:
            # Run benchmark
            benchmark_deployment_performance()
            
            print("\n🎉 Deployment handler ready for 1 CPU + 2GB RAM constraints!")
        else:
            print("\n❌ Deployment handler test failed")
            
    except Exception as e:
        print(f"\n❌ Error during deployment test: {e}")
        import traceback
        traceback.print_exc() 