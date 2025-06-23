# llm_handler_deployment.py - OPTIMIZED for LOW-RESOURCE (1 CPU + 2GB RAM) deployment
# Production-ready version optimized for low-spec hardware
# Key optimizations:
# 1. Single-threaded operation (1 core)
# 2. Reduced context window and response capabilities for low memory
# 3. Intelligent memory management for 2GB system
# 4. Disabled caching to conserve memory
# 5. Adaptive scaling based on actual limited resources
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

# === OPTIMIZED DEPLOYMENT CONSTRAINTS FOR 1 CPU / 2GB RAM ===
CPU_THRESHOLD = 90          # Higher threshold for single core
MEMORY_THRESHOLD = 85       # Higher threshold for 2GB system
CACHE_SIZE_GB = 0.0         # 0GB cache to conserve memory
SIMULATED_TOTAL_RAM_GB = 2.0 # Hard cap for memory calculations to simulate a 2GB environment

# === ADAPTIVE MEMORY CONSTRAINTS OPTIMIZED FOR 2GB SYSTEM ===
# Base parameters re-balanced for response completeness.
BASE_CONTEXT_WINDOW = 4096  # Reduced base context
BASE_MAX_RESPONSE_TOKENS = 1536 # Increased base response tokens to prioritize complete answers

# Adaptive parameters based on available memory for Gemma 3 1B on a 2GB system.
# These have been re-balanced to prioritize response completeness over long-term context.
ADAPTIVE_MEMORY_THRESHOLDS = {
    'minimal': {  # < 250MB available (emergency mode)
        'context_window': 1536,
        'max_response_tokens': 768, # Increased
        'max_history': 2,
        'n_threads': 1
    },
    'low': {     # 250-500MB available
        'context_window': 2560,
        'max_response_tokens': 1280, # Increased
        'max_history': 4,
        'n_threads': 1
    },
    'medium': {  # 500-750MB available
        'context_window': 3072,
        'max_response_tokens': 1536, # Increased
        'max_history': 6,
        'n_threads': 1
    },
    'high': {    # > 750MB available
        'context_window': 4096,
        'max_response_tokens': 2048, # Increased
        'max_history': 8,
        'n_threads': 1
    }
}

SWAP_THRESHOLD_GB = 0.0     # No swap configured
GC_FREQUENCY = 5           # More frequent GC for low memory

# Optimized memory pressure levels for 2GB system
MEMORY_PRESSURE_LEVELS = {
    'low': 50,      # 1.0GB used
    'medium': 70,   # 1.4GB used  
    'high': 85,     # 1.7GB used
    'critical': 95  # 1.9GB used
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
    """Intelligent memory management optimized for 2GB system"""
    
    @staticmethod
    def get_memory_pressure():
        """Get memory pressure, simulating a 2GB system if on a larger machine."""
        mem = psutil.virtual_memory()
        total_physical_gb = mem.total / (1024**3)

        # If running on a machine with more RAM, calculate pressure against the simulated total
        if total_physical_gb > SIMULATED_TOTAL_RAM_GB:
            used_physical_gb = mem.used / (1024**3)
            # Cap "used" memory at simulated total for a realistic percentage
            used_for_calc = min(used_physical_gb, SIMULATED_TOTAL_RAM_GB)
            percent = (used_for_calc / SIMULATED_TOTAL_RAM_GB) * 100 if SIMULATED_TOTAL_RAM_GB > 0 else 100
        else:
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
        """Intelligent memory recovery for low-memory system"""
        logger.warning("Performing memory cleanup")
        
        # Single GC pass (system has plenty of memory)
        collected = gc.collect()
        logger.debug(f"GC freed {collected} objects")
        
        return True
    
    @staticmethod
    def get_available_memory_gb():
        """Get available memory in GB, simulating a 2GB system if on a larger machine."""
        mem = psutil.virtual_memory()
        total_physical_gb = mem.total / (1024**3)

        # If running on a machine with more RAM, calculate available within the simulated cap
        if total_physical_gb > SIMULATED_TOTAL_RAM_GB:
            used_physical_gb = mem.used / (1024**3)
            simulated_available_gb = max(0, SIMULATED_TOTAL_RAM_GB - used_physical_gb)
            return simulated_available_gb
        else:
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
        """Check if we're in memory emergency (more likely with 2GB)"""
        pressure = OptimizedMemoryManager.get_memory_pressure()
        available = OptimizedMemoryManager.get_available_memory_gb()
        
        # Emergency if less than 150MB available or critical pressure
        if pressure == 'critical' or available < 0.15:
            return True
        return False

    @staticmethod
    def get_adaptive_memory_tier():
        """Get memory tier for adaptive parameter selection (for low-resource environment)"""
        # Force minimal mode if physical CPU count is 1 or less
        physical_cores = psutil.cpu_count(logical=False)
        if physical_cores is not None and physical_cores <= 1:
            # On single-core, base tier on memory not just force minimal
            pass

        # Force minimal mode if total system memory is below 4GB
        total_gb = psutil.virtual_memory().total / (1024 ** 3)
        if total_gb < 4:
             # On low-mem system, base tier on memory not just force minimal
            pass
        
        available_mb = OptimizedMemoryManager.get_available_memory_gb() * 1024
        
        # Thresholds for 2GB system
        if available_mb < 250:
            return 'minimal'
        elif available_mb < 500:
            return 'low'
        elif available_mb < 750:
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
        
        logger.info(f"MEMORY: {used_gb:.2f}GB used, {available_gb:.2f}GB available, "
                   f"pressure={pressure}, tier={tier}")
        
        # Warn if memory is low
        if available_gb < 0.5:
            logger.warning(f"LOW MEMORY: Only {available_gb:.2f}GB available!")
        
        return {
            'used_gb': used_gb,
            'available_gb': available_gb,
            'pressure': pressure,
            'tier': tier
        }

@contextmanager
def optimized_memory_operation():
    """Optimized memory operation context for low-memory system"""
    # More aggressive pre-operation check
    if OptimizedMemoryManager.check_memory_emergency():
        OptimizedMemoryManager.emergency_memory_recovery()
    
    try:
        yield
    finally:
        # Minimal post-operation cleanup
        pass

# === OPTIMIZED LLAMA MODEL ===
class OptimizedLlamaModel:
    """Low-resource LLM optimized for 1-core, 2GB system with Gemma 3 1B"""
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
        # Per official Google guidance, system prompts are included in the first user turn.
        self.system_prompt = "You are Gemma, a helpful and honest AI assistant. You provide concise and accurate responses to help users."

        logger.info(f"OptimizedLlamaModel initialized: context={self.context_window}, "
                   f"max_tokens={self.max_response_tokens}, threads={self.n_threads}, tier={adaptive_params['tier']}")

    def _check_and_adjust_parameters(self):
        """Dynamically adjust parameters based on current memory"""
        current_time = time.time()
        
        # Check memory every 15 seconds (more frequent for volatile system)
        if (current_time - self._last_memory_check > 15 or 
            OptimizedMemoryManager.get_memory_pressure() in ['high', 'critical']):
            
            adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
            
            # Only adjust if parameters need to change significantly
            new_context = adaptive_params['context_window']
            new_max_tokens = adaptive_params['max_response_tokens']
            new_threads = adaptive_params['n_threads']
            
            if (abs(new_context - self.context_window) > 256 or 
                abs(new_max_tokens - self.max_response_tokens) > 128 or
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
            
        # Gemma 3 response cleanup
        response = response.replace("<end_of_turn>", "").strip()
        
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
        """Initialize model with optimized parameters for 1-core, 2GB system"""
        if self._initialized:
            return self.llm is not None

        with self._lock:
            if self._initialized:
                return self.llm is not None

            logger.info("Initializing gemma-3-1b-it-Q8_0 for LOW-RESOURCE DEPLOYMENT (1 CPU, 2GB RAM)")
            self._initialized = True

            # Log memory status before loading
            memory_status = OptimizedMemoryManager.log_memory_status()
            adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
            
            logger.info(f"Loading gemma-3-1b-it-Q8_0 model with tier='{adaptive_params['tier']}', "
                       f"context={self.context_window}, max_tokens={self.max_response_tokens}, threads={self.n_threads}")
            
            # Check memory availability for 1B model
            if memory_status['available_gb'] < 1.2:
                logger.warning(f"Very low memory for 1B model: {memory_status['available_gb']:.2f}GB available")

            model_filename = "gemma-3-1b-it-Q8_0.gguf"
            model_path = os.path.join(BASE_DIR, "ai_model", model_filename)
            
            if not os.path.exists(model_path):
                logger.error(f"Gemma model file not found: {model_path}")
                logger.info("Please download the model from: https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF?show_file_info=gemma-3-1b-it-Q8_0.gguf")
                return False

            with optimized_memory_operation():
                try:
                    # Cache is disabled for low-resource environment
                    self.cache = None
                    
                    from llama_cpp import Llama
                    
                    # Set reduced batch size for low-resource minimal tier
                    n_batch_value = 64 if adaptive_params['tier'] == 'minimal' else 128
                    self.llm = Llama(
                        model_path=model_path,
                        n_ctx=self.context_window,        # Context window adjusted for low memory
                        n_threads=self.n_threads,         # Reduced threads for 1 CPU
                        n_gpu_layers=0,                   # CPU only
                        verbose=False,
                        cache=self.cache,
                        
                        # === PERFORMANCE OPTIMIZATION FOR 1B MODEL on LOW-RESOURCE ===
                        use_mmap=True,                    # Memory-map file
                        use_mlock=False,                  # DO NOT Lock memory for low-ram systems
                        n_batch=n_batch_value,            # Adjusted batch size for minimal tier
                        last_n_tokens_size=128,           # Smaller token buffer size
                        
                        # === LOW-RESOURCE SPECIFIC ===
                        numa=False,                       # Disable NUMA awareness
                        offload_kqv=True,                 # Offload key/query vectors to save RAM
                        flash_attn=False,                 # Disable for compatibility
                        
                        # === OPTIMIZED SETTINGS FOR GEMMA ===
                        rope_scaling_type=0,             # No rope scaling
                        rope_freq_base=10000.0,          # Default rope freq
                    )
                    
                    logger.info(f"Gemma 3 1B loaded! Tier: {adaptive_params['tier']}, Threads: {self.n_threads}")
                    
                    # Performance test with new prompt format
                    start_time = time.time()
                    test_response = self.llm.create_completion(
                        "<start_of_turn>user\nHello!<end_of_turn>\n<start_of_turn>model", 
                        max_tokens=10,
                        stop=["<end_of_turn>"]
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

    def build_prompt_with_history(self, chat_session_id):
        """Build prompt using the official Gemma 3 chat template."""
        try:
            history = self.get_conversation_history(chat_session_id)
            prompt_parts = []

            # Start with the beginning-of-string token
            prompt_parts.append("<bos>")

            for i, message in enumerate(history):
                role = "model" if message["role"] == "assistant" else message["role"]
                content = message['content'].strip()

                # Prepend system prompt to the first user message
                if i == 0 and role == 'user':
                    content = f"{self.system_prompt}\n\n{content}"
                
                prompt_parts.append(f"<start_of_turn>{role}\n{content}<end_of_turn>")

            # Add the generation prompt for the model's turn
            prompt_parts.append("<start_of_turn>model")

            final_prompt = "\n".join(prompt_parts)
            logger.debug(f"Built prompt length: {len(final_prompt)} chars")
            return final_prompt
            
        except Exception as e:
            logger.error(f"Error building prompt: {traceback.format_exc()}")
            # Fallback prompt that also follows the template
            user_input = history[-1]['content'] if history else ""
            return f"<bos>\n<start_of_turn>user\n{self.system_prompt}\n\n{user_input.strip()}<end_of_turn>\n<start_of_turn>model"

    def _enhanced_post_process_response(self, response):
        """Post-process response for Gemma - remove turn markers."""
        if not response:
            return response
        response = response.replace("<start_of_turn>", "").replace("<end_of_turn>", "")
        return response.strip()

# === OPTIMIZED GENERATION FUNCTION ===
def generate_deployment_response(prompt, chat_session=None, user=None):
    """High-performance response generation optimized for 1-core, 2GB system with Gemma 3 1B"""
    try:
        model = OptimizedLlamaModel()
        
        # Log memory status for monitoring
        memory_status = OptimizedMemoryManager.log_memory_status()
        
        # Light memory check (emergency likely with 2GB)
        if OptimizedMemoryManager.check_memory_emergency():
            OptimizedMemoryManager.emergency_memory_recovery()
            logger.warning("Memory recovery performed")
        
        # Check and adjust parameters dynamically
        model._check_and_adjust_parameters()
        
        # Initialize if needed
        if not model.is_initialized():
            logger.info("Initializing low-resource model...")
            
            with optimized_memory_operation():
                success = model.initialize_model()
            
            if not success:
                logger.error("LOW-RESOURCE: Model initialization failed")
                return "I'm currently unavailable due to system constraints. Please try again shortly."
        
        # Generate response with optimized parameters
        with optimized_memory_operation():
            if chat_session:
                model.add_to_history(chat_session, "user", prompt)
                prompt_with_history = model.build_prompt_with_history(chat_session)
            else:
                # Use the official Gemma 3 template for standalone queries
                prompt_with_history = f"<bos>\n<start_of_turn>user\n{model.system_prompt}\n\n{prompt.strip()}<end_of_turn>\n<start_of_turn>model"
            
            try:
                # Get current adaptive parameters for generation
                adaptive_params = OptimizedMemoryManager.get_adaptive_parameters()
                
                # Use full token budget for high-performance system
                effective_max_tokens = model.max_response_tokens

                # Optimized temperature for Gemma 3 1B on low-resource
                temperature = 0.6  # Lower for more controlled responses

                # Tier-based generation parameters optimized for Gemma
                if adaptive_params['tier'] == 'minimal':
                    top_p = 0.80
                    top_k = 30
                elif adaptive_params['tier'] == 'low':
                    top_p = 0.85
                    top_k = 40
                elif adaptive_params['tier'] == 'medium':
                    top_p = 0.90
                    top_k = 50
                else:  # high tier
                    top_p = 0.92
                    top_k = 60
                
                # Low-resource generation parameters
                generation_params = {
                    'prompt': prompt_with_history,
                    'max_tokens': effective_max_tokens,
                    'stop': ["<end_of_turn>", "<|eot_id|>", "</s>"], # Added more stop tokens
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
                ai_response = model._post_process_response(ai_response)
                
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
        logger.error(f"LOW-RESOURCE: Deployment generation failed: {str(e)}")
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
    """Get comprehensive deployment system status optimized for low-resource system"""
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
            'system_type': 'low_resource',
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
    print("=== GEMMA 3 1B LOW-RESOURCE MODEL TEST ===")
    
    # Test deployment response
    test_prompt = "Hello! How are you today? Can you tell me about your capabilities as Gemma?"
    print(f"Testing: '{test_prompt}'")
    
    response = generate_deployment_response(test_prompt, chat_session="gemma_test")
    print(f"Response: {response}")
    
    # Check status
    status = get_deployment_status()
    print(f"Status: {status}")
    
    print("=== GEMMA 3 1B LOW-RESOURCE TEST COMPLETE ===")

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