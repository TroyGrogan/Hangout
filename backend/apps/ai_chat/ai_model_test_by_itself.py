# ai_model_test_by_itself.py
# A vanilla Python script to test the raw output of the local LLM
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
MODEL_FILENAME = "tinyllama-1.1b-chat-v1.0.Q8_0.gguf"
MODEL_PATH = os.path.join(BASE_DIR, "ai_model", MODEL_FILENAME)

# Model loading parameters from llm_handler_deployment.py
# These are optimized for a 1 CPU, 2GB RAM deployment.
CONTEXT_WINDOW = 2048  # Using a default from the handler's 'high' tier

# System prompt from llm_handler_deployment.py
SYSTEM_PROMPT = """You are a concise, helpful, truthful, grounded, insightful, knowledgeable, balanced, curious, and creative AI assistant.
- Provide well-structured, complete sentences.
- Use simple Markdown for formatting:
  - For bold text, use **text**. Example: **This is important**.
  - For unordered lists, start each item with a single * or -. Example: * First item. Do not use ** - for list items.
  - For numbered lists, use the format: 1. **Item Title:** (followed by a colon). Example: 1. **Reading:** Check out books...
  - Ensure all Markdown is correctly formed (e.g., **bold text must be closed**).
- Avoid overly long paragraphs, but paragraphs are allowed. Get straight to the point, but explain details if asked."""


def run_model_test():
    """
    Loads the TinyLlama model with deployment settings and runs a test inference.
    """
    print("--- STANDALONE AI MODEL TEST ---")

    # 1. Check if model file exists
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Model file not found at: {MODEL_PATH}")
        print(f"Please ensure the model '{MODEL_FILENAME}' is in the 'backend/ai_model/' directory.")
        return

    print(f"Found model: {MODEL_PATH}")
    print("Initializing model with deployment parameters...")

    # 2. Initialize the Llama model
    try:
        llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=CONTEXT_WINDOW,
            n_threads=1,          # Single thread for deployment constraint
            n_gpu_layers=0,       # CPU only
            verbose=False,        # Set to True for more detailed llama.cpp logs
            use_mmap=True,
            use_mlock=False,
            n_batch=1,
            last_n_tokens_size=32
        )
        print("Model initialized successfully.")
    except Exception as e:
        print(f"\n--- ERROR ---")
        print(f"Failed to initialize model: {e}")
        print("This could be due to a corrupted model file or incorrect llama-cpp-python installation.")
        print("---------------")
        return

    # 3. Define the user prompt and build the full prompt
    # --- You can change the user_prompt here to test different inputs! ---
    # user_prompt = "write me a simple C hello world program."
    user_prompt = "please write me a simple hello world program in python."

    # Using the Zephyr prompt format from the handler
    full_prompt = f"<|system|>\n{SYSTEM_PROMPT}</s>\n<|user|>\n{user_prompt}</s>\n<|assistant|>\n"

    print("\n--- PROMPT SENT TO MODEL ---")
    print(full_prompt)
    print("----------------------------")

    # 4. Generate the response
    print("\nGenerating raw response (this may take a moment)...")

    # Using generation parameters from generate_deployment_response in the handler
    try:
        response = llm.create_completion(
            prompt=full_prompt,
            max_tokens=768,      # Using 'high' tier max tokens from handler
            stop=["<|user|>", "<|system|>", "</s>"],
            temperature=0.7,
            top_p=0.90,
            top_k=40,
            repeat_penalty=1.15,
            stream=False,
            echo=False,
        )

        raw_output = response['choices'][0]['text'].strip()

        print("\n--- RAW AI OUTPUT (No Frontend Post-Processing) ---")
        print(raw_output)
        print("-----------------------------------------------------")

    except Exception as e:
        print(f"\n--- ERROR ---")
        print(f"Failed during response generation: {e}")
        print("---------------")


if __name__ == "__main__":
    run_model_test() 