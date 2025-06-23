# llm_handler_deployment.py - OPTIMIZED for 16 CPU + 61GB RAM deployment
# Production-ready version optimized for actual hardware specifications
# Key optimizations:
# 1. Multi-threaded operation (16 cores)
# 2. Large context window and response capabilities
# 3. Intelligent memory management for 61GB system
# 4. Performance-focused caching
# 5. Adaptive scaling based on actual resources
# 6. UPGRADED TO GEMMA 3 1B MODEL

import os
import threading
import logging
import traceback
import psutil
import gc
import time
from contextlib import contextmanager
import re

try:
    from llama_cpp import LlamaRAMCache
    LLAMA_CACHE_AVAILABLE = True
except ImportError:
    LlamaRAMCache = None
    LLAMA_CACHE_AVAILABLE = False

# === OPTIMIZED DEPLOYMENT CONSTRAINTS ===
CPU_THRESHOLD = 85          # Reasonable threshold for 16 cores
MEMORY_THRESHOLD = 70       # Conservative for 61GB system
CACHE_SIZE_GB = 2.0         # 2GB cache for performance

# === ADAPTIVE MEMORY CONSTRAINTS OPTIMIZED FOR 61GB SYSTEM ===
# Base parameters (optimized for Gemma 3 1B with 32K context window)
BASE_CONTEXT_WINDOW = 32000  # For Gemma 3 1B with 32K context window
BASE_MAX_RESPONSE_TOKENS = 2048

# Adaptive parameters based on available memory for Gemma 3 1B
ADAPTIVE_MEMORY_THRESHOLDS = {
    'minimal': {  # < 8GB available (emergency mode)
        'context_window': 4096,
        'max_response_tokens': 1024,
        'max_history': 3,
        'n_threads': 1
    },
    'low': {     # 8-20GB available
        'context_window': 8192,
        'max_response_tokens': 1536,
        'max_history': 12,
        'n_threads': 4
    },
    'medium': {  # 20-30GB available
        'context_window': 16000,
        'max_response_tokens': 2048,
        'max_history': 18,
        'n_threads': 6
    },
    'high': {    # > 30GB available
        'context_window': 32000,
        'max_response_tokens': 2048,
        'max_history': 24,
        'n_threads': 8
    }
}

SWAP_THRESHOLD_GB = 0.0     # No swap configured
GC_FREQUENCY = 10           # Less frequent GC for performance

# Optimized memory pressure levels for 61GB system with 8B model
MEMORY_PRESSURE_LEVELS = {
    'low': 45,      # 27GB used
    'medium': 60,   # 37GB used  
    'high': 75,     # 46GB used
    'critical': 90  # 55GB used
}

# === PATH CONFIGURATION ===
try:
    from django.conf import settings
    BASE_DIR = settings.BASE_DIR
except (ImportError, Exception):
    # Fallback: Calculate BASE_DIR relative to this file
    # This file is in backend/apps/ai_chat/llm_handler_deployment.py
    # So BASE_DIR should be backend/
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)
if not logger.hasHandlers():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# === OPTIMIZED MEMORY MANAGER ===
class OptimizedMemoryManager:
    """Intelligent memory management optimized for 61GB system"""
    
    @staticmethod
    def get_memory_pressure():
        """Get memory pressure with optimized thresholds for 61GB system"""
        mem = psutil.virtual_memory()
        percent = mem.percent
        
        if percent >= MEMORY_PRESSURE_LEVELS['critical']:
            return 'critical'
        elif percent >= MEMORY_PRESSURE_LEVELS['high']:
            return 'high'
        elif percent >= MEMORY_PRESSURE_LEVELS['medium']:
            return 'medium'
        else:
            return 'low'
    
    @staticmethod
    def emergency_memory_recovery():
        """Intelligent memory recovery for high-memory system"""
        logger.warning("Performing memory cleanup")
        
        # Single GC pass (system has plenty of memory)
        collected = gc.collect()
        logger.debug(f"GC freed {collected} objects")
        
        return True
    
    @staticmethod
    def get_available_memory_gb():
        """Get available memory in GB"""
        mem = psutil.virtual_memory()
        return mem.available / (1024**3)
    
    @staticmethod
    def monitor_swap_usage():
        """Monitor swap usage (should be 0 for this system)"""
        try:
            swap = psutil.swap_memory()
            return swap.used / (1024**3)
        except:
            return 0
    
    @staticmethod
    def check_memory_emergency():
        """Check if we're in memory emergency (rare with 61GB)"""
        pressure = OptimizedMemoryManager.get_memory_pressure()
        available = OptimizedMemoryManager.get_available_memory_gb()
        
        # Emergency only if less than 2GB available or critical pressure
        if pressure == 'critical' or available < 2.0:
            return True
        return False

    @staticmethod
    def get_adaptive_memory_tier():
        """Get memory tier for adaptive parameter selection (updated for 8B model)"""
        # Removed forced low resource mode check: LOW_RESOURCE env variable is not used anymore

        # Force minimal mode if physical CPU count is 1 or less
        physical_cores = psutil.cpu_count(logical=False)
        if physical_cores is not None and physical_cores <= 1:
            return 'minimal'

        # Force minimal mode if total system memory is below 4GB
        total_gb = psutil.virtual_memory().total / (1024 ** 3)
        if total_gb < 4:
            return 'minimal'

        available_gb = OptimizedMemoryManager.get_available_memory_gb()
        pressure = OptimizedMemoryManager.get_memory_pressure()
        
        # Adjusted thresholds for larger 8B model, use minimal if in emergency
        if pressure == 'critical' or available_gb < 8:
            return 'minimal'
        elif pressure == 'high' or available_gb < 20:
            return 'low'
        elif pressure == 'medium' or available_gb < 30:
            return 'medium'
        else:
            return 'high'
    
    @staticmethod
    def get_adaptive_parameters():
        """Get adaptive parameters based on current memory situation"""
        tier = OptimizedMemoryManager.get_adaptive_memory_tier()
        params = ADAPTIVE_MEMORY_THRESHOLDS[tier].copy()
        
        # Add tier info for logging
        params['tier'] = tier
        params['available_gb'] = OptimizedMemoryManager.get_available_memory_gb()
        
        return params
    
    @staticmethod
    def log_memory_status():
        """Log current memory status for monitoring"""
        mem = psutil.virtual_memory()
        available_gb = mem.available / (1024**3)
        used_gb = mem.used / (1024**3)
        pressure = OptimizedMemoryManager.get_memory_pressure()
        tier = OptimizedMemoryManager.get_adaptive_memory_tier()
        
        logger.info(f"MEMORY: {used_gb:.1f}GB used, {available_gb:.1f}GB available, "
                   f"pressure={pressure}, tier={tier}")
        
        # Only warn if actually low for this system
        if available_gb < 5:
            logger.warning(f"LOW MEMORY: Only {available_gb:.2f}GB available!")
        
        return {
            'used_gb': used_gb,
            'available_gb': available_gb,
            'pressure': pressure,
            'tier': tier
        }

@contextmanager
def optimized_memory_operation():
    """Optimized memory operation context for high-memory system"""
    # Light pre-operation check
    if OptimizedMemoryManager.check_memory_emergency():
        OptimizedMemoryManager.emergency_memory_recovery()
    
    try:
        yield
    finally:
        # Minimal post-operation cleanup
        pass

# === OPTIMIZED LLAMA MODEL ===
class OptimizedLlamaModel:
    """High-performance LLM optimized for 16-core, 61GB system with Gemma 3 1B"""
    _instance = None
    _lock = threading.Lock()
    _operation_count = 0

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(OptimizedLlamaModel, cls).__new__(cls)
                    cls._instance._initialize_attributes()
        return cls._instance

    def _initialize_attributes(self):
        """Initialize with optimized memory-aware settings"""
        self.llm = None
        self.cache = None
        self.conversation_history = {}
        
        # Use adaptive parameters based on available memory
        adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
        self.context_window = adaptive_params['context_window']
        self.max_response_tokens = adaptive_params['max_response_tokens']
        self.max_prompt_tokens = self.context_window - self.max_response_tokens
        self.n_threads = adaptive_params['n_threads']
        
        self._initialized = False
        self._last_gc = time.time()
        self._last_memory_check = 0
        
        # === SYSTEM PROMPT FOR GEMMA 3 ===
        # self.system_prompt = "You are Gemma, a lightweight yet state-of-the-art AI assistant built with Gemma 3. Provide detailed, accurate, and concise responses to help users."
        self.system_prompt = """You are Gemma, an exceptionally helpful, knowledgeable, and honest AI assistant. You provide detailed, accurate, and thoughtful responses to help users with a wide variety of topics and questions. You are creative, curious, and always strive to be maximally helpful while being truthful and harmless."""

        logger.info(f"OptimizedLlamaModel initialized: context={self.context_window}, "
                   f"max_tokens={self.max_response_tokens}, threads={self.n_threads}, tier={adaptive_params['tier']}")

    def _check_and_adjust_parameters(self):
        """Dynamically adjust parameters based on current memory"""
        current_time = time.time()
        
        # Check memory every 60 seconds (less frequent for stable system)
        if (current_time - self._last_memory_check > 60 or 
            OptimizedMemoryManager.get_memory_pressure() in ['high', 'critical']):
            
            adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
            
            # Only adjust if parameters need to change significantly
            new_context = adaptive_params['context_window']
            new_max_tokens = adaptive_params['max_response_tokens']
            new_threads = adaptive_params['n_threads']
            
            if (abs(new_context - self.context_window) > 512 or 
                abs(new_max_tokens - self.max_response_tokens) > 256 or
                new_threads != self.n_threads):
                
                self.context_window = new_context
                self.max_response_tokens = new_max_tokens
                self.max_prompt_tokens = self.context_window - self.max_response_tokens
                self.n_threads = new_threads
                
                logger.info(f"ADAPTIVE: Adjusted to context={self.context_window}, "
                           f"max_tokens={self.max_response_tokens}, threads={self.n_threads}, tier={adaptive_params['tier']}")
            
            self._last_memory_check = current_time

    def _post_process_response(self, response):
        """Post-processing for Gemma responses"""
        if not response:
            return response
            
        # Remove any remaining special tokens from the new format
        response = response.replace("<|start_header_id|>", "").replace("<|end_header_id|>", "")
        response = response.replace("<|begin_of_text|>", "").replace("<|eot_id|>", "")
        
        # Remove legacy tokens that might still appear
        response = response.replace("<|assistant|>", "").replace("<|user|>", "").replace("<|system|>", "")
        response = response.replace("</s>", "").strip()
        
        return response

    def _optimized_garbage_collect(self):
        """Perform memory-conscious garbage collection for high-performance system"""
        try:
            collected = gc.collect()
            if collected > 0:
                logger.debug(f"Garbage collected {collected} objects")
        except Exception as e:
            logger.warning(f"Garbage collection failed: {str(e)}")

    def initialize_model(self):
        """Initialize model with optimized parameters for 16-core, 61GB system"""
        if self._initialized:
            return self.llm is not None

        with self._lock:
            if self._initialized:
                return self.llm is not None

            logger.info("Initializing gemma-3-1b-it-Q8_0 for HIGH-PERFORMANCE DEPLOYMENT (16 CPU, 61GB RAM)")
            self._initialized = True

            # Log memory status before loading
            memory_status = OptimizedMemoryManager.log_memory_status()
            adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
            
            logger.info(f"Loading gemma-3-1b-it-Q8_0 model with tier='{adaptive_params['tier']}', "
                       f"context={self.context_window}, max_tokens={self.max_response_tokens}, threads={self.n_threads}")
            
            # Check memory availability for 8B model
            if memory_status['available_gb'] < 8.0:
                logger.warning(f"Low memory for 8B model: {memory_status['available_gb']:.2f}GB available")

            model_filename = "gemma-3-1b-it-Q8_0.gguf"
            model_path = os.path.join(BASE_DIR, "ai_model", model_filename)
            
            if not os.path.exists(model_path):
                logger.error(f"Gemma model file not found: {model_path}")
                logger.info("Please download the model from: https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF?show_file_info=gemma-3-1b-it-Q8_0.gguf")
                return False

            with optimized_memory_operation():
                try:
                    # Optimized cache size based on memory tier for 8B model
                    cache_gb = CACHE_SIZE_GB
                    if adaptive_params['tier'] == 'minimal':
                        cache_gb = 0.0   # disable cache for minimal tier to save memory
                    elif adaptive_params['tier'] == 'low':
                        cache_gb = 1.5   # 1.5GB cache
                    elif adaptive_params['tier'] == 'medium':
                        cache_gb = 2.0   # 2GB cache
                    else:
                        cache_gb = 3.0   # 3GB cache for high tier
                    
                    # High-performance cache for 8B model
                    if LLAMA_CACHE_AVAILABLE and cache_gb > 0:
                        cache_bytes = int(cache_gb * 1024 * 1024 * 1024)
                        self.cache = LlamaRAMCache(capacity_bytes=cache_bytes)
                        logger.info(f"High-performance cache: {cache_gb:.1f} GB")

                    from llama_cpp import Llama
                    
                    # Set reduced batch size for low-resource minimal tier
                    n_batch_value = 128 if adaptive_params['tier'] == 'minimal' else 512
                    self.llm = Llama(
                        model_path=model_path,
                        n_ctx=self.context_window,        # Context window adjusted for low memory
                        n_threads=self.n_threads,         # Reduced threads for 1 CPU
                        n_gpu_layers=0,                   # CPU only
                        verbose=False,
                        cache=self.cache,
                        
                        # === PERFORMANCE OPTIMIZATION FOR 8B MODEL ===
                        use_mmap=True,                    # Memory-map file
                        use_mlock=True,                   # Lock memory for performance
                        n_batch=n_batch_value,            # Adjusted batch size for minimal tier
                        last_n_tokens_size=256,           # Token buffer size
                        
                        # === HIGH-PERFORMANCE SPECIFIC ===
                        numa=False,                       # Disable NUMA awareness on non-Linux
                        offload_kqv=False,               # Keep in main memory
                        flash_attn=False,                # Disable for compatibility
                        
                        # === OPTIMIZED SETTINGS FOR GEMMA ===
                        rope_scaling_type=0,             # No rope scaling
                        rope_freq_base=10000.0,          # Default rope freq
                    )
                    
                    logger.info(f"Gemma 3 1B loaded! Tier: {adaptive_params['tier']}, Threads: {self.n_threads}")
                    
                    # Performance test with new prompt format
                    start_time = time.time()
                    test_response = self.llm.create_completion(
                        "<s> <start_of_turn>user Hi<end_of_turn> <start_of_turn>model ", 
                        max_tokens=10
                    )
                    test_time = time.time() - start_time
                    logger.info(f"Gemma performance test: {test_time:.2f}s for 10 tokens")
                    
                    # Final memory check
                    final_memory = OptimizedMemoryManager.log_memory_status()
                    logger.info(f"Post-load memory: {final_memory['available_gb']:.2f}GB available")
                    
                    return True
                    
                except Exception as e:
                    logger.error(f"Gemma 3 1B model loading failed: {str(e)}")
                    self.llm = None
                    return False

    def is_initialized(self):
        """Check initialization status"""
        return self.llm is not None

    def count_tokens(self, text):
        """Optimized token counting"""
        if not text:
            return 0
        
        # Use simple estimation for speed
        return len(text.split()) * 1.2  # Conservative estimate

    def add_to_history(self, chat_session_id, role, content):
        """Optimized history management for high-memory system"""
        if not chat_session_id:
            return
            
        if chat_session_id not in self.conversation_history:
            self.conversation_history[chat_session_id] = []
        
        self.conversation_history[chat_session_id].append({
            "role": role,
            "content": content
        })
        
        # Get adaptive parameters for history management
        adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
        max_history = adaptive_params['max_history']
        
        # Only trim if we have excessive history
        if len(self.conversation_history[chat_session_id]) > max_history * 2:
            self.conversation_history[chat_session_id] = \
                self.conversation_history[chat_session_id][-max_history:]
        
        # Less frequent garbage collection
        self._optimized_garbage_collect()

    def get_conversation_history(self, chat_session_id):
        """Get history with optimized memory management"""
        history = self.conversation_history.get(chat_session_id, [])
        
        # Get adaptive parameters for history management
        adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
        max_history = adaptive_params['max_history']
        
        # Return more history for better context
        return history[-max_history:] if len(history) > max_history else history

    def build_prompt_with_history(self, chat_session_id, user_input):
        """Build prompt using Gemma chat template."""
        try:
            messages = []
            history = self.get_conversation_history(chat_session_id)
            # Prepend system message if not present
            if not history or history[0]["role"] != "system":
                messages.append({"role": "system", "content": self.system_prompt})
            messages.extend(history)
            messages.append({"role": "user", "content": user_input})
            
            bos_token = "<s>"
            prompt = bos_token + " "
            
            if messages and messages[0]["role"] == "system":
                first_user_prefix = messages[0]["content"].strip() + " "
                loop_messages = messages[1:]
            else:
                first_user_prefix = ""
                loop_messages = messages
            
            for i, message in enumerate(loop_messages):
                # Expect roles to alternate: user then assistant
                role = "model" if message["role"] == "assistant" else message["role"]
                if i == 0:
                    prompt += f"<start_of_turn>{role} {first_user_prefix}{message['content'].strip()}<end_of_turn> "
                else:
                    prompt += f"<start_of_turn>{role} {message['content'].strip()}<end_of_turn> "
            
            # Append generation prompt for the model's turn
            prompt += "<start_of_turn>model "
            
            logger.debug(f"Built prompt length: {len(prompt)} chars")
            return prompt
        except Exception as e:
            logger.error(f"Error building prompt: {str(e)}")
            # Fallback prompt
            return f"<s> <start_of_turn>system {self.system_prompt}<end_of_turn> <start_of_turn>user {user_input}<end_of_turn> <start_of_turn>model "

    def _enhanced_post_process_response(self, response):
        """Post-process response for Gemma - remove turn markers."""
        if not response:
            return response
        response = response.replace("<start_of_turn>", "").replace("<end_of_turn>", "")
        return response.strip()

# === OPTIMIZED GENERATION FUNCTION ===
def generate_deployment_response(prompt, chat_session=None, user=None):
    """High-performance response generation optimized for 16-core, 61GB system with Gemma 3 1B"""
    try:
        model = OptimizedLlamaModel()
        
        # Log memory status for monitoring
        memory_status = OptimizedMemoryManager.log_memory_status()
        
        # Light memory check (emergency rare with 61GB)
        if OptimizedMemoryManager.check_memory_emergency():
            OptimizedMemoryManager.emergency_memory_recovery()
            logger.warning("Memory recovery performed")
        
        # Check and adjust parameters dynamically
        model._check_and_adjust_parameters()
        
        # Initialize if needed
        if not model.is_initialized():
            logger.info("Initializing high-performance model...")
            
            with optimized_memory_operation():
                success = model.initialize_model()
            
            if not success:
                logger.error("HIGH-PERFORMANCE: Model initialization failed")
                return "I'm currently unavailable due to system constraints. Please try again shortly."
        
        # Generate response with optimized parameters
        with optimized_memory_operation():
            if chat_session:
                model.add_to_history(chat_session, "user", prompt)
                prompt_with_history = model.build_prompt_with_history(chat_session, prompt)
            else:
                # Enhanced system message for standalone queries with OpenChat and new format
                # system_msg = "You are Gemma, a lightweight yet state-of-the-art AI assistant built with Gemma 3. Provide detailed, accurate, and concise responses to help users."
                system_msg = "You are Gemma, an exceptionally helpful, knowledgeable, and honest AI assistant. You provide detailed, accurate, and thoughtful responses to help users with a wide variety of topics and questions. You are creative, curious, and always strive to be maximally helpful while being truthful and harmless."
                prompt_with_history = f"<s> <start_of_turn>system {system_msg}<end_of_turn> <start_of_turn>user {prompt.strip()}<end_of_turn> <start_of_turn>model "
            
            try:
                # Get current adaptive parameters for generation
                adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
                
                # Use full token budget for high-performance system
                effective_max_tokens = model.max_response_tokens

                # Optimized temperature for Gemma 3 1B
                temperature = 0.7  # Higher for more creative responses from 8B model

                # Tier-based generation parameters optimized for Gemma
                if adaptive_params['tier'] == 'minimal':
                    top_p = 0.85
                    top_k = 40
                elif adaptive_params['tier'] == 'low':
                    top_p = 0.90
                    top_k = 50
                elif adaptive_params['tier'] == 'medium':
                    top_p = 0.92
                    top_k = 60
                else:  # high tier
                    top_p = 0.95
                    top_k = 80
                
                # High-performance generation parameters
                generation_params = {
                    'prompt': prompt_with_history,
                    'max_tokens': effective_max_tokens,
                    'stop': ["<end_of_turn>"],
                    'temperature': temperature,
                    'top_p': top_p,
                    'top_k': top_k,
                    'repeat_penalty': 1.15,  # Slightly lower for more natural flow
                    'frequency_penalty': 0.0,
                    'presence_penalty': 0.0,
                    'stream': False,
                    'echo': False,
                }
                
                response = model.llm.create_completion(**generation_params)
                
                ai_response = response['choices'][0]['text'].strip()
                
                # Enhanced post-processing with new format
                ai_response = model._enhanced_post_process_response(ai_response)
                
                # Log final response stats
                logger.debug(f"Final response length: {len(ai_response)} chars")
                
                if chat_session:
                    model.add_to_history(chat_session, "assistant", ai_response)
                
                # Perform optimized garbage collection
                model._optimized_garbage_collect()
                
                return ai_response
                
            except Exception as e:
                logger.error(f"Generation error: {str(e)}")
                return f"I apologize, but I encountered an error while processing your request. Please try again."
                
    except Exception as e:
        logger.error(f"HIGH-PERFORMANCE: Deployment generation failed: {str(e)}")
        return "I'm currently experiencing technical difficulties. Please try again shortly."

# === OPTIMIZED UTILITIES ===
def clear_deployment_history(chat_session_id):
    """Clear history with optimized cleanup"""
    try:
        model = OptimizedLlamaModel()
        if chat_session_id in model.conversation_history:
            del model.conversation_history[chat_session_id]
            return True
        return False
    except Exception as e:
        logger.error(f"Error clearing deployment history: {str(e)}")
        return False

def get_deployment_status():
    """Get comprehensive deployment system status optimized for high-performance system"""
    try:
        memory_status = OptimizedMemoryManager.log_memory_status()
        adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
        
        model = OptimizedLlamaModel()
        model_loaded = model.is_initialized()
        
        # Get current model parameters if loaded
        current_params = {}
        if model_loaded:
            current_params = {
                'context_window': model.context_window,
                'max_response_tokens': model.max_response_tokens,
                'max_prompt_tokens': model.max_prompt_tokens,
                'n_threads': model.n_threads
            }
        
        # CPU information
        cpu_info = {
            'cpu_count': psutil.cpu_count(),
            'cpu_percent': psutil.cpu_percent(interval=1),
            'load_avg': os.getloadavg() if hasattr(os, 'getloadavg') else None
        }
        
        return {
            'system_type': 'high_performance',
            'model_format': 'GPT4_Correct',
            'memory_pressure': memory_status['pressure'],
            'memory_tier': memory_status['tier'],
            'available_memory_gb': memory_status['available_gb'],
            'used_memory_gb': memory_status['used_gb'],
            'total_memory_gb': psutil.virtual_memory().total / (1024**3),
            'swap_usage_gb': OptimizedMemoryManager.monitor_swap_usage(),
            'model_loaded': model_loaded,
            'emergency_mode': OptimizedMemoryManager.check_memory_emergency(),
            'adaptive_parameters': adaptive_params,
            'current_model_parameters': current_params,
            'memory_thresholds': ADAPTIVE_MEMORY_THRESHOLDS,
            'cpu_info': cpu_info,
            'cache_size_gb': CACHE_SIZE_GB
        }
    except Exception as e:
        logger.error(f"Error getting deployment status: {str(e)}")
        return {'error': str(e)}

# === STANDALONE TESTING ===
if __name__ == "__main__":
    print("=== GEMMA 3 1B HIGH-PERFORMANCE MODEL TEST ===")
    
    # Test deployment response
    test_prompt = "Hello! How are you today? Can you tell me about your capabilities as Gemma?"
    print(f"Testing: '{test_prompt}'")
    
    response = generate_deployment_response(test_prompt, chat_session="gemma_test")
    print(f"Response: {response}")
    
    # Check status
    status = get_deployment_status()
    print(f"Status: {status}")
    
    print("=== GEMMA 3 1B HIGH-PERFORMANCE TEST COMPLETE ===")

# Global initialization status tracking (for compatibility with views.py)
initialization_status = {
    "initialized": False,
    "initializing": False,
    "error": None,
    "timestamp": None
}

def generate_chat_response(prompt, chat_session=None, user=None, model_mode="default"):
    """Compatibility wrapper for generate_deployment_response"""
    return generate_deployment_response(prompt, chat_session, user)

def clear_chat_history(chat_session_id):
    """Compatibility wrapper for clear_deployment_history"""
    return clear_deployment_history(chat_session_id)

def initialize_model():
    """Initialize the optimized model with status tracking"""
    global initialization_status
    
    if initialization_status["initialized"]:
        logger.info("Model already initialized")
        return True
    
    if initialization_status["initializing"]:
        logger.info("Model initialization already in progress")
        return False
    
    initialization_status["initializing"] = True
    initialization_status["error"] = None
    initialization_status["timestamp"] = time.time()
    
    try:
        model = OptimizedLlamaModel()
        result = model.initialize_model()
        
        initialization_status["initialized"] = result
        initialization_status["initializing"] = False
        
        if not result:
            initialization_status["error"] = "Model initialization failed"
        
        return result
        
    except Exception as e:
        logger.error(f"Error during model initialization: {str(e)}")
        initialization_status["error"] = str(e)
        initialization_status["initializing"] = False
        initialization_status["initialized"] = False
        return False

def is_model_initialized():
    """Check if the optimized model is initialized"""
    try:
        model = OptimizedLlamaModel()
        return model.is_initialized()
    except:
        return False

def generate_new_session_id():
    """Generate a new unique session ID"""
    import uuid
    return str(uuid.uuid4())

def load_history_from_database(user, chat_session_id):
    """Load chat history from database into optimized model memory"""
    try:
        from .models import Chat
        
        model = OptimizedLlamaModel()
        
        # Clear existing memory history for this session
        if chat_session_id in model.conversation_history:
            del model.conversation_history[chat_session_id]
        
        # Load chats from database
        chats = Chat.objects.filter(
            user=user,
            chat_session=chat_session_id
        ).order_by('created_at')
        
        if not chats.exists():
            return False
        
        # Add each message to history
        for chat in chats:
            if chat.message:
                model.add_to_history(chat_session_id, "user", chat.message)
            if chat.response:
                model.add_to_history(chat_session_id, "assistant", chat.response)
        
        logger.debug(f"Loaded {chats.count()} messages from database for session {chat_session_id}")
        return len(chats) > 0
        
    except Exception as e:
        logger.error(f"Error loading history from database: {str(e)}")
        return False 