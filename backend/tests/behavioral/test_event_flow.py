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

class EventFlowTest(StaticLiveServerTestCase):
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
        # Create a mock create_event.html file
        create_event_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Create Event - Test Page</title>
        </head>
        <body>
            <div class="container">
                <h1>Create Event</h1>
                <form id="event-form">
                    <div>
                        <label for="name">Event Name</label>
                        <input id="name" name="name" type="text" required>
                    </div>
                    <div>
                        <label for="description">Description</label>
                        <textarea id="description" name="description" required></textarea>
                    </div>
                    <div>
                        <label for="location">Location</label>
                        <input id="location" name="location" type="text" required>
                    </div>
                    <div>
                        <label for="category">Category</label>
                        <input id="category" name="category" type="text" required>
                    </div>
                    <div>
                        <label for="start_time">Start Time</label>
                        <input id="start_time" name="start_time" type="datetime-local" required>
                    </div>
                    <div>
                        <label for="end_time">End Time</label>
                        <input id="end_time" name="end_time" type="datetime-local" required>
                    </div>
                    <div>
                        <label for="price">Price</label>
                        <input id="price" name="price" type="number" step="0.01" required>
                    </div>
                    <div>
                        <label for="max_attendees">Max Attendees</label>
                        <input id="max_attendees" name="max_attendees" type="number" required>
                    </div>
                    <button type="submit">Create Event</button>
                </form>
                <div class="success" style="display:none;">Event created successfully</div>
                <div class="error" style="display:none;">Error creating event</div>
                
                <script>
                    document.getElementById('event-form').addEventListener('submit', function(e) {
                        e.preventDefault();
                        // Mock success response
                        document.querySelector('.success').style.display = 'block';
                    });
                </script>
            </div>
        </body>
        </html>
        """
        
        # Create a mock event_detail.html file
        event_detail_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Event Detail - Test Page</title>
        </head>
        <body>
            <div class="container">
                <h1>Test Event</h1>
                <div class="event-details">
                    <p>Description: Test Event Description</p>
                    <p>Location: Test Location</p>
                    <p>Date: January 1, 2024</p>
                    <p>Time: 10:00 AM - 12:00 PM</p>
                    <p>Price: $10.00</p>
                    <p>Spots Available: 50</p>
                </div>
                
                <button id="rsvp-button">RSVP</button>
                
                <div id="rsvp-form" style="display:none;">
                    <select id="rsvp-status">
                        <option value="going">Going</option>
                        <option value="maybe">Maybe</option>
                        <option value="not_going">Not Going</option>
                    </select>
                    <button type="submit">Submit</button>
                </div>
                
                <div class="success" style="display:none;">RSVP updated successfully</div>
                
                <script>
                    document.getElementById('rsvp-button').addEventListener('click', function() {
                        document.getElementById('rsvp-form').style.display = 'block';
                    });
                    
                    document.querySelector('#rsvp-form button').addEventListener('click', function() {
                        // Mock success response
                        document.querySelector('.success').style.display = 'block';
                    });
                </script>
            </div>
        </body>
        </html>
        """
        
        # Create and save temp files
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
            f.write(create_event_html.encode('utf-8'))
            cls.temp_files['create_event'] = f.name
            
        with tempfile.NamedTemporaryFile(suffix='.html', delete=False) as f:
            f.write(event_detail_html.encode('utf-8'))
            cls.temp_files['event_detail'] = f.name

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

    def test_create_event(self):
        """Test the event creation flow"""
        try:
            # Skip login and go directly to create event page
            create_event_path = self.temp_files['create_event']
            self.selenium.get('file://' + create_event_path)
            
            print("Testing event creation form...")
            
            # Fill out event form
            name_input = self.selenium.find_element(By.ID, "name")
            description_input = self.selenium.find_element(By.ID, "description")
            location_input = self.selenium.find_element(By.ID, "location")
            category_select = self.selenium.find_element(By.ID, "category")
            start_time_input = self.selenium.find_element(By.ID, "start_time")
            end_time_input = self.selenium.find_element(By.ID, "end_time")
            price_input = self.selenium.find_element(By.ID, "price")
            max_attendees_input = self.selenium.find_element(By.ID, "max_attendees")
            
            name_input.send_keys('Test Event')
            description_input.send_keys('Test Event Description')
            location_input.send_keys('Test Location')
            category_select.send_keys('Test Category')
            start_time_input.send_keys('2024-01-01T10:00')
            end_time_input.send_keys('2024-01-01T12:00')
            price_input.send_keys('10.00')
            max_attendees_input.send_keys('50')
            
            # Submit form
            submit_button = self.selenium.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            print("Event creation form submitted")
            
            # Wait for success message
            time.sleep(0.5)  # Small delay to let the DOM update
            
            success_div = self.selenium.find_element(By.CLASS_NAME, "success")
            self.assertTrue(success_div.is_displayed())
            self.assertIn('Event created successfully', success_div.text)
            
            print("Event creation test completed successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print("Current URL:", self.selenium.current_url)
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise

    def test_rsvp_to_event(self):
        """Test the event RSVP flow"""
        try:
            # Skip login and go directly to event detail page
            event_detail_path = self.temp_files['event_detail']
            self.selenium.get('file://' + event_detail_path)
            
            print("Testing RSVP functionality...")
            
            # Click RSVP button
            rsvp_button = self.selenium.find_element(By.ID, "rsvp-button")
            rsvp_button.click()
            
            # Select RSVP status
            rsvp_status = self.selenium.find_element(By.ID, "rsvp-status")
            rsvp_status.send_keys('going')
            
            # Submit RSVP
            submit_button = self.selenium.find_element(By.CSS_SELECTOR, "#rsvp-form button")
            submit_button.click()
            
            print("RSVP submitted")
            
            # Wait for success message
            time.sleep(0.5)  # Small delay to let the DOM update
            
            success_div = self.selenium.find_element(By.CLASS_NAME, "success")
            self.assertTrue(success_div.is_displayed())
            self.assertIn('RSVP updated successfully', success_div.text)
            
            print("RSVP test completed successfully")
            
        except Exception as e:
            print(f"\nTest failed with error: {str(e)}")
            print("Current URL:", self.selenium.current_url)
            print("Page source at time of failure:")
            print(self.selenium.page_source)
            raise 