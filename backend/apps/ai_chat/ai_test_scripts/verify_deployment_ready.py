#!/usr/bin/env python3
"""
Final Deployment Readiness Verification
Checks all components are ready for 1 CPU + 2GB RAM deployment
"""

import os
import sys
import importlib.util

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        size = os.path.getsize(filepath) / (1024*1024)  # MB
        print(f"✅ {description}: {filepath} ({size:.1f} MB)")
        return True
    else:
        print(f"❌ {description}: {filepath} - NOT FOUND")
        return False

def check_python_import(module_name, description):
    """Check if a Python module can be imported"""
    try:
        spec = importlib.util.find_spec(module_name)
        if spec is not None:
            print(f"✅ {description}: {module_name}")
            return True
        else:
            print(f"❌ {description}: {module_name} - NOT FOUND")
            return False
    except Exception as e:
        print(f"❌ {description}: {module_name} - ERROR: {e}")
        return False

def verify_deployment_readiness():
    """Comprehensive deployment readiness check"""
    print("=" * 60)
    print("🚀 Q8_0 TinyLlama Deployment Readiness Verification")
    print("=" * 60)
    
    all_checks_passed = True
    
    # 1. Check model file
    print("\n📁 Model File Check:")
    model_path = "ai_model/tinyllama-1.1b-chat-v1.0.Q8_0.gguf"
    if not check_file_exists(model_path, "Q8_0 Model File"):
        all_checks_passed = False
    
    # 2. Check core optimization files
    print("\n🔧 Core Optimization Files:")
    core_files = [
        ("apps/ai_chat/llm_handler.py", "Main LLM Handler"),
        ("apps/ai_chat/llm_handler_deployment.py", "Deployment Handler"),
        ("requirements.txt", "Dependencies"),
    ]
    
    for filepath, description in core_files:
        if not check_file_exists(filepath, description):
            all_checks_passed = False
    
    # 3. Check monitoring tools
    print("\n📊 Monitoring & Testing Tools:")
    tool_files = [
        ("monitor_memory.py", "Memory Monitor"),
        ("optimize_system.py", "System Optimizer"),
        ("test_q8_optimization.py", "Optimization Tests"),
        ("test_deployment_handler.py", "Deployment Tests"),
        ("deployment_config.py", "Deployment Config"),
    ]
    
    for filepath, description in tool_files:
        if not check_file_exists(filepath, description):
            all_checks_passed = False
    
    # 4. Check Python dependencies
    print("\n🐍 Python Dependencies:")
    dependencies = [
        ("llama_cpp", "llama-cpp-python"),
        ("psutil", "System monitoring"),
        ("django", "Django framework"),
    ]
    
    for module, description in dependencies:
        if not check_python_import(module, description):
            all_checks_passed = False
    
    # 5. Test basic functionality
    print("\n🧪 Basic Functionality Test:")
    try:
        # Test memory monitoring
        import psutil
        mem = psutil.virtual_memory()
        print(f"✅ Memory monitoring: {mem.available / (1024**3):.2f} GB available")
        
        # Test model path resolution
        if os.path.exists(model_path):
            print(f"✅ Model path resolution: Accessible")
        else:
            print(f"❌ Model path resolution: Failed")
            all_checks_passed = False
            
    except Exception as e:
        print(f"❌ Basic functionality test failed: {e}")
        all_checks_passed = False
    
    # 6. Deployment recommendations
    print("\n💡 Deployment Recommendations:")
    
    # Check available memory
    try:
        mem = psutil.virtual_memory()
        available_gb = mem.available / (1024**3)
        
        if available_gb >= 2.0:
            print(f"✅ Available memory: {available_gb:.2f} GB (sufficient)")
        else:
            print(f"⚠️  Available memory: {available_gb:.2f} GB (may need swap)")
    except:
        print("⚠️  Could not check available memory")
    
    # Check CPU cores
    try:
        cpu_count = psutil.cpu_count()
        print(f"ℹ️  CPU cores: {cpu_count} (deployment will use 1 thread)")
    except:
        print("⚠️  Could not check CPU count")
    
    # Check swap
    try:
        swap = psutil.swap_memory()
        swap_gb = swap.total / (1024**3)
        if swap_gb >= 2.0:
            print(f"✅ Swap space: {swap_gb:.2f} GB (good for deployment)")
        else:
            print(f"⚠️  Swap space: {swap_gb:.2f} GB (consider increasing)")
    except:
        print("⚠️  Could not check swap space")
    
    # 7. Final verdict
    print("\n" + "=" * 60)
    if all_checks_passed:
        print("🎉 DEPLOYMENT READY!")
        print("✅ All checks passed - Q8_0 TinyLlama ready for 1 CPU + 2GB RAM deployment")
        print("\n📋 Next Steps:")
        print("1. Copy files to production server")
        print("2. Install dependencies: pip install -r requirements.txt")
        print("3. Run: python test_q8_optimization.py")
        print("4. Update Django views to use deployment handler")
        print("5. Monitor with: python monitor_memory.py --mode monitor")
    else:
        print("❌ DEPLOYMENT NOT READY")
        print("⚠️  Some checks failed - please fix issues before deployment")
        print("\n🔧 Troubleshooting:")
        print("- Ensure all files are present")
        print("- Install missing dependencies")
        print("- Check file paths and permissions")
    
    print("=" * 60)
    return all_checks_passed

def show_deployment_summary():
    """Show deployment configuration summary"""
    print("\n📋 Deployment Configuration Summary:")
    print("- Model: TinyLlama 1.1B Chat v1.0 Q8_0")
    print("- Context Window: 1024 tokens (ultra-conservative)")
    print("- Max Response: 256 tokens")
    print("- Memory Cache: 50MB")
    print("- Threading: Single thread")
    print("- Memory Pressure Monitoring: Enabled")
    print("- Emergency Recovery: Enabled")
    print("- Expected Performance: 2-25s per response")

if __name__ == "__main__":
    try:
        ready = verify_deployment_readiness()
        show_deployment_summary()
        
        if ready:
            print("\n🚀 Ready to deploy Q8_0 TinyLlama with extreme optimizations!")
            sys.exit(0)
        else:
            print("\n⚠️  Please fix issues before deployment")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ Verification failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 