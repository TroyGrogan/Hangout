# ai_model_test_by_itself.py
# A vanilla Python script to test the raw output of the Gemma 3 1B model
# based on the settings in llm_handler_deployment.py.

import os
import sys

# This is necessary to allow the script to find the llama_cpp library
# if you are running it from a virtual environment managed by the project root.
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)

try:
    from llama_cpp import Llama
except ImportError:
    print("ERROR: llama-cpp-python is not installed.")
    print("Please activate your virtual environment and run 'pip install llama-cpp-python'.")
    sys.exit(1)

# --- Configuration (Copied from llm_handler_deployment.py) ---

# Calculate BASE_DIR relative to this file to find the model
# This file: backend/apps/ai_chat/ai_model_test_by_itself.py
# Model path: backend/ai_model/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_FILENAME = "gemma-3-1b-it-Q8_0.gguf"
MODEL_PATH = os.path.join(BASE_DIR, "ai_model", MODEL_FILENAME)

# Model loading parameters modeled after llm_handler_deployment.py (Gemma 3 1B optimized)
CONTEXT_WINDOW = 4096  # Matching 'high' tier in deployment handler
N_THREADS = 8          # Reasonable for local testing on multi-core machine

# System prompt for Gemma 3, per deployment handler
SYSTEM_PROMPT = "You are a Grounded, Balanced, Creative, Helpful, and Insightful AI Assistant. You are also a direct and factual AI assistant. You must respond ONLY with the information requested for, without any conversational fillers, introductions, or extraneous text. Your output must be the direct answer to the user's query."

def run_inference_for_prompt(llm, user_prompt):
    """
    Runs a single inference for a given user prompt against the loaded Gemma model.
    Uses a few-shot prompt to guide the model to give direct, non-conversational answers.
    """
    # By providing a more detailed example, we can guide the model to produce
    # more nuanced and comprehensive answers.
    full_prompt = f"""<start_of_turn>user
{SYSTEM_PROMPT}

Explain the benefits of regular exercise.<end_of_turn>
<start_of_turn>model
Regular exercise offers a wide range of physical and mental health benefits. Here are two key examples:

*   **Improved Cardiovascular Health:** Consistent physical activity strengthens the heart muscle, improves blood circulation, and can help lower blood pressure and cholesterol levels.
*   **Enhanced Mental Well-being:** Exercise is a proven mood booster that can reduce symptoms of depression and anxiety by releasing endorphins and promoting better sleep.<end_of_turn>
<start_of_turn>user
{user_prompt}<end_of_turn>
<start_of_turn>model"""

    print("\n--- PROMPT SENT TO MODEL ---")
    print(full_prompt)
    print("----------------------------")

    # Generate the response
    print("\nGenerating raw response (this may take a moment)...")

    # Using generation parameters from generate_deployment_response in the handler (high tier)
    try:
        response = llm.create_completion(
            prompt=full_prompt,
            max_tokens=2048,     # Matching 'high' tier in deployment handler
            stop=["<end_of_turn>", "<|eot_id|>", "</s>"], # Stop tokens for Gemma
            temperature=0.75,    # Increased for more creative and detailed responses
            top_p=0.92,          # High-performance tier from handler
            top_k=60,            # High-performance tier from handler
            repeat_penalty=1.15, # Matching deployment handler
            stream=False,
            echo=False,
        )

        raw_output = response['choices'][0]['text'].strip()

        print("\n--- RAW AI OUTPUT (No Post-Processing) ---")
        print(raw_output)
        print("--------------------------------------------")
        
        # Apply our backend post-processing (matching deployment handler)
        processed_output = apply_backend_post_processing(raw_output)
        
        print("\n--- BACKEND POST-PROCESSED OUTPUT ---")
        print(processed_output)
        print("------------------------------------")
        
        # Show what the frontend MarkdownRenderer would see
        print("\n--- WHAT FRONTEND MARKDOWNRENDERER RECEIVES ---")
        print(f"Content length: {len(processed_output)} characters")
        print("First 200 characters:")
        print(repr(processed_output[:200]))
        print("----------------------------------------------------")

    except Exception as e:
        print(f"\n--- ERROR ---")
        print(f"Failed during response generation: {e}")
        print("---------------")


def apply_backend_post_processing(response):
    """
    Apply the same minimal post-processing that the deployment handler uses for Gemma.
    ONLY remove tokens - preserve ALL formatting for frontend processing.
    """
    if not response:
        return response
    
    # Remove Gemma-specific tokens
    response = response.replace("<start_of_turn>", "")
    response = response.replace("<end_of_turn>", "")

    # Remove other common special tokens that might appear
    response = response.replace("<|begin_of_text|>", "")
    response = response.replace("<|eot_id|>", "")
    response = response.replace("</s>", "")
    
    # Remove legacy role tokens just in case
    response = response.replace("<|assistant|>", "")
    response = response.replace("<|user|>", "")
    response = response.replace("<|system|>", "")
    
    # ONLY strip leading/trailing whitespace - preserve internal formatting
    response = response.strip()
    
    return response


def main():
    """
    Loads the Gemma 3 1B model once, then runs a series of test prompts against it
    to get a comprehensive understanding of its behavior and raw output formatting.
    """
    print("--- GEMMA 3 1B MODEL RAW OUTPUT TEST ---")

    # 1. Check if model file exists
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Model file not found at: {MODEL_PATH}")
        print(f"Please ensure the model '{MODEL_FILENAME}' is in the 'backend/ai_model/' directory.")
        print("Download from: https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF")
        return

    print(f"Found model: {MODEL_PATH}")
    print("Initializing Gemma 3 1B model (this happens only once)...")

    # 2. Initialize the Llama model with deployment-matching parameters for Gemma
    try:
        llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=CONTEXT_WINDOW,
            n_threads=N_THREADS,
            n_gpu_layers=0,       # CPU only
            verbose=False,
            
            # --- Performance settings from deployment handler ---
            use_mmap=True,        # Memory-map file
            use_mlock=True,       # Lock memory for performance (fine for testing)
            n_batch=512,          # Batch size for throughput (original test value)
            last_n_tokens_size=128, # Smaller token buffer for Gemma (from handler)
            
            # --- Gemma-specific settings from deployment handler ---
            rope_scaling_type=0,  # No rope scaling
            rope_freq_base=10000.0, # Default rope freq
        )
        print("Gemma 3 1B model initialized successfully.")
    except Exception as e:
        print(f"\n--- ERROR ---")
        print(f"Failed to initialize model: {e}")
        print("This could be due to a corrupted model file or incorrect llama-cpp-python installation.")
        print("---------------")
        return

    # 3. Define test prompts focused on list formatting and markdown structure
    
    markdown_focused_test_prompts = [
        # Test numbered lists with titles
        "Suggest ways to improve communication and conflict resolution skills in relationships.",
        
        # Test bullet points with titles  
        "List pros and cons of drinking coffee.",
        
        # Test mixed content with lists
        "Suggest ways nature can be used for healing and stress reduction.",
        
        # Test home organization (from your screenshot)
        "Suggest routines for maintaining home organization (daily, weekly, seasonal).",
        
        # Test health-related lists
        "Suggest ways to adopt an anti-inflammatory or longevity-focused lifestyle.",
        
        # Test activity suggestions
        "Suggest resources for learning Aikido or Hapkido.",
        
        # Test adventure activities
        "Can you please tell me about 🧗‍♀️ Adventure Activities in regard to 🌍 Travel, Nature, and Adventure? Please explain this to me in detail.",
        
        # Test simple lists to see basic formatting
        "List three primary colors using numbered list format.",
        
        # Test code formatting
        "Write hello world in Python with proper code formatting."
    ]

    print(f"\nTesting Gemma 3 1B with {len(markdown_focused_test_prompts)} prompts focused on markdown formatting...")
    print("=" * 80)

    # 4. Run inference for each prompt
    for i, prompt in enumerate(markdown_focused_test_prompts):
        print(f"\n\n========================= TEST CHAT {i + 1}/{len(markdown_focused_test_prompts)} =========================")
        print(f"PROMPT: {prompt}")
        run_inference_for_prompt(llm, prompt)
        print("=" * 80)
        
        # Add a small pause between tests
        import time
        time.sleep(1)

    print(f"\n\n=== GEMMA 3 1B RAW OUTPUT TEST COMPLETE ===")
    print("Use these raw outputs to improve MarkdownRenderer.jsx post-processing!")


if __name__ == "__main__":
    main() 