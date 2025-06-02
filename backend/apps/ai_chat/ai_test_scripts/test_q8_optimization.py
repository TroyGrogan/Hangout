#!/usr/bin/env python3
"""
Quick test script for Q8_0 optimizations
"""

import os
import sys
import psutil
import time

def test_memory_management():
    """Test memory management utilities"""
    print("=== Testing Memory Management ===")
    
    # Test memory pressure detection
    mem = psutil.virtual_memory()
    print(f"Current memory usage: {mem.percent:.1f}%")
    
    if mem.percent >= 95:
        pressure = 'critical'
    elif mem.percent >= 85:
        pressure = 'high'
    elif mem.percent >= 70:
        pressure = 'medium'
    else:
        pressure = 'low'
    
    print(f"Memory pressure level: {pressure}")
    
    # Test garbage collection
    import gc
    collected = gc.collect()
    print(f"Garbage collection freed {collected} objects")
    
    return True

def test_model_path():
    """Test if model file exists"""
    print("\n=== Testing Model Path ===")
    
    # Get the backend directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(backend_dir, "ai_model", "tinyllama-1.1b-chat-v1.0.Q8_0.gguf")
    
    print(f"Looking for model at: {model_path}")
    
    if os.path.exists(model_path):
        file_size = os.path.getsize(model_path)
        file_size_gb = file_size / (1024**3)
        print(f"✅ Model file found! Size: {file_size_gb:.2f} GB")
        return True
    else:
        print("❌ Model file not found!")
        
        # Check if ai_model directory exists
        ai_model_dir = os.path.join(backend_dir, "ai_model")
        if os.path.exists(ai_model_dir):
            files = os.listdir(ai_model_dir)
            print(f"Files in ai_model directory: {files}")
        else:
            print("ai_model directory not found!")
        
        return False

def test_llama_cpp_import():
    """Test llama-cpp-python import"""
    print("\n=== Testing llama-cpp-python Import ===")
    
    try:
        import llama_cpp
        print(f"✅ llama-cpp-python imported successfully")
        print(f"Version: {getattr(llama_cpp, '__version__', 'unknown')}")
        
        # Test Llama class import
        from llama_cpp import Llama
        print("✅ Llama class imported successfully")
        
        # Test cache import
        try:
            from llama_cpp import LlamaRAMCache
            print("✅ LlamaRAMCache available")
        except ImportError:
            print("⚠️  LlamaRAMCache not available")
        
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import llama-cpp-python: {e}")
        return False

def test_system_requirements():
    """Test system requirements for Q8_0"""
    print("\n=== Testing System Requirements ===")
    
    # Memory check
    mem = psutil.virtual_memory()
    total_gb = mem.total / (1024**3)
    available_gb = mem.available / (1024**3)
    
    print(f"Total RAM: {total_gb:.2f} GB")
    print(f"Available RAM: {available_gb:.2f} GB")
    
    # Q8_0 requirements
    required_ram = 3.67  # GB
    
    if available_gb >= required_ram:
        print(f"✅ Sufficient RAM for Q8_0 model ({available_gb:.2f} >= {required_ram} GB)")
        ram_ok = True
    else:
        print(f"⚠️  Insufficient RAM for Q8_0 model ({available_gb:.2f} < {required_ram} GB)")
        print("Will rely on swap memory")
        ram_ok = False
    
    # Swap check
    try:
        swap = psutil.swap_memory()
        swap_gb = swap.total / (1024**3)
        print(f"Swap space: {swap_gb:.2f} GB")
        
        if swap_gb >= 2.0:
            print("✅ Adequate swap space")
            swap_ok = True
        else:
            print("⚠️  Limited swap space - consider increasing")
            swap_ok = False
    except:
        print("❌ Could not check swap space")
        swap_ok = False
    
    # CPU check
    cpu_count = psutil.cpu_count()
    print(f"CPU cores: {cpu_count}")
    
    if cpu_count >= 1:
        print("✅ CPU requirements met")
        cpu_ok = True
    else:
        print("❌ Insufficient CPU cores")
        cpu_ok = False
    
    return ram_ok or swap_ok, cpu_ok

def main():
    """Main test function"""
    print("=== Q8_0 TinyLlama Optimization Test ===\n")
    
    # Run tests
    tests = [
        ("Memory Management", test_memory_management),
        ("Model Path", test_model_path),
        ("llama-cpp-python Import", test_llama_cpp_import),
        ("System Requirements", test_system_requirements)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ Error in {test_name}: {e}")
            results[test_name] = False
    
    # Summary
    print("\n=== Test Summary ===")
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! System ready for Q8_0 optimization")
    elif passed >= total * 0.75:
        print("⚠️  Most tests passed. System should work with optimizations")
    else:
        print("❌ Multiple test failures. Check system configuration")
    
    # Recommendations
    print("\n=== Recommendations ===")
    if not results.get("Model Path", False):
        print("- Ensure Q8_0 model file is in backend/ai_model/ directory")
    
    if not results.get("llama-cpp-python Import", False):
        print("- Install llama-cpp-python: pip install llama-cpp-python")
    
    if not results.get("System Requirements", False):
        print("- Consider increasing swap space or using Q4_K_M quantization")
        print("- Run optimize_system.py for system optimizations")

if __name__ == "__main__":
    main() 