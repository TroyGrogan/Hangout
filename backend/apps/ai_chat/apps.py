from django.apps import AppConfig

class AiChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_chat' # Make sure this matches the directory name
    verbose_name = 'AI Chat'

    # Optional: Add ready() method for initialization logic if needed
    # def ready(self):
    #     # Example: Trigger model initialization on server start
    #     # Be cautious with this in production environments (e.g., use management commands)
    #     from .llm_handler import initialize_model
    #     import threading
    #     # Run in a separate thread to avoid blocking startup?
    #     # threading.Thread(target=initialize_model, daemon=True).start()
    #     # Or run synchronously (might delay startup)
    #     # initialize_model()
    #     pass 