import sqlite3
import os

proj_dir = os.path.split(os.path.split(os.path.split(__file__)[0])[0])[0]
db_path = os.path.join(proj_dir, 'database.sqlite3')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute('DROP TABLE IF EXISTS Users')
cursor.execute('DROP TABLE IF EXISTS Games')
cursor.execute('DROP TABLE IF EXISTS max_ppq')

cursor.execute(
    """
    CREATE TABLE Users
    (id TEXT PRIMARY KEY, 
    username TEXT UNIQUE, pw_hash TEXT, 
    points INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
    high_score INTEGER DEFAULT 0)
    """
)
conn.commit()

map_dir = os.path.join(proj_dir, 'static', "maps")
if not os.path.exists(map_dir):
    os.mkdir(map_dir)