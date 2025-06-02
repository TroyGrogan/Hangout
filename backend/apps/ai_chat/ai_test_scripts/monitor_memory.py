#!/usr/bin/env python3
"""
Memory Monitor for Q8_0 TinyLlama Optimization
Real-time monitoring of memory usage, swap, and model performance
"""

import psutil
import time
import os
import sys
import logging
from datetime import datetime

# Add the Django project to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    import django
    django.setup()
    from apps.ai_chat.llm_handler import LlamaModel, MemoryManager
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False
    print("Django not available - running in standalone mode")

class MemoryMonitor:
    """Real-time memory monitoring for Q8_0 optimization"""
    
    def __init__(self, interval=2):
        self.interval = interval
        self.start_time = time.time()
        self.peak_memory = 0
        self.peak_swap = 0
        
    def get_memory_stats(self):
        """Get comprehensive memory statistics"""
        # Virtual memory
        vm = psutil.virtual_memory()
        
        # Swap memory
        try:
            swap = psutil.swap_memory()
            swap_used_gb = swap.used / (1024**3)
            swap_percent = swap.percent
        except:
            swap_used_gb = 0
            swap_percent = 0
        
        # Process-specific memory (if Django available)
        process_memory_mb = 0
        if DJANGO_AVAILABLE:
            try:
                process = psutil.Process(os.getpid())
                process_memory_mb = process.memory_info().rss / (1024**2)
            except:
                pass
        
        stats = {
            'timestamp': datetime.now().strftime('%H:%M:%S'),
            'memory_percent': vm.percent,
            'memory_used_gb': vm.used / (1024**3),
            'memory_available_gb': vm.available / (1024**3),
            'memory_total_gb': vm.total / (1024**3),
            'swap_percent': swap_percent,
            'swap_used_gb': swap_used_gb,
            'process_memory_mb': process_memory_mb,
            'cpu_percent': psutil.cpu_percent(interval=0.1)
        }
        
        # Track peaks
        self.peak_memory = max(self.peak_memory, stats['memory_percent'])
        self.peak_swap = max(self.peak_swap, stats['swap_percent'])
        
        return stats
    
    def print_stats(self, stats):
        """Print formatted statistics"""
        print(f"\r{stats['timestamp']} | "
              f"RAM: {stats['memory_percent']:5.1f}% "
              f"({stats['memory_used_gb']:.2f}/{stats['memory_total_gb']:.2f}GB) | "
              f"Swap: {stats['swap_percent']:5.1f}% "
              f"({stats['swap_used_gb']:.2f}GB) | "
              f"CPU: {stats['cpu_percent']:5.1f}% | "
              f"Process: {stats['process_memory_mb']:6.1f}MB", end='')
    
    def monitor_continuous(self):
        """Continuous monitoring loop"""
        print("=== Q8_0 TinyLlama Memory Monitor ===")
        print("Press Ctrl+C to stop monitoring\n")
        
        print("Time     | RAM Usage (%)      | Swap Usage (%)     | CPU (%) | Process (MB)")
        print("-" * 80)
        
        try:
            while True:
                stats = self.get_memory_stats()
                self.print_stats(stats)
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            print(f"\n\n=== Monitoring Summary ===")
            print(f"Peak Memory Usage: {self.peak_memory:.1f}%")
            print(f"Peak Swap Usage: {self.peak_swap:.1f}%")
            print(f"Monitoring Duration: {time.time() - self.start_time:.1f} seconds")
    
    def test_model_loading(self):
        """Test model loading with memory monitoring"""
        if not DJANGO_AVAILABLE:
            print("Django not available - cannot test model loading")
            return
        
        print("=== Testing Q8_0 Model Loading ===")
        
        # Before loading
        stats_before = self.get_memory_stats()
        print(f"Before loading - RAM: {stats_before['memory_percent']:.1f}%, "
              f"Available: {stats_before['memory_available_gb']:.2f}GB")
        
        # Load model
        print("Loading Q8_0 TinyLlama model...")
        start_time = time.time()
        
        try:
            model = LlamaModel()
            success = model.initialize_model()
            load_time = time.time() - start_time
            
            # After loading
            stats_after = self.get_memory_stats()
            
            if success:
                print(f"✅ Model loaded successfully in {load_time:.1f}s")
                print(f"After loading - RAM: {stats_after['memory_percent']:.1f}%, "
                      f"Available: {stats_after['memory_available_gb']:.2f}GB")
                print(f"Memory increase: {stats_after['memory_percent'] - stats_before['memory_percent']:.1f}%")
                
                # Test generation
                print("\nTesting response generation...")
                test_prompt = "Hello! Can you tell me about artificial intelligence?"
                
                gen_start = time.time()
                response = model.llm.create_completion(
                    f"<|system|>\nYou are a helpful AI assistant.</s>\n<|user|>\n{test_prompt}</s>\n<|assistant|>\n",
                    max_tokens=100,
                    temperature=0.7
                )
                gen_time = time.time() - gen_start
                
                stats_after_gen = self.get_memory_stats()
                
                print(f"✅ Response generated in {gen_time:.1f}s")
                print(f"Response length: {len(response['choices'][0]['text'])} characters")
                print(f"Memory after generation: {stats_after_gen['memory_percent']:.1f}%")
                
            else:
                print(f"❌ Model loading failed after {load_time:.1f}s")
                print(f"Memory after failed attempt: {stats_after['memory_percent']:.1f}%")
                
        except Exception as e:
            print(f"❌ Error during model testing: {str(e)}")
            stats_error = self.get_memory_stats()
            print(f"Memory after error: {stats_error['memory_percent']:.1f}%")
    
    def memory_pressure_test(self):
        """Test memory pressure detection"""
        if not DJANGO_AVAILABLE:
            print("Django not available - cannot test memory pressure")
            return
        
        print("=== Memory Pressure Test ===")
        
        try:
            pressure = MemoryManager.get_memory_pressure()
            available = MemoryManager.get_available_memory_gb()
            swap_usage = MemoryManager.monitor_swap_usage()
            
            print(f"Current memory pressure level: {pressure}")
            print(f"Available memory: {available:.2f} GB")
            print(f"Swap usage: {swap_usage:.2f} GB")
            
            # Test garbage collection
            print("\nTesting garbage collection...")
            collected = MemoryManager.force_garbage_collection()
            print(f"Garbage collection freed {collected} objects")
            
            # Memory after GC
            stats_after_gc = self.get_memory_stats()
            print(f"Memory after GC: {stats_after_gc['memory_percent']:.1f}%")
            
        except Exception as e:
            print(f"Error during memory pressure test: {str(e)}")

def main():
    """Main function with command line options"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Q8_0 TinyLlama Memory Monitor')
    parser.add_argument('--mode', choices=['monitor', 'test', 'pressure'], 
                       default='monitor', help='Monitoring mode')
    parser.add_argument('--interval', type=float, default=2.0, 
                       help='Monitoring interval in seconds')
    
    args = parser.parse_args()
    
    monitor = MemoryMonitor(interval=args.interval)
    
    if args.mode == 'monitor':
        monitor.monitor_continuous()
    elif args.mode == 'test':
        monitor.test_model_loading()
    elif args.mode == 'pressure':
        monitor.memory_pressure_test()

if __name__ == "__main__":
    main() 