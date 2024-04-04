import sqlite3
import os

proj_dir = os.path.split(os.path.split(__file__)[0])[0]
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
    points INTEGER DEFAULT 0, level INTEGER DEFAULT 1)
    """
)
cursor.execute(
    """
    CREATE TABLE Games
    (id TEXT PRIMARY KEY, 
    Q1_n_players INTEGER DEFAULT 0, Q2_n_players INTEGER DEFAULT 0,
    Q3_n_players INTEGER DEFAULT 0, Q4_n_players INTEGER DEFAULT 0)
    """
)
cursor.execute("CREATE TABLE max_ppq(max_ppq INTEGER NOT NULL)")
cursor.execute("INSERT INTO max_ppq VALUES(20)")
conn.commit()