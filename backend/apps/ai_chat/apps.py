from django.apps import AppConfig
import logging
import sys
import os

logger = logging.getLogger(__name__)

class AiChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_chat' # Make sure this matches the directory name
    verbose_name = 'AI Chat'

    def ready(self):
        """
        This method is called when the Django app is ready.
        We initialize the AI model here to avoid loading it on the first request,
        which can cause timeouts in production environments like Render.
        """
        # We only want this to run for the actual server process (gunicorn/runserver),
        # not for other management commands like 'migrate'.
        # The 'RENDER' environment variable is a reliable way to check if we are in the Render deployment environment.
        is_running_server = 'runserver' in sys.argv or 'gunicorn' in sys.argv[0]
        
        if is_running_server or os.environ.get('RENDER'):
            logger.info("AI CHAT APP: Server starting, beginning AI model initialization...")
            try:
                from . import llm_handler_deployment
                # This function is non-blocking and uses a singleton, so it's safe to call here.
                # It will start the initialization if it hasn't started already.
                llm_handler_deployment.initialize_model()
                logger.info("AI CHAT APP: Model initialization process has been started from apps.py.")
            except Exception as e:
                logger.error(f"AI CHAT APP: Failed to start model initialization from apps.py: {e}", exc_info=True)

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