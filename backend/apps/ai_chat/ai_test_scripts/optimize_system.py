#!/usr/bin/env python3
"""
System Optimization Script for Q8_0 TinyLlama
Prepares the system for maximum performance with memory constraints
"""

import os
import sys
import subprocess
import psutil
import gc
import logging

class SystemOptimizer:
    """System optimization for Q8_0 TinyLlama performance"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        logging.basicConfig(level=logging.INFO, 
                          format='%(asctime)s - %(levelname)s - %(message)s')
    
    def check_system_resources(self):
        """Check current system resources"""
        print("=== System Resource Check ===")
        
        # Memory info
        mem = psutil.virtual_memory()
        print(f"Total RAM: {mem.total / (1024**3):.2f} GB")
        print(f"Available RAM: {mem.available / (1024**3):.2f} GB")
        print(f"Memory Usage: {mem.percent:.1f}%")
        
        # Swap info
        try:
            swap = psutil.swap_memory()
            print(f"Total Swap: {swap.total / (1024**3):.2f} GB")
            print(f"Swap Usage: {swap.percent:.1f}%")
        except:
            print("Swap information not available")
        
        # CPU info
        print(f"CPU Cores: {psutil.cpu_count()}")
        print(f"CPU Usage: {psutil.cpu_percent(interval=1):.1f}%")
        
        # Disk space
        disk = psutil.disk_usage('/')
        print(f"Disk Space: {disk.free / (1024**3):.2f} GB free of {disk.total / (1024**3):.2f} GB")
        
        return {
            'memory_available_gb': mem.available / (1024**3),
            'memory_percent': mem.percent,
            'cpu_count': psutil.cpu_count(),
            'disk_free_gb': disk.free / (1024**3)
        }
    
    def optimize_python_memory(self):
        """Optimize Python memory settings"""
        print("\n=== Python Memory Optimization ===")
        
        # Force garbage collection
        collected = gc.collect()
        print(f"Garbage collection freed {collected} objects")
        
        # Set garbage collection thresholds for memory efficiency
        gc.set_threshold(700, 10, 10)  # More aggressive GC
        print("Set aggressive garbage collection thresholds")
        
        # Disable garbage collection for generation 2 (optional)
        # gc.disable()  # Uncomment if you want manual GC control
        
        return True
    
    def check_swap_configuration(self):
        """Check and suggest swap configuration"""
        print("\n=== Swap Configuration Check ===")
        
        try:
            swap = psutil.swap_memory()
            swap_gb = swap.total / (1024**3)
            
            if swap_gb < 2.0:
                print(f"⚠️  Current swap: {swap_gb:.2f} GB")
                print("RECOMMENDATION: Consider increasing swap to at least 4GB for Q8_0 model")
                print("Commands to increase swap (run as root):")
                print("  sudo fallocate -l 4G /swapfile")
                print("  sudo chmod 600 /swapfile")
                print("  sudo mkswap /swapfile")
                print("  sudo swapon /swapfile")
                print("  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab")
            else:
                print(f"✅ Swap configuration adequate: {swap_gb:.2f} GB")
                
        except Exception as e:
            print(f"Could not check swap configuration: {e}")
    
    def optimize_system_settings(self):
        """Optimize system settings for AI workload"""
        print("\n=== System Settings Optimization ===")
        
        optimizations = []
        
        # Check if we can modify system settings
        if os.geteuid() == 0:  # Running as root
            print("Running as root - can modify system settings")
            
            # Optimize swappiness for AI workload
            try:
                with open('/proc/sys/vm/swappiness', 'w') as f:
                    f.write('10')  # Reduce swappiness for better performance
                optimizations.append("Set swappiness to 10")
            except:
                pass
            
            # Optimize dirty ratio for memory efficiency
            try:
                with open('/proc/sys/vm/dirty_ratio', 'w') as f:
                    f.write('5')  # Reduce dirty ratio
                optimizations.append("Set dirty_ratio to 5")
            except:
                pass
                
        else:
            print("Not running as root - suggesting optimizations:")
            print("Run these commands as root for better performance:")
            print("  echo 10 > /proc/sys/vm/swappiness")
            print("  echo 5 > /proc/sys/vm/dirty_ratio")
        
        if optimizations:
            for opt in optimizations:
                print(f"✅ {opt}")
        
        return len(optimizations) > 0
    
    def check_llama_cpp_installation(self):
        """Check llama-cpp-python installation and optimization"""
        print("\n=== llama-cpp-python Installation Check ===")
        
        try:
            import llama_cpp
            print(f"✅ llama-cpp-python version: {llama_cpp.__version__}")
            
            # Check for optimizations
            optimizations = []
            
            # Check for BLAS support
            try:
                # This is a rough check - actual implementation may vary
                if hasattr(llama_cpp, 'LLAMA_SUPPORTS_GPU_OFFLOAD'):
                    optimizations.append("GPU offload support")
            except:
                pass
            
            if optimizations:
                print("Available optimizations:")
                for opt in optimizations:
                    print(f"  ✅ {opt}")
            else:
                print("Standard CPU-only installation detected")
                print("For better performance, consider installing with:")
                print("  CMAKE_ARGS='-DLLAMA_BLAS=ON -DLLAMA_BLAS_VENDOR=OpenBLAS' pip install llama-cpp-python --force-reinstall")
            
        except ImportError:
            print("❌ llama-cpp-python not installed")
            print("Install with: pip install llama-cpp-python")
            return False
        
        return True
    
    def estimate_model_requirements(self):
        """Estimate Q8_0 model requirements"""
        print("\n=== Q8_0 Model Requirements Estimation ===")
        
        model_size_gb = 1.17  # Q8_0 file size
        estimated_ram_gb = 3.67  # Estimated RAM requirement
        
        print(f"Model file size: {model_size_gb} GB")
        print(f"Estimated RAM requirement: {estimated_ram_gb} GB")
        
        # Check current available memory
        mem = psutil.virtual_memory()
        available_gb = mem.available / (1024**3)
        total_gb = mem.total / (1024**3)
        
        print(f"Available RAM: {available_gb:.2f} GB")
        print(f"Total RAM: {total_gb:.2f} GB")
        
        if available_gb < estimated_ram_gb:
            deficit = estimated_ram_gb - available_gb
            print(f"⚠️  Memory deficit: {deficit:.2f} GB")
            print("Recommendations:")
            print("  1. Close unnecessary applications")
            print("  2. Ensure adequate swap space")
            print("  3. Use memory optimization techniques")
            print("  4. Consider Q4_K_M quantization (requires ~3.17GB)")
        else:
            print("✅ Sufficient memory available")
        
        return available_gb >= estimated_ram_gb
    
    def create_optimization_script(self):
        """Create a system optimization script"""
        script_content = """#!/bin/bash
# Q8_0 TinyLlama System Optimization Script
# Run as root for system-level optimizations

echo "=== Q8_0 TinyLlama System Optimization ==="

# Optimize memory settings
echo "Optimizing memory settings..."
echo 10 > /proc/sys/vm/swappiness
echo 5 > /proc/sys/vm/dirty_ratio
echo 1 > /proc/sys/vm/drop_caches

# Set CPU governor to performance (if available)
if [ -f /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor ]; then
    echo "Setting CPU governor to performance..."
    echo performance > /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
fi

# Disable unnecessary services (be careful!)
# systemctl stop bluetooth
# systemctl stop cups

echo "System optimization complete!"
echo "Reboot recommended for all changes to take effect."
"""
        
        script_path = "optimize_q8_system.sh"
        with open(script_path, 'w') as f:
            f.write(script_content)
        
        os.chmod(script_path, 0o755)
        print(f"\n✅ Created optimization script: {script_path}")
        print("Run with: sudo ./optimize_q8_system.sh")
        
        return script_path
    
    def run_full_optimization(self):
        """Run complete system optimization"""
        print("=== Q8_0 TinyLlama Full System Optimization ===\n")
        
        # Check system resources
        resources = self.check_system_resources()
        
        # Python memory optimization
        self.optimize_python_memory()
        
        # Check swap
        self.check_swap_configuration()
        
        # System settings
        self.optimize_system_settings()
        
        # Check llama-cpp installation
        self.check_llama_cpp_installation()
        
        # Estimate requirements
        sufficient_memory = self.estimate_model_requirements()
        
        # Create optimization script
        self.create_optimization_script()
        
        # Summary
        print("\n=== Optimization Summary ===")
        if sufficient_memory:
            print("✅ System appears ready for Q8_0 model")
        else:
            print("⚠️  System may struggle with Q8_0 model")
            print("Consider Q4_K_M quantization or system upgrades")
        
        print("\nNext steps:")
        print("1. Run the generated optimization script as root")
        print("2. Restart your application")
        print("3. Monitor memory usage with monitor_memory.py")
        print("4. Test model loading and performance")

def main():
    """Main function"""
    optimizer = SystemOptimizer()
    optimizer.run_full_optimization()

if __name__ == "__main__":
    main() 