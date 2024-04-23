import unittest
from flask import Flask
from Game import app  

class FlaskTestCase(unittest.TestCase):

    def setUp(self):
        # Set up the app for testing
        self.app = app.test_client()
        self.app.testing = True

    def test_home_page(self):
        # Test the home page
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Welcome', response.data)  # Adjust the expected text based on your actual home page

    def test_login_page(self):
        # Test the login page
        response = self.app.get('/login')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Login', response.data)  # Adjust according to your login page's content

    # def test_login_functionality(self):
    #     # Test login functionality
    #     response = self.app.post('/login', data=dict(username="testuser", password="testpass"), follow_redirects=True)
    #     self.assertIn(b'Success', response.data)  # Check for a success message or redirect

    def test_signup_page(self):
        # Test the signup page access
        response = self.app.get('/signup')
        self.assertEqual(response.status_code, 200)

    # def test_invalid_signup(self):
    #     # Test invalid signup process
    #     response = self.app.post('/signup', data=dict(
    #         username="newuser", 
    #         password="newpass", 
    #         confirm_password="newpass1"
    #     ), follow_redirects=True)
    #     self.assertIn(b'Passwords do not match', response.data)

    # def test_update_player_stats(self):
    #     # Test updating player stats (you'll need to adjust based on how your auth works)
    #     with self.app:
    #         self.app.post('/login', data=dict(username="testuser", password="testpass"), follow_redirects=True)
    #         response = self.app.get('/testuser/game/123/update_player_stats/100/2', follow_redirects=True)
    #         self.assertEqual(response.status_code, 200)
    #         self.assertIn(b'Points Updated', response.data)  # Adjust based on actual response

if __name__ == '__main__':
    unittest.main()
