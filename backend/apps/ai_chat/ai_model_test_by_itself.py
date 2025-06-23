# ai_model_test_by_itself.py
# A vanilla Python script to test the raw output of the OpenChat 3.6 8B model
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
MODEL_FILENAME = "openchat-3.6-8b-20240522-Q4_K_M.gguf"
MODEL_PATH = os.path.join(BASE_DIR, "ai_model", MODEL_FILENAME)

# Model loading parameters from llm_handler_deployment.py (OpenChat 3.6 8B optimized)
CONTEXT_WINDOW = 8192  # Using deployment default for OpenChat
N_THREADS = 8  # Reasonable for testing

# Enhanced System prompt matching deployment handler
SYSTEM_PROMPT = """You are OpenChat, an exceptionally helpful, knowledgeable, and honest AI assistant. You provide detailed, accurate, and thoughtful responses to help users with a wide variety of topics and questions. You are creative, curious, and always strive to be maximally helpful while being truthful and harmless. Feel free to engage in comprehensive explanations and thoughtful conversations."""

def run_inference_for_prompt(llm, user_prompt):
    """
    Runs a single inference for a given user prompt against the loaded OpenChat model.
    Uses the GPT4 Correct format from the deployment handler.
    """
    # Using the GPT4 Correct prompt format from the deployment handler
    full_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{SYSTEM_PROMPT}<|eot_id|><|start_header_id|>GPT4 Correct User<|end_header_id|>\n\n{user_prompt}<|eot_id|><|start_header_id|>GPT4 Correct Assistant<|end_header_id|>\n\n"

    print("\n--- PROMPT SENT TO MODEL ---")
    print(full_prompt)
    print("----------------------------")

    # Generate the response
    print("\nGenerating raw response (this may take a moment)...")

    # Using generation parameters from generate_deployment_response in the handler
    try:
        response = llm.create_completion(
            prompt=full_prompt,
            max_tokens=2048,     # Increased for OpenChat 8B
            stop=["<|start_header_id|>", "<|eot_id|>", "GPT4 Correct User", "Human:", "User:"],
            temperature=0.7,     # Matching deployment handler
            top_p=0.95,          # High-performance tier from handler
            top_k=80,            # High-performance tier from handler
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
    Apply the same minimal post-processing that the deployment handler uses.
    ONLY remove tokens - preserve ALL formatting for frontend processing.
    """
    if not response:
        return response
    
    # ONLY remove special tokens - preserve ALL spacing and formatting
    response = response.replace("<|start_header_id|>", "")
    response = response.replace("<|end_header_id|>", "")
    response = response.replace("<|begin_of_text|>", "")
    response = response.replace("<|eot_id|>", "")
    response = response.replace("GPT4 Correct User", "")
    response = response.replace("GPT4 Correct Assistant", "")
    
    # Remove legacy tokens that might still appear
    response = response.replace("<|assistant|>", "")
    response = response.replace("<|user|>", "")
    response = response.replace("<|system|>", "")
    response = response.replace("</s>", "")
    
    # ONLY strip leading/trailing whitespace - preserve internal formatting
    response = response.strip()
    
    return response


def main():
    """
    Loads the OpenChat 3.6 8B model once, then runs a series of test prompts against it
    to get a comprehensive understanding of its behavior and raw output formatting.
    """
    print("--- OPENCHAT 3.6 8B MODEL RAW OUTPUT TEST ---")

    # 1. Check if model file exists
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Model file not found at: {MODEL_PATH}")
        print(f"Please ensure the model '{MODEL_FILENAME}' is in the 'backend/ai_model/' directory.")
        print("Download from: https://huggingface.co/bartowski/openchat-3.6-8b-20240522-GGUF")
        return

    print(f"Found model: {MODEL_PATH}")
    print("Initializing OpenChat 3.6 8B model (this happens only once)...")

    # 2. Initialize the Llama model with deployment-matching parameters
    try:
        llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=CONTEXT_WINDOW,
            n_threads=N_THREADS,
            n_gpu_layers=0,       # CPU only
            verbose=False,
            use_mmap=True,        # Memory-map file
            use_mlock=True,       # Lock memory for performance
            n_batch=512,          # Large batch for throughput
            last_n_tokens_size=256, # Larger for 8B model
        )
        print("OpenChat 3.6 8B model initialized successfully.")
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

    print(f"\nTesting OpenChat 3.6 8B with {len(markdown_focused_test_prompts)} prompts focused on markdown formatting...")
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

    print(f"\n\n=== OPENCHAT 3.6 8B RAW OUTPUT TEST COMPLETE ===")
    print("Use these raw outputs to improve MarkdownRenderer.jsx post-processing!")


if __name__ == "__main__":
    main() 