#!/usr/bin/env python3
"""
Deployment Configuration for Q8_0 TinyLlama
Simulates production constraints (1 CPU, 2GB RAM) for testing
"""

import os
import psutil
import resource
import threading

class DeploymentSimulator:
    """Simulate production constraints for testing"""
    
    def __init__(self):
        self.original_cpu_count = psutil.cpu_count()
        self.original_memory = psutil.virtual_memory().total
        self.constraints_applied = False
    
    def apply_memory_constraints(self, max_memory_gb=2.0):
        """Apply memory constraints using resource limits"""
        try:
            # Convert GB to bytes
            max_memory_bytes = int(max_memory_gb * 1024 * 1024 * 1024)
            
            # Set memory limit (soft limit)
            resource.setrlimit(resource.RLIMIT_AS, (max_memory_bytes, max_memory_bytes))
            
            print(f"✅ Applied memory constraint: {max_memory_gb} GB")
            return True
            
        except Exception as e:
            print(f"⚠️  Could not apply memory constraint: {e}")
            print("Note: Memory constraints may not work on all systems")
            return False
    
    def apply_cpu_constraints(self, max_threads=1):
        """Apply CPU constraints by limiting thread usage"""
        try:
            # Set environment variable for OpenMP (used by some libraries)
            os.environ['OMP_NUM_THREADS'] = str(max_threads)
            os.environ['MKL_NUM_THREADS'] = str(max_threads)
            os.environ['NUMEXPR_NUM_THREADS'] = str(max_threads)
            
            print(f"✅ Applied CPU constraint: {max_threads} thread(s)")
            return True
            
        except Exception as e:
            print(f"⚠️  Could not apply CPU constraint: {e}")
            return False
    
    def simulate_production_environment(self):
        """Simulate production environment constraints"""
        print("=== Simulating Production Environment (1 CPU, 2GB RAM) ===")
        
        # Apply constraints
        memory_ok = self.apply_memory_constraints(2.0)
        cpu_ok = self.apply_cpu_constraints(1)
        
        if memory_ok and cpu_ok:
            self.constraints_applied = True
            print("✅ Production constraints applied successfully")
        else:
            print("⚠️  Some constraints could not be applied")
        
        return self.constraints_applied
    
    def get_simulated_specs(self):
        """Get current system specs under constraints"""
        mem = psutil.virtual_memory()
        
        specs = {
            'cpu_count': 1 if self.constraints_applied else psutil.cpu_count(),
            'memory_total_gb': 2.0 if self.constraints_applied else mem.total / (1024**3),
            'memory_available_gb': min(2.0, mem.available / (1024**3)),
            'constraints_active': self.constraints_applied
        }
        
        return specs

# Deployment-optimized configuration
DEPLOYMENT_CONFIG = {
    # === EXTREME MEMORY OPTIMIZATION ===
    'CONTEXT_WINDOW': 1024,        # Even smaller for 2GB RAM
    'MAX_RESPONSE_TOKENS': 256,    # Smaller responses
    'CACHE_SIZE_GB': 0.05,         # Minimal cache (50MB)
    'MAX_HISTORY_MESSAGES': 20,    # Fewer history messages
    'GC_FREQUENCY': 3,             # More frequent GC
    
    # === CPU OPTIMIZATION ===
    'N_THREADS': 1,                # Single thread for 1 CPU
    'N_BATCH': 1,                  # Minimal batch size
    
    # === MEMORY PRESSURE THRESHOLDS ===
    'MEMORY_PRESSURE_LEVELS': {
        'low': 60,      # Lower thresholds for 2GB system
        'medium': 75,
        'high': 90,
        'critical': 95
    },
    
    # === MODEL PARAMETERS ===
    'MODEL_PARAMS': {
        'n_ctx': 1024,
        'n_threads': 1,
        'n_gpu_layers': 0,
        'use_mmap': True,
        'use_mlock': False,
        'n_batch': 1,
        'last_n_tokens_size': 32,  # Reduced from 64
        'numa': False,
        'offload_kqv': False,
        'flash_attn': False,
    },
    
    # === GENERATION PARAMETERS ===
    'GENERATION_PARAMS': {
        'max_tokens': 256,
        'temperature': 0.7,
        'top_p': 0.9,           # Slightly lower for efficiency
        'top_k': 30,            # Reduced from 40
        'repeat_penalty': 1.1,
        'stream': False,
    }
}

def get_deployment_config():
    """Get deployment configuration"""
    return DEPLOYMENT_CONFIG.copy()

def test_deployment_constraints():
    """Test the system under deployment constraints"""
    print("=== Testing Deployment Constraints ===")
    
    simulator = DeploymentSimulator()
    
    # Show original specs
    original_specs = {
        'cpu_count': psutil.cpu_count(),
        'memory_total_gb': psutil.virtual_memory().total / (1024**3),
        'memory_available_gb': psutil.virtual_memory().available / (1024**3)
    }
    
    print(f"Original specs:")
    print(f"  CPU cores: {original_specs['cpu_count']}")
    print(f"  Total RAM: {original_specs['memory_total_gb']:.2f} GB")
    print(f"  Available RAM: {original_specs['memory_available_gb']:.2f} GB")
    
    # Apply constraints
    simulator.simulate_production_environment()
    
    # Show constrained specs
    constrained_specs = simulator.get_simulated_specs()
    print(f"\nConstrained specs:")
    print(f"  CPU cores: {constrained_specs['cpu_count']}")
    print(f"  Total RAM: {constrained_specs['memory_total_gb']:.2f} GB")
    print(f"  Available RAM: {constrained_specs['memory_available_gb']:.2f} GB")
    print(f"  Constraints active: {constrained_specs['constraints_active']}")
    
    return simulator

if __name__ == "__main__":
    # Test deployment constraints
    simulator = test_deployment_constraints()
    
    # Show deployment config
    print(f"\n=== Deployment Configuration ===")
    config = get_deployment_config()
    for section, values in config.items():
        print(f"{section}:")
        if isinstance(values, dict):
            for key, value in values.items():
                print(f"  {key}: {value}")
        else:
            print(f"  {values}")
        print() 