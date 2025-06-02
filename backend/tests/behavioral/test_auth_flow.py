from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException, TimeoutException
import os
import time

class BrowserTestCase(StaticLiveServerTestCase):
    """Base class for browser testing with multiple browser support"""
    
    browser_type = os.environ.get('BROWSER', 'firefox').lower()

    @classmethod
    def get_browser(cls):
        """Get WebDriver instance based on browser_type"""
        if cls.browser_type == 'firefox':
            from selenium.webdriver.firefox.service import Service
            from webdriver_manager.firefox import GeckoDriverManager
            options = webdriver.FirefoxOptions()
            options.add_argument('--headless')
            service = Service(GeckoDriverManager().install())
            return webdriver.Firefox(service=service, options=options)
            
        elif cls.browser_type == 'chrome':
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager
            options = webdriver.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            service = Service(ChromeDriverManager().install())
            return webdriver.Chrome(service=service, options=options)
            
        elif cls.browser_type == 'edge':
            from selenium.webdriver.edge.service import Service
            from webdriver_manager.microsoft import EdgeChromiumDriverManager
            options = webdriver.EdgeOptions()
            options.add_argument('--headless')
            service = Service(EdgeChromiumDriverManager().install())
            return webdriver.Edge(service=service, options=options)
            
        else:
            raise ValueError(f'Unsupported browser type: {cls.browser_type}')

class AuthenticationTest(BrowserTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        print(f"\nSetting up {cls.browser_type} webdriver...")
        cls.selenium = cls.get_browser()
        cls.selenium.implicitly_wait(10)
        cls.wait = WebDriverWait(cls.selenium, timeout=10)

        cls.fixtures_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'fixtures'
        )

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'selenium'):
            cls.selenium.quit()
        super().tearDownClass()

    def test_register_and_login(self):
        """Test user registration and login flow"""
        try:
            # Load the registration page from fixture
            register_path = os.path.join(self.fixtures_dir, 'register.html')
            self.selenium.get('file://' + register_path)
            
            print(f"\nTesting registration form using {self.browser_type}...")
            
            # Fill out registration form
            username_input = self.selenium.find_element(By.ID, "username")
            email_input = self.selenium.find_element(By.ID, "email")
            password_input = self.selenium.find_element(By.ID, "password")
            confirm_password_input = self.selenium.find_element(By.ID, "confirm_password")
            
            username_input.send_keys('testuser')
            email_input.send_keys('test@example.com')
            password_input.send_keys('testpass123')
            confirm_password_input.send_keys('testpass123')

            submit_button = self.selenium.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            print("Registration form submitted successfully")
            
            # Load the login page from fixture
            login_path = os.path.join(self.fixtures_dir, 'login.html')
            self.selenium.get('file://' + login_path)
            
            print("Testing login form...")
            
            # Fill out login form
            username_input = self.selenium.find_element(By.ID, "username")
            password_input = self.selenium.find_element(By.ID, "password")
            
            username_input.send_keys('testuser')
            password_input.send_keys('testpass123')
            
            # Submit login form
            submit_button = self.selenium.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            print("Login form submitted successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print(f"Browser: {self.browser_type}")
            print("Current URL:", self.selenium.current_url)
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise

    def test_invalid_login(self):
        """Test invalid login credentials"""
        try:
            # Load the login page from fixture
            login_path = os.path.join(self.fixtures_dir, 'login.html')
            self.selenium.get('file://' + login_path)
            
            print(f"\nTesting invalid login using {self.browser_type}...")
            
            # Fill out form with invalid credentials
            username_input = self.selenium.find_element(By.ID, "username")
            password_input = self.selenium.find_element(By.ID, "password")
            
            username_input.send_keys('wronguser')
            password_input.send_keys('wrongpass')
            
            # Submit form
            submit_button = self.selenium.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()

            self.wait.until(
                EC.visibility_of_element_located((By.CLASS_NAME, "error"))
            )
            
            # Check for error message
            error_div = self.selenium.find_element(By.CLASS_NAME, "error")
            self.assertIn('Failed to login', error_div.text)
            
            print("Invalid login test completed successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print(f"Browser: {self.browser_type}")
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise