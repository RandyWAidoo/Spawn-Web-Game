import unittest
from flask import Flask, session
from Game import app  
from unittest.mock import patch, MagicMock

class FlaskAppTestCase(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_open_db(self):
        # This would require mocking sqlite3.connect and cursor methods
        with patch('sqlite3.connect') as mocked_connect:
            mocked_connect.return_value.__enter__.return_value.cursor.return_value.execute.return_value.fetchall.return_value = [(1, 'username')]
            from Game import open_db  
            conn, cur, cols = open_db()
            self.assertTrue(mocked_connect.called)
            

    def test_records_to_dicts(self):
        from Game import records_to_dicts
        records = [(1, 'John'), (2, 'Jane')]
        cols = ['id', 'name']
        expected = [{'id': 1, 'name': 'John'}, {'id': 2, 'name': 'Jane'}]
        result = records_to_dicts(records, cols)
        self.assertEqual(result, expected)

    def test_get_max_ppq(self):
        with patch('Game.open_db') as mock_open_db:
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_open_db.return_value = (mock_conn, mock_cursor, [])
            mock_cursor.execute.return_value.fetchone.return_value = [100]
            from Game import get_max_ppq
            result = get_max_ppq()
            self.assertEqual(result, 100)

    def test_login(self):
        response = self.app.post('/login', data={'username': 'user1', 'password': 'pass1'}, follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Incorrect Username or Password', response.data)

    def test_signup_functionality(self):
        response = self.app.post('/signup', data={'username': 'newuser', 'password': 'newpass', 'confirm_password': 'newpass'}, follow_redirects=True)
        self.assertIsNotNone(response.data)

    def test_generate_static(self):
        with self.app:
            with self.app.session_transaction() as sess:
                sess['username'] = 'valid_user'
            response = self.app.get('/valid_user/game/generate_static', follow_redirects=True)
            self.assertEqual(response.status_code, 200)
            
    def test_update_player_stats(self):
        with self.app:
            self.app.post('/login', data={'username': 'user', 'password': 'password'}, follow_redirects=True)
            response = self.app.get('/user/game/123/update_player_stats/50/2', follow_redirects=True)
            self.assertIn(b'', response.data)  # Check actual expected output

    def test_game_route(self):
        with self.app:
            self.app.post('/login', data={'username': 'user', 'password': 'password'}, follow_redirects=True)
            response = self.app.get('/user/game/123', follow_redirects=True)

if __name__ == '__main__':
    unittest.main()
