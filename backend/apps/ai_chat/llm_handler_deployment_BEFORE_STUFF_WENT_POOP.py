# llm_handler_deployment.py - ULTRA OPTIMIZED for 1 CPU + 2GB RAM deployment
# This is the production-ready version with extreme constraints
# Key optimizations:
# 1. Ultra-aggressive memory management
# 2. Minimal context window (1024 tokens)
# 3. Single-threaded operation
# 4. Emergency memory recovery
# 5. Swap-aware operation

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

# === DEPLOYMENT CONSTRAINTS ===
CPU_THRESHOLD = 98          # Ultra-high threshold for single CPU
MEMORY_THRESHOLD = 98       # Push to absolute limit
CACHE_SIZE_GB = 0.05        # Minimal 50MB cache

# === ADAPTIVE MEMORY CONSTRAINTS ===
# Base parameters (ultra-conservative for 2GB)
BASE_CONTEXT_WINDOW = 1024
BASE_MAX_RESPONSE_TOKENS = 384  # Reduced for safety

# Adaptive parameters based on available memory
ADAPTIVE_MEMORY_THRESHOLDS = {
    'minimal': {  # < 0.3GB available
        'context_window': 1024,
        'max_response_tokens': 320,
        'max_history': 4
    },
    'low': {     # 0.3-0.5GB available
        'context_window': 1536,
        'max_response_tokens': 512,
        'max_history': 6
    },
    'medium': {  # 0.5-0.8GB available
        'context_window': 1792,
        'max_response_tokens': 640,
        'max_history': 8
    },
    'high': {    # > 0.8GB available
        'context_window': 2048,
        'max_response_tokens': 768,
        'max_history': 10
    }
}

SWAP_THRESHOLD_GB = 1.0     # Monitor swap aggressively
GC_FREQUENCY = 2            # Very frequent GC

# Ultra-aggressive memory pressure levels
MEMORY_PRESSURE_LEVELS = {
    'low': 60,
    'medium': 75,
    'high': 90,
    'critical': 95
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

# === ULTRA MEMORY MANAGER ===
class UltraMemoryManager:
    """Ultra-aggressive memory management for 2GB constraint"""
    
    @staticmethod
    def get_memory_pressure():
        """Get memory pressure with deployment thresholds"""
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
        """Emergency memory recovery for critical situations"""
        logger.warning("EMERGENCY: Performing aggressive memory recovery")
        
        # Multiple GC passes
        for i in range(3):
            collected = gc.collect()
            logger.debug(f"GC pass {i+1}: freed {collected} objects")
        
        # Force memory cleanup
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6")
            libc.malloc_trim(0)
        except:
            pass
        
        return True
    
    @staticmethod
    def get_available_memory_gb():
        """Get available memory in GB"""
        mem = psutil.virtual_memory()
        return mem.available / (1024**3)
    
    @staticmethod
    def monitor_swap_usage():
        """Monitor swap usage"""
        try:
            swap = psutil.swap_memory()
            return swap.used / (1024**3)
        except:
            return 0
    
    @staticmethod
    def check_memory_emergency():
        """Check if we're in memory emergency"""
        pressure = UltraMemoryManager.get_memory_pressure()
        available = UltraMemoryManager.get_available_memory_gb()
        
        if pressure == 'critical' or available < 0.1:  # Less than 100MB
            return True
        return False

    @staticmethod
    def get_adaptive_memory_tier():
        """Get memory tier for adaptive parameter selection"""
        available_gb = UltraMemoryManager.get_available_memory_gb()
        pressure = UltraMemoryManager.get_memory_pressure()
        
        # If memory pressure is critical, force minimal tier
        if pressure == 'critical' or available_gb < 0.2:
            return 'minimal'
        elif pressure == 'high' or available_gb < 0.3:
            return 'minimal'
        elif pressure == 'medium' or available_gb < 0.5:
            return 'low'
        elif available_gb < 0.8:
            return 'medium'
        else:
            return 'high'
    
    @staticmethod
    def get_adaptive_parameters():
        """Get adaptive parameters based on current memory situation"""
        tier = UltraMemoryManager.get_adaptive_memory_tier()
        params = ADAPTIVE_MEMORY_THRESHOLDS[tier].copy()
        
        # Add tier info for logging
        params['tier'] = tier
        params['available_gb'] = UltraMemoryManager.get_available_memory_gb()
        
        return params
    
    @staticmethod
    def log_memory_status():
        """Log current memory status for monitoring"""
        mem = psutil.virtual_memory()
        available_gb = mem.available / (1024**3)
        used_gb = mem.used / (1024**3)
        pressure = UltraMemoryManager.get_memory_pressure()
        tier = UltraMemoryManager.get_adaptive_memory_tier()
        
        logger.info(f"MEMORY: {used_gb:.1f}GB used, {available_gb:.1f}GB available, "
                   f"pressure={pressure}, tier={tier}")
        
        # Warn if approaching limits
        if available_gb < 0.2:
            logger.warning(f"LOW MEMORY: Only {available_gb:.2f}GB available!")
        
        return {
            'used_gb': used_gb,
            'available_gb': available_gb,
            'pressure': pressure,
            'tier': tier
        }

@contextmanager
def ultra_memory_operation():
    """Ultra-conservative memory operation context"""
    # Pre-operation cleanup
    if UltraMemoryManager.check_memory_emergency():
        UltraMemoryManager.emergency_memory_recovery()
    
    try:
        yield
    finally:
        # Post-operation cleanup
        gc.collect()

# === ULTRA-OPTIMIZED LLAMA MODEL ===
class UltraLlamaModel:
    """Ultra-optimized LLM for deployment constraints"""
    _instance = None
    _lock = threading.Lock()
    _operation_count = 0

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(UltraLlamaModel, cls).__new__(cls)
                    cls._instance._initialize_attributes()
        return cls._instance

    def _initialize_attributes(self):
        """Initialize with adaptive memory-aware settings"""
        self.llm = None
        self.cache = None
        self.conversation_history = {}
        
        # Use adaptive parameters based on available memory
        adaptive_params = UltraMemoryManager.get_adaptive_parameters()
        self.context_window = adaptive_params['context_window']
        self.max_response_tokens = adaptive_params['max_response_tokens']
        self.max_prompt_tokens = self.context_window - self.max_response_tokens
        
        self._initialized = False
        self._last_gc = time.time()
        self._last_memory_check = 0
        
        # === SYSTEM PROMPT ===
        self.system_prompt = """You are a concise, helpful, truthful, grounded, insightful, knowledgeable, balanced, curious, and creative AI assistant.
- Provide well-structured, complete sentences using standard Markdown for formatting when appropriate.
- Get straight to the point, but explain details if asked."""
        
        logger.info(f"UltraLlamaModel initialized: context={self.context_window}, "
                   f"max_tokens={self.max_response_tokens}, tier={adaptive_params['tier']}")

    def _check_and_adjust_parameters(self):
        """Dynamically adjust parameters based on current memory"""
        current_time = time.time()
        
        # Check memory every 30 seconds or when memory pressure is high
        if (current_time - self._last_memory_check > 30 or 
            UltraMemoryManager.get_memory_pressure() in ['high', 'critical']):
            
            adaptive_params = UltraMemoryManager.get_adaptive_parameters()
            
            # Only adjust if parameters need to change significantly
            new_context = adaptive_params['context_window']
            new_max_tokens = adaptive_params['max_response_tokens']
            
            if (abs(new_context - self.context_window) > 128 or 
                abs(new_max_tokens - self.max_response_tokens) > 64):
                
                self.context_window = new_context
                self.max_response_tokens = new_max_tokens
                self.max_prompt_tokens = self.context_window - self.max_response_tokens
                
                logger.info(f"ADAPTIVE: Adjusted to context={self.context_window}, "
                           f"max_tokens={self.max_response_tokens}, tier={adaptive_params['tier']}")
            
            self._last_memory_check = current_time

    def _post_process_response(self, response):
        """Post-process AI response to fix common formatting issues"""
        if not response:
            return response
            
        # Remove any remaining special tokens that might have leaked through
        response = response.replace("<|assistant|>", "").replace("<|user|>", "").replace("<|system|>", "")
        response = response.replace("</s>", "").strip()
        
        # Fix common fragmentation patterns
        import re
        
        # Fix sentences that got split incorrectly at periods
        response = re.sub(r'(\w+\.)\s*[\r\n]+\s*([A-Z])', r'\1 \2', response)
        
        # Join continuation sentences that start with common transition words
        transition_words = r'(In addition|However|Furthermore|Moreover|Also|Additionally|Therefore|Thus|Meanwhile|Subsequently|Nevertheless|Nonetheless|Consequently|Similarly|Likewise|On the other hand|For example|For instance|In contrast|In fact|Indeed|Overall|Finally|Lastly|First|Second|Third|Next|Then|After|Before|During|While|Although|Though|Despite|Because|Since|As|When|Where|Which|That|This|These|Such|Many|Some|Most|All|Each|Every|Another|Other)'
        response = re.sub(rf'(\.)\s*[\r\n]+\s*({transition_words})', r'\1 \2', response, flags=re.IGNORECASE)
        
        # Fix mid-sentence breaks (any word followed by period, then lowercase continuation)
        response = re.sub(r'(\w+\.)\s*[\r\n]+\s*([a-z])', r'\1 \2', response)
        
        # Fix breaks where a sentence ends and the next word should continue the thought
        # Pattern: "word. \n Next" -> "word. Next" (but only for logical continuations)
        response = re.sub(r'(\w+\.)\s*[\r\n]+\s*([A-Z][a-z])', r'\1 \2', response)
        
        # Fix incomplete sentences that end abruptly and continue on next line
        # Pattern: "incomplete phrase\n continuation" -> "incomplete phrase continuation"
        response = re.sub(r'(?<=[a-z,])\s*[\r\n]\s*(?=[a-z])', ' ', response) # Using [\r\n] for single newline
        
        # Clean up multiple line breaks
        response = re.sub(r'\n\s*\n\s*\n+', '\n\n', response)  # Max 2 line breaks
        response = re.sub(r' +', ' ', response)  # Remove extra spaces
        
        return response.strip()

    def _ultra_garbage_collect(self):
        """Ultra-frequent garbage collection"""
        self._operation_count += 1
        current_time = time.time()
        
        if (self._operation_count % GC_FREQUENCY == 0 or 
            current_time - self._last_gc > 15 or  # Every 15 seconds
            UltraMemoryManager.get_memory_pressure() in ['high', 'critical']):
            
            gc.collect()
            self._last_gc = current_time

    def initialize_model(self):
        """Initialize model with adaptive memory-aware parameters"""
        if self._initialized:
            return self.llm is not None

        with self._lock:
            if self._initialized:
                return self.llm is not None

            logger.info("Initializing Q8_0 TinyLlama for DEPLOYMENT (1 CPU, 2GB RAM)")
            self._initialized = True

            # Log memory status before loading
            memory_status = UltraMemoryManager.log_memory_status()
            adaptive_params = UltraMemoryManager.get_adaptive_parameters()
            
            logger.info(f"Loading model with tier='{adaptive_params['tier']}', "
                       f"context={self.context_window}, max_tokens={self.max_response_tokens}")
            
            # Stricter memory check for initialization
            if memory_status['available_gb'] < 0.2:
                logger.error(f"Insufficient memory for model loading: {memory_status['available_gb']:.2f}GB available")
                return False

            model_filename = "tinyllama-1.1b-chat-v1.0.Q8_0.gguf"
            model_path = os.path.join(BASE_DIR, "ai_model", model_filename)
            
            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return False

            with ultra_memory_operation():
                try:
                    # Adaptive cache size based on memory tier
                    cache_gb = CACHE_SIZE_GB
                    if adaptive_params['tier'] == 'minimal':
                        cache_gb = 0.02  # 20MB cache
                    elif adaptive_params['tier'] == 'low':
                        cache_gb = 0.03  # 30MB cache
                    
                    # Ultra-minimal cache
                    if LLAMA_CACHE_AVAILABLE and cache_gb > 0:
                        cache_bytes = int(cache_gb * 1024 * 1024 * 1024)
                        self.cache = LlamaRAMCache(capacity_bytes=cache_bytes)
                        logger.info(f"Adaptive cache: {cache_gb:.2f} GB")

                    from llama_cpp import Llama
                    
                    # MEMORY-ADAPTIVE DEPLOYMENT PARAMETERS
                    self.llm = Llama(
                        model_path=model_path,
                        n_ctx=self.context_window,        # Adaptive context window
                        n_threads=1,                      # Single thread
                        n_gpu_layers=0,                   # CPU only
                        verbose=False,
                        cache=self.cache,
                        
                        # === ULTRA MEMORY OPTIMIZATION ===
                        use_mmap=True,                    # Memory-map file
                        use_mlock=False,                  # No memory locking
                        n_batch=1,                        # Single batch
                        last_n_tokens_size=16 if adaptive_params['tier'] == 'minimal' else 32,
                        
                        # === DEPLOYMENT SPECIFIC ===
                        numa=False,                       # No NUMA
                        offload_kqv=False,               # Keep in main memory
                        flash_attn=False,                # Disable for compatibility
                        
                        # === ULTRA CONSERVATIVE ===
                        rope_scaling_type=0,             # No rope scaling
                        rope_freq_base=10000.0,          # Default rope freq
                    )
                    
                    logger.info(f"Q8_0 TinyLlama loaded! Tier: {adaptive_params['tier']}")
                    
                    # Minimal test
                    test_response = self.llm.create_completion("Hi", max_tokens=1)
                    logger.info("Deployment model test successful")
                    
                    # Final memory check
                    final_memory = UltraMemoryManager.log_memory_status()
                    logger.info(f"Post-load memory: {final_memory['available_gb']:.2f}GB available")
                    
                    return True
                    
                except Exception as e:
                    logger.error(f"Deployment model loading failed: {str(e)}")
                    self.llm = None
                    return False

    def is_initialized(self):
        """Check initialization status"""
        return self.llm is not None

    def count_tokens(self, text):
        """Ultra-fast token counting"""
        if not text:
            return 0
        
        # Use simple estimation for speed
        return len(text.split()) * 1.2  # Conservative estimate

    def add_to_history(self, chat_session_id, role, content):
        """Ultra-conservative history management with emergency cleanup"""
        if not chat_session_id:
            return
            
        if chat_session_id not in self.conversation_history:
            self.conversation_history[chat_session_id] = []
        
        self.conversation_history[chat_session_id].append({
            "role": role,
            "content": content
        })
        
        # Get adaptive parameters for history management
        adaptive_params = UltraMemoryManager.get_adaptive_parameters()
        max_history = adaptive_params['max_history']
        
        # Emergency memory handling - aggressive cleanup
        if UltraMemoryManager.check_memory_emergency():
            # Clear all sessions except current one
            sessions_to_clear = [sid for sid in self.conversation_history.keys() if sid != chat_session_id]
            for sid in sessions_to_clear:
                del self.conversation_history[sid]
            
            # Keep only last 2 messages in current session
            if len(self.conversation_history[chat_session_id]) > 4:
                self.conversation_history[chat_session_id] = \
                    self.conversation_history[chat_session_id][-4:]
                    
            logger.warning(f"EMERGENCY: Cleared {len(sessions_to_clear)} chat sessions, trimmed current to 4 messages")
        else:
            # Normal trimming based on adaptive parameters
            if len(self.conversation_history[chat_session_id]) > max_history:
                self.conversation_history[chat_session_id] = \
                    self.conversation_history[chat_session_id][-max_history:]
        
        # Ultra-frequent garbage collection
        self._ultra_garbage_collect()
        
        # Emergency memory check after adding to history
        if UltraMemoryManager.check_memory_emergency():
            UltraMemoryManager.emergency_memory_recovery()

    def get_conversation_history(self, chat_session_id):
        """Get history with adaptive memory pressure awareness"""
        history = self.conversation_history.get(chat_session_id, [])
        
        # Get adaptive parameters for history management
        adaptive_params = UltraMemoryManager.get_adaptive_parameters()
        max_history = adaptive_params['max_history']
        
        # Emergency memory handling - but preserve continuity
        if UltraMemoryManager.check_memory_emergency():
            # Keep minimum for continuity even in emergency
            return history[-4:] if len(history) >= 4 else history
        
        # Use adaptive history limit based on memory tier
        return history[-max_history:] if len(history) > max_history else history

    def build_prompt_with_history(self, chat_session_id, user_input):
        """Build ultra-compact prompt with proper Zephyr formatting"""
        try:
            history = self.get_conversation_history(chat_session_id)
            
            # Proper Zephyr format - system message should be more comprehensive
            system_msg = self.system_prompt
            prompt_parts = [f"<|system|>\n{system_msg}</s>\n"]
            
            # Add conversation history with proper formatting
            for message in history[-8:]:  # Increased from 6 to 8 messages (4 exchanges)
                if message["role"] == "user":
                    prompt_parts.append(f"<|user|>\n{message['content']}</s>\n")
                elif message["role"] == "assistant":
                    prompt_parts.append(f"<|assistant|>\n{message['content']}</s>\n")
            
            # Current user input
            prompt_parts.append(f"<|user|>\n{user_input}</s>\n<|assistant|>\n")
            
            full_prompt = "".join(prompt_parts)
            
            # Log the prompt for debugging (truncated)
            logger.debug(f"Built prompt length: {len(full_prompt)} chars")
            
            return full_prompt
            
        except Exception as e:
            logger.error(f"Error building prompt: {str(e)}")
            # Emergency fallback
            system_msg = """You are a concise, helpful, truthful, grounded, insightful, knowledgeable, balanced, curious, and creative AI assistant.
- Provide well-structured, complete sentences using standard Markdown for formatting when appropriate.
- Get straight to the point, but explain details if asked."""
            return f"<|system|>\n{system_msg}</s>\n<|user|>\n{user_input}</s>\n<|assistant|>\n"

    def _enhanced_post_process_response(self, response):
        """Enhanced post-processing to handle fragmentation better"""
        import re
        if not response:
            return response
            
        # Remove any remaining special tokens that might have leaked through
        response = response.replace("<|assistant|>", "").replace("<|user|>", "").replace("<|system|>", "")
        response = response.replace("</s>", "").strip()

        # === Simplified Formatting Fixes ===
        # Correct '::' to ':'
        response = re.sub(r'::+', ':', response)
        
        # === End of Simplified Formatting Fixes ===
        
        # === Essential Line Joining ===
        # Fix mid-sentence breaks (any word followed by period, then lowercase continuation)
        response = re.sub(r'(\w+\.)\s*[\r\n]+\s*([a-z])', r'\1 \2', response)
        
        # Fix incomplete sentences that end abruptly and continue on next line (lowercase or comma, then lowercase)
        response = re.sub(r'(?<=[a-z,])\s*[\r\n]\s*(?=[a-z])', ' ', response)
        
        # === Final Cleanup ===
        # Clean up multiple line breaks
        response = re.sub(r'\n\s*\n\s*\n+', '\n\n', response)  # Max 2 line breaks
        response = re.sub(r' +', ' ', response)  # Remove extra spaces
        
        return response.strip()

    def _response_seems_incomplete(self, response):
        """Check if the response seems incomplete or fragmented"""
        import re
        if not response:
            return True
        
        # Check for various indicators of incomplete responses
        response_clean = response.strip()
        
        # Too short responses are likely incomplete
        if len(response_clean.split()) < 15:
            return True
        
        # Ends abruptly without proper punctuation
        if not response_clean.endswith(('.', '!', '?', ':')):
            return True
        
        # Contains obvious fragmentation patterns
        fragmentation_patterns = [
            r'\w+\,\s*$',  # Ends with "word,"
            r'[a-z]+\s*$',  # Ends with lowercase word (likely incomplete)
            r'\w+\s+(to|and|or|of|in|on|at|for|with|by)\s*$',  # Ends with preposition (incomplete phrase)
            r'\w+\s+(can|will|should|could|would|may|might)\s*$',  # Ends with modal verb (incomplete)
            r'necessary\s+(to|for)\s*$',  # Incomplete "necessary to/for" phrases
            r'able\s+to\s*$',  # Incomplete "able to" phrases
            r'in\s+order\s+to\s*$',  # Incomplete "in order to" phrases
        ]
        
        for pattern in fragmentation_patterns:
            if re.search(pattern, response_clean):
                return True
                
        return False

    def _attempt_response_completion(self, incomplete_response, original_prompt, adaptive_params):
        """Attempt to complete an incomplete response within memory constraints"""
        try:
            # Only attempt completion if we have sufficient memory
            if UltraMemoryManager.check_memory_emergency():
                return incomplete_response
            
            logger.debug(f"Attempting to complete response: '{incomplete_response[:50]}...'")
            
            # Create a continuation prompt that encourages natural completion
            # Remove the incomplete ending and let the model naturally continue
            words = incomplete_response.strip().split()
            
            # If the response ends with an incomplete phrase, remove the last few words
            # to give the model a better starting point for continuation
            if len(words) > 5:
                # Check if it ends with incomplete patterns
                last_few_words = ' '.join(words[-3:]).lower()
                if any(pattern in last_few_words for pattern in ['necessary to', 'able to', 'in order to', 'help to', 'tend to']):
                    # Remove the incomplete phrase
                    truncated_response = ' '.join(words[:-2])
                elif words[-1].lower() in ['to', 'and', 'or', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'can', 'will', 'should']:
                    # Remove the dangling preposition or modal verb
                    truncated_response = ' '.join(words[:-1])
                else:
                    truncated_response = incomplete_response
            else:
                truncated_response = incomplete_response
            
            # Create continuation prompt
            continuation_prompt = f"{original_prompt}{truncated_response}"
            if not continuation_prompt.endswith('\n<|assistant|>\n'):
                continuation_prompt += '\n<|assistant|>\n'
            
            # Use minimal parameters for completion to save memory
            completion_response = self.llm.create_completion(
                continuation_prompt,
                max_tokens=min(128, adaptive_params.get('max_response_tokens', 256) // 2),
                stop=["<|user|>", "<|system|>", "\n\n<|", "Human:", "User:", "</s>"],
                temperature=0.3,  # Lower temperature for consistency
                top_p=0.85,
                top_k=20,
                repeat_penalty=1.2,
                stream=False,
                echo=False,
            )
            
            completion_text = completion_response['choices'][0]['text'].strip()
            
            if completion_text and len(completion_text) > 10:
                # Combine the responses intelligently
                if truncated_response != incomplete_response:
                    # We truncated, so combine truncated + completion
                    combined = f"{truncated_response} {completion_text}"
                else:
                    # No truncation, just append
                    combined = f"{incomplete_response} {completion_text}"
                
                combined = self._enhanced_post_process_response(combined)
                logger.debug(f"Successfully completed response (+{len(completion_text)} chars)")
                return combined
            
        except Exception as e:
            logger.warning(f"Failed to complete response: {str(e)}")
        
        return incomplete_response

# === DEPLOYMENT GENERATION FUNCTION ===
def generate_deployment_response(prompt, chat_session=None, user=None):
    """Memory-adaptive response generation for 2GB constraints"""
    try:
        model = UltraLlamaModel()
        
        # Log memory status for monitoring
        memory_status = UltraMemoryManager.log_memory_status()
        
        # Emergency memory check with aggressive recovery
        if UltraMemoryManager.check_memory_emergency():
            UltraMemoryManager.emergency_memory_recovery()
            logger.warning("Emergency memory recovery performed")
            
            # If still in emergency after recovery, use minimal response
            if UltraMemoryManager.check_memory_emergency():
                return "I'm currently running low on system resources. Please try again with a shorter message."
        
        # Check and adjust parameters dynamically
        model._check_and_adjust_parameters()
        
        # Initialize if needed with memory check
        if not model.is_initialized():
            logger.info("Initializing deployment model...")
            
            # Ensure we have enough memory before initializing
            if memory_status['available_gb'] < 0.15:  # Less than 150MB
                UltraMemoryManager.emergency_memory_recovery()
                return "Insufficient memory to load AI model. Please try again shortly."
            
            with ultra_memory_operation():
                success = model.initialize_model()
            
            if not success:
                logger.error("DEPLOYMENT: Model initialization failed")
                return "I'm currently unavailable due to system constraints. Please try again shortly."
        
        # Generate response with adaptive parameters
        with ultra_memory_operation():
            if chat_session:
                model.add_to_history(chat_session, "user", prompt)
                prompt_with_history = model.build_prompt_with_history(chat_session, prompt)
            else:
                # Use improved system message for standalone queries
                system_msg = """You are a concise, helpful, truthful, grounded, insightful, knowledgeable, balanced, curious, and creative AI assistant.
- Provide well-structured, complete sentences using standard Markdown for formatting when appropriate.
- Get straight to the point, but explain details if asked."""
                prompt_with_history = f"<|system|>\n{system_msg}</s>\n<|user|>\n{prompt}</s>\n<|assistant|>\n"
            
            try:
                # Get current adaptive parameters for generation
                adaptive_params = UltraMemoryManager.get_adaptive_parameters()
                
                # Adjust generation parameters based on memory tier - simplified effective_max_tokens
                effective_max_tokens = model.max_response_tokens # Use full budget for the tier

                # --- UNIFIED TEMPERATURE FROM TESTING ---
                # A lower temperature provides more predictable and less verbose responses.
                temperature = 0.3

                if adaptive_params['tier'] == 'minimal':
                    top_p = 0.80
                    top_k = 20
                elif adaptive_params['tier'] == 'low':
                    top_p = 0.85
                    top_k = 30
                else:
                    top_p = 0.90
                    top_k = 40
                
                # Memory-adaptive generation with improved stopping
                generation_params = {
                    'prompt': prompt_with_history,
                    'max_tokens': effective_max_tokens,
                    'stop': ["<|user|>", "<|system|>", "\n\n<|", "Human:", "User:", "</s>"],
                    'temperature': temperature,
                    'top_p': top_p,
                    'top_k': top_k,
                    'repeat_penalty': 1.2, # UPDATED from testing
                    'frequency_penalty': 0.0,
                    'presence_penalty': 0.0,
                    'stream': False,
                    'echo': False,
                }
                
                response = model.llm.create_completion(**generation_params)
                
                ai_response = response['choices'][0]['text'].strip()
                
                # Log raw response for debugging fragmentation issues
                logger.debug(f"Raw response length: {len(ai_response)} chars")
                if len(ai_response) < 100:
                    logger.debug(f"Short response: '{ai_response}'")
                
                # Enhanced post-processing to handle fragmentation
                ai_response = model._enhanced_post_process_response(ai_response)
                
                # Check if response seems incomplete and try to complete it (memory permitting)
                if model._response_seems_incomplete(ai_response) and adaptive_params['tier'] != 'minimal':
                    logger.warning(f"Detected incomplete response, attempting completion. Tier: {adaptive_params['tier']}")
                    ai_response = model._attempt_response_completion(ai_response, prompt_with_history, adaptive_params)
                
                if chat_session:
                    model.add_to_history(chat_session, "assistant", ai_response)
                
                logger.info(f"DEPLOYMENT: Generated {len(ai_response)} chars, tier={adaptive_params['tier']}")
                return ai_response
                
            except Exception as e:
                logger.error(f"DEPLOYMENT: Generation error: {str(e)}")
                
                # Emergency fallback with better message
                fallback = "I apologize, but I'm experiencing high system load right now. Could you please try asking your question again? I'll do my best to provide a complete response."
                if chat_session:
                    model.add_to_history(chat_session, "assistant", fallback)
                
                return fallback
                
    except Exception as e:
        logger.critical(f"DEPLOYMENT: Critical error: {str(e)}")
        return "I'm temporarily experiencing technical difficulties. Please try again in a moment, and I'll be happy to help you."

# === DEPLOYMENT UTILITIES ===
def clear_deployment_history(chat_session_id):
    """Clear history with memory cleanup"""
    try:
        model = UltraLlamaModel()
        if chat_session_id in model.conversation_history:
            del model.conversation_history[chat_session_id]
            gc.collect()  # Immediate cleanup
            return True
        return False
    except Exception as e:
        logger.error(f"Error clearing deployment history: {str(e)}")
        return False

def get_deployment_status():
    """Get comprehensive deployment system status with adaptive parameters"""
    try:
        memory_status = UltraMemoryManager.log_memory_status()
        adaptive_params = UltraMemoryManager.get_adaptive_parameters()
        
        model = UltraLlamaModel()
        model_loaded = model.is_initialized()
        
        # Get current model parameters if loaded
        current_params = {}
        if model_loaded:
            current_params = {
                'context_window': model.context_window,
                'max_response_tokens': model.max_response_tokens,
                'max_prompt_tokens': model.max_prompt_tokens
            }
        
        return {
            'memory_pressure': memory_status['pressure'],
            'memory_tier': memory_status['tier'],
            'available_memory_gb': memory_status['available_gb'],
            'used_memory_gb': memory_status['used_gb'],
            'swap_usage_gb': UltraMemoryManager.monitor_swap_usage(),
            'model_loaded': model_loaded,
            'emergency_mode': UltraMemoryManager.check_memory_emergency(),
            'adaptive_parameters': adaptive_params,
            'current_model_parameters': current_params,
            'memory_thresholds': ADAPTIVE_MEMORY_THRESHOLDS
        }
    except Exception as e:
        logger.error(f"Error getting deployment status: {str(e)}")
        return {'error': str(e)}

# === STANDALONE TESTING ===
if __name__ == "__main__":
    print("=== DEPLOYMENT MODEL TEST ===")
    
    # Test deployment response
    test_prompt = "Hello! How are you?"
    print(f"Testing: '{test_prompt}'")
    
    response = generate_deployment_response(test_prompt, chat_session="deploy_test")
    print(f"Response: {response}")
    
    # Check status
    status = get_deployment_status()
    print(f"Status: {status}")
    
    print("=== DEPLOYMENT TEST COMPLETE ===")

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
    """Initialize the ultra-optimized model with status tracking"""
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
        model = UltraLlamaModel()
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
    """Check if the ultra model is initialized"""
    try:
        model = UltraLlamaModel()
        return model.is_initialized()
    except:
        return False

def generate_new_session_id():
    """Generate a new unique session ID"""
    import uuid
    return str(uuid.uuid4())

def load_history_from_database(user, chat_session_id):
    """Load chat history from database into ultra model memory"""
    try:
        from .models import Chat
        
        model = UltraLlamaModel()
        
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