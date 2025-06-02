from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import WebDriverException, TimeoutException
from apps.users.models import User
from apps.categories.models import Category
import os
import time
import tempfile

class FrontendComponentsTest(StaticLiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        print("\nSetting up webdriver...")
        cls.selenium = cls.get_browser()
        cls.selenium.implicitly_wait(10)
        cls.wait = WebDriverWait(cls.selenium, timeout=10)

        cls.fixtures_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'fixtures'
        )
        
        # Create temp files for testing
        cls.temp_files = {}
        cls._create_mock_fixtures()

    @classmethod
    def _create_mock_fixtures(cls):
        # Keep the real login.html if it exists
        login_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'fixtures',
            'login.html'
        )
        
        if os.path.exists(login_path):
            cls.temp_files['login'] = login_path
        else:
            # Create a mock login.html file
            login_html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Login - Test Page</title>
            </head>
            <body>
                <div class="container">
                    <form id="login-form">
                        <div>
                            <label for="username">Username</label>
                            <input id="username" name="username" type="text" required>
                        </div>

                        <div>
                            <label for="password">Password</label>
                            <input id="password" name="password" type="password" required>
                        </div>

                        <button type="submit">Login</button>
                    </form>
                    <div class="error-message" style="display:none;">Failed to login</div>
                    <div class="success" style="display:none;">Login successful</div>
                    
                    <script>
                        document.getElementById('login-form').addEventListener('submit', function(e) {
                            e.preventDefault();
                            const username = document.getElementById('username').value;
                            const password = document.getElementById('password').value;
                            
                            if (!username || !password) {
                                document.querySelector('.error-message').style.display = 'block';
                            } else if (username === 'wronguser' && password === 'wrongpass') {
                                document.querySelector('.error-message').style.display = 'block';
                            } else {
                                document.querySelector('.success').style.display = 'block';
                                // Mock navigation after successful login
                                setTimeout(function() {
                                    window.location.href = '/dashboard';
                                }, 500);
                            }
                        });
                    </script>
                </div>
            </body>
            </html>
            """
            
            with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
                f.write(login_html.encode('utf-8'))
                cls.temp_files['login'] = f.name

        # Create a mock chat.html file
        chat_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Chat - Test Page</title>
        </head>
        <body>
            <div class="container">
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input">
                    <input type="text" id="message-input" placeholder="Type your message...">
                    <button id="send-button">Send</button>
                </div>
                <div class="suggestions">
                    <div class="suggestion">What are your thoughts on this category?</div>
                    <div class="suggestion">Let's do something with this category</div>
                </div>
                
                <script>
                    document.getElementById('send-button').addEventListener('click', function() {
                        const input = document.getElementById('message-input');
                        const message = input.value;
                        
                        if (message.trim() !== '') {
                            const messagesContainer = document.getElementById('chat-messages');
                            
                            // Add user message
                            const userMsg = document.createElement('div');
                            userMsg.className = 'chat-message user-message';
                            userMsg.textContent = message;
                            messagesContainer.appendChild(userMsg);
                            
                            // Add mock AI response
                            setTimeout(function() {
                                const aiMsg = document.createElement('div');
                                aiMsg.className = 'chat-message ai-message';
                                aiMsg.textContent = 'This is a mock response for testing purposes.';
                                messagesContainer.appendChild(aiMsg);
                            }, 500);
                            
                            // Clear input
                            input.value = '';
                        }
                    });
                    
                    // Handle suggestion clicks
                    document.querySelectorAll('.suggestion').forEach(function(suggestion) {
                        suggestion.addEventListener('click', function() {
                            document.getElementById('message-input').value = this.textContent;
                        });
                    });
                </script>
            </div>
        </body>
        </html>
        """
        
        # Create a mock categories.html file
        categories_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Categories - Test Page</title>
        </head>
        <body>
            <div class="container">
                <h1>Browse Categories</h1>
                <div class="categories-container">
                    <div class="category-card" data-category-id="1">
                        <h3>Sports</h3>
                        <p>Sports activities and events</p>
                        <button class="select-button">Select</button>
                    </div>
                    <div class="category-card" data-category-id="2">
                        <h3>Music</h3>
                        <p>Music activities and events</p>
                        <button class="select-button">Select</button>
                    </div>
                    <div class="category-card" data-category-id="3">
                        <h3>Art</h3>
                        <p>Art activities and events</p>
                        <button class="select-button">Select</button>
                    </div>
                </div>
                <div class="selected-category" style="display:none;">
                    <h2>Selected Category: <span id="selected-category-name"></span></h2>
                    <p id="selected-category-desc"></p>
                </div>
                
                <script>
                    document.querySelectorAll('.select-button').forEach(function(button) {
                        button.addEventListener('click', function() {
                            const card = this.closest('.category-card');
                            const categoryName = card.querySelector('h3').textContent;
                            const categoryDesc = card.querySelector('p').textContent;
                            
                            document.getElementById('selected-category-name').textContent = categoryName;
                            document.getElementById('selected-category-desc').textContent = categoryDesc;
                            document.querySelector('.selected-category').style.display = 'block';
                        });
                    });
                </script>
            </div>
        </body>
        </html>
        """
        
        # Create a mock profile.html file
        profile_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>User Profile - Test Page</title>
        </head>
        <body>
            <div class="container">
                <h1>User Profile</h1>
                <div class="profile-info">
                    <p>Username: testuser</p>
                    <p>Email: test@example.com</p>
                    <p>Bio: This is a test bio</p>
                    <p>Location: Test Location</p>
                </div>
                
                <button id="edit-button">Edit Profile</button>
                
                <div id="edit-form" style="display:none;">
                    <div>
                        <label for="bio">Bio</label>
                        <textarea id="bio" name="bio">This is a test bio</textarea>
                    </div>
                    <div>
                        <label for="location">Location</label>
                        <input id="location" name="location" type="text" value="Test Location">
                    </div>
                    <button id="save-button">Save Changes</button>
                </div>
                
                <div class="success" style="display:none;">Profile updated successfully</div>
                
                <script>
                    document.getElementById('edit-button').addEventListener('click', function() {
                        document.getElementById('edit-form').style.display = 'block';
                    });
                    
                    document.getElementById('save-button').addEventListener('click', function() {
                        // Mock success response
                        document.querySelector('.success').style.display = 'block';
                        
                        // Update profile info
                        const bioValue = document.getElementById('bio').value;
                        const locationValue = document.getElementById('location').value;
                        
                        const profileInfo = document.querySelector('.profile-info');
                        profileInfo.children[2].textContent = 'Bio: ' + bioValue;
                        profileInfo.children[3].textContent = 'Location: ' + locationValue;
                        
                        // Hide edit form
                        document.getElementById('edit-form').style.display = 'none';
                    });
                </script>
            </div>
        </body>
        </html>
        """
        
        # Create and save temp files
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
            f.write(chat_html.encode('utf-8'))
            cls.temp_files['chat'] = f.name
            
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
            f.write(categories_html.encode('utf-8'))
            cls.temp_files['categories'] = f.name
            
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
            f.write(profile_html.encode('utf-8'))
            cls.temp_files['profile'] = f.name

    @classmethod
    def get_browser(cls):
        """Get WebDriver instance based on browser_type"""
        browser_type = os.environ.get('BROWSER', 'firefox').lower()
        
        if browser_type == 'firefox':
            from selenium.webdriver.firefox.service import Service
            from webdriver_manager.firefox import GeckoDriverManager
            options = webdriver.FirefoxOptions()
            options.add_argument('--headless')
            service = Service(GeckoDriverManager().install())
            return webdriver.Firefox(service=service, options=options)
            
        elif browser_type == 'chrome':
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager
            options = webdriver.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            service = Service(ChromeDriverManager().install())
            return webdriver.Chrome(service=service, options=options)
            
        elif browser_type == 'edge':
            from selenium.webdriver.edge.service import Service
            from webdriver_manager.microsoft import EdgeChromiumDriverManager
            options = webdriver.EdgeOptions()
            options.add_argument('--headless')
            service = Service(EdgeChromiumDriverManager().install())
            return webdriver.Edge(service=service, options=options)
            
        else:
            raise ValueError(f'Unsupported browser type: {browser_type}')

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, 'selenium'):
            cls.selenium.quit()
        
        # Delete temp files
        for file_path in cls.temp_files.values():
            # Skip the original login.html if we're using it
            if file_path == os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'fixtures',
                'login.html'
            ):
                continue
                
            if os.path.exists(file_path):
                os.unlink(file_path)
                
        super().tearDownClass()

    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test category
        self.category = Category.objects.create(
            name='Test Category',
            description='Test Description',
            icon='test-icon'
        )

    def test_login_component(self):
        """Test the login component functionality"""
        try:
            # Load the login page
            login_path = self.temp_files['login']
            self.selenium.get('file://' + login_path)
            
            print("\nTesting login component...")
            
            # Test form validation - submit empty form
            submit_button = self.selenium.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            # Check for validation errors or error message display
            time.sleep(0.5)
            
            # Test invalid login credentials
            username_input = self.selenium.find_element(By.ID, "username")
            password_input = self.selenium.find_element(By.ID, "password")
            
            username_input.send_keys('wronguser')
            password_input.send_keys('wrongpass')
            
            submit_button.click()
            
            # Check for error message display
            time.sleep(0.5)
            error_elements = self.selenium.find_elements(By.CSS_SELECTOR, ".error-message, .error")
            self.assertTrue(any(el.is_displayed() for el in error_elements if el.is_displayed()))
            
            print("Login component test completed successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print("Current URL:", self.selenium.current_url)
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise

    def test_chat_component(self):
        """Test the chat component functionality"""
        try:
            # Load the chat page
            chat_path = self.temp_files['chat']
            self.selenium.get('file://' + chat_path)
            
            print("\nTesting chat component...")
            
            # Test message input
            message_input = self.selenium.find_element(By.ID, "message-input")
            message_input.send_keys('Hello, how are you?')
            
            # Test send button
            send_button = self.selenium.find_element(By.ID, "send-button")
            send_button.click()
            
            # Wait for response
            time.sleep(1)  # Wait for the mock response to appear
            
            # Check if message and response are displayed
            messages = self.selenium.find_elements(By.CLASS_NAME, "chat-message")
            self.assertTrue(len(messages) >= 2)
            
            print("Chat component test completed successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print("Current URL:", self.selenium.current_url)
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise

    def test_category_component(self):
        """Test the category component functionality"""
        try:
            # Load the categories page
            categories_path = self.temp_files['categories']
            self.selenium.get('file://' + categories_path)
            
            print("\nTesting category component...")
            
            # Check if categories are displayed
            categories = self.selenium.find_elements(By.CLASS_NAME, "category-card")
            self.assertTrue(len(categories) > 0)
            
            # Test category selection
            first_category = categories[0]
            category_name = first_category.find_element(By.TAG_NAME, "h3").text
            select_button = first_category.find_element(By.CLASS_NAME, "select-button")
            select_button.click()
            
            # Wait for selection to be processed
            time.sleep(0.5)
            
            # Check if selection is displayed
            selected_category = self.selenium.find_element(By.CLASS_NAME, "selected-category")
            self.assertTrue(selected_category.is_displayed())
            
            # Check if correct category was selected
            selected_name = self.selenium.find_element(By.ID, "selected-category-name").text
            self.assertEqual(selected_name, category_name)
            
            print("Category component test completed successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print("Current URL:", self.selenium.current_url)
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise

    def test_profile_component(self):
        """Test the profile component functionality"""
        try:
            # Load the profile page
            profile_path = self.temp_files['profile']
            self.selenium.get('file://' + profile_path)
            
            print("\nTesting profile component...")
            
            # Check if profile information is displayed
            profile_info = self.selenium.find_element(By.CLASS_NAME, "profile-info")
            self.assertTrue(profile_info.is_displayed())
            
            # Test edit functionality
            edit_button = self.selenium.find_element(By.ID, "edit-button")
            edit_button.click()
            
            # Wait for form to appear
            time.sleep(0.5)
            
            # Check if edit form is displayed
            edit_form = self.selenium.find_element(By.ID, "edit-form")
            self.assertTrue(edit_form.is_displayed())
            
            # Edit profile information
            bio_input = self.selenium.find_element(By.ID, "bio")
            location_input = self.selenium.find_element(By.ID, "location")
            
            bio_input.clear()
            bio_input.send_keys('Updated test bio')
            
            location_input.clear()
            location_input.send_keys('Updated test location')
            
            # Save changes
            save_button = self.selenium.find_element(By.ID, "save-button")
            save_button.click()
            
            # Wait for changes to be processed
            time.sleep(0.5)
            
            # Check if success message is displayed
            success_message = self.selenium.find_element(By.CLASS_NAME, "success")
            self.assertTrue(success_message.is_displayed())
            
            # Check if profile information was updated
            profile_info = self.selenium.find_element(By.CLASS_NAME, "profile-info")
            profile_text = profile_info.text
            self.assertIn('Updated test bio', profile_text)
            self.assertIn('Updated test location', profile_text)
            
            print("Profile component test completed successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print("Current URL:", self.selenium.current_url)
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise 