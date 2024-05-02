from flask import Flask, render_template, flash, request, url_for, redirect, session
import os
import string
import secrets
from datetime import datetime
import bcrypt
import uuid
import typing as tp
import sqlite3
import pandas as pd
import random

#Set up
proj_dir = os.path.split(os.path.split(os.path.split(__file__)[0])[0])[0]
temp_dir = os.path.join(proj_dir, "tmp")
static_dir = os.path.join(proj_dir, 'static')
map_dir = os.path.join(static_dir, "maps")
templates_dir = os.path.join(proj_dir, 'templates')
db_path = os.path.join(proj_dir, 'database.sqlite3')

app = Flask(__name__, static_folder=static_dir, template_folder=templates_dir)
app.config['SECRET_KEY'] = ''.join(
    secrets.choice(string.ascii_letters + string.digits) 
    for _ in range(32)
)

global_resources = dict()

#Define a quadrant size for all game maps
global_resources["quad_size"] = 25

#Create a list of numbers to possibly assign to each cell for each level. 
# Each number means something different
#  (0=blocked cell(default for all cells), 1=free cell, 2=free cell with coin, 3=free cell with enemy).
# We will place the bias on simple open cells, then cells with coins/consumables,
# then cells with enemies in that order and the maximum bias will decrease as the level increases.
# This will result in less safe blocks, less coins, and more enemies as the level/quadrant increases
global_resources["cell_val_sets"] = [
    [1],#[1]*50 + [2]*49 + [3]*1,#
    [1],#[1]*65 + [2]*32 + [3]*3,#
    [1],#[1]*75 + [2]*21 + [3]*4,#
    [1],#[1]*80 + [2]*15 + [3]*5,#
]

#Utility
def open_db()->tuple[sqlite3.Connection, sqlite3.Cursor, list[str]]:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    cursor = conn.cursor()
    with conn:
        Users_cols = [
            record[1] for record in
            cursor.execute("PRAGMA table_info(Users)").fetchall()
        ]
    return (conn, cursor, Users_cols)

def records_to_dicts(records: list[tuple], col_list: list)->list[dict]:
    return [
        {
            col_list[i]: record[i] 
            for i in range(len(record))
        } 
        for record in records
    ]

def get_max_ppq():
    conn, cursor, User_cols = open_db()

    with conn:
        res = cursor.execute("SELECT max_ppq FROM max_ppq").fetchone()[0]
    
    conn.close()
    return res

#Pages
# Game rules
@app.route("/rules/")
def rules():
    return render_template("rules.html")


# Home
@app.route("/", methods=['GET', 'POST'])
@app.route("/home/", methods=['GET', 'POST'])
def title_page():
    return render_template("title_page.html")

# Authentication
@app.route('/login/', methods=['GET', 'POST'])
def login():
    conn, cursor, Users_cols  = open_db()

    username = None
    pw = None
    login_success = False
    session["username"] = None

    if request.method == "POST":
        username = request.form["username"]
        pw = request.form["password"]
        with conn:
            pw_hash = cursor.execute(
                "SELECT pw_hash FROM Users WHERE username = ?",
                (username,)
            ).fetchone()
        if pw_hash:
            pw_hash = pw_hash[0]
            if bcrypt.checkpw(pw.encode(), pw_hash.encode()):
                session["username"] = username
                conn.close()
                return redirect(url_for('generate_static', username=session["username"]))
        else:
            flash('Incorrect Username or Password', category='error')

    conn.close()
    return render_template('login.html')

@app.route('/signup/', methods=['GET', 'POST'])
def signup():
    conn, cursor, Users_cols  = open_db()

    if request.method == "POST":
        username = request.form["username"]
        pw = request.form["password"]
        confirm_pw = request.form["confirm_password"]

        pw_confirmed = (pw == confirm_pw)
        username_valid = (','  not in username)
        with conn:
            username_unique = (not cursor.execute(
                "SELECT 1 FROM Users WHERE username = ?", 
                (username,)
            ).fetchall())

        if not pw_confirmed:
            flash('Passwords do not match', 'error')
        elif not username_valid:
            flash(f"Invalid letter ',' in username", 'error')
        elif not username_unique:
            flash(f'Username is unavailable', 'error')
        else:
            pw_hash = bcrypt.hashpw(pw.encode(), salt=bcrypt.gensalt())
            with conn:
                cursor.execute(
                    "INSERT INTO Users VALUES(?, ?, ?, ?, ?, ?)",
                    (
                        uuid.uuid4().hex,
                        username,
                        pw_hash.decode(),
                        0, 
                        1, 
                        0
                    )
                )
            conn.commit()

            conn.close()
            return redirect(url_for('login'))

    conn.close()
    return render_template('signup.html')

# Game
#  API urls
@app.get("/<username>/game/<game_id>/get_rank/<collisions>/")
@app.get("/<username>/game/<game_id>/get_rank/")
def get_rank(username, game_id, collisions="False"):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    collisions = (collisions.lower() == "true")
    user_high_score = cursor.execute(
        "SELECT high_score FROM Users WHERE username = ?", (username,)
    ).fetchone()[0]
    user_rank = cursor.execute(
        f"SELECT COUNT({'DISTINCT'*collisions} high_score) FROM Users WHERE high_score > ?",
        (user_high_score,)
    ).fetchone()[0] + 1

    conn.close()
    return str(user_rank)

@app.get("/<username>/game/<game_id>/get_leaderboard/<limit>/<offset>/<collisions>/")
@app.get("/<username>/game/<game_id>/get_leaderboard/<limit>/<offset>/")
@app.get("/<username>/game/<game_id>/get_leaderboard/<limit>/")
@app.get("/<username>/game/<game_id>/get_leaderboard/")
def get_leaderboard(username, game_id, limit=5, offset=0, collisions="False"):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    collisions = (collisions.lower() == "true")
    query = f"""
        DROP TABLE IF EXISTS high_scores_desc;
        CREATE TABLE high_scores_desc(
            rank INTEGER PRIMARY KEY AUTOINCREMENT, 
            high_score INTEGER UNIQUE
        );
        INSERT INTO high_scores_desc(high_score) 
        SELECT {"DISTINCT"*collisions} high_score FROM Users
        ORDER BY high_score DESC;

        DROP TABLE IF EXISTS users_to_ranks_to_scores;
        CREATE TABLE users_to_ranks_to_scores(username TEXT PRIMARY KEY, rank INTEGER, high_score INTEGER);
        INSERT INTO users_to_ranks_to_scores
        SELECT username, rank, Users.high_score FROM 
        high_scores_desc JOIN Users ON high_scores_desc.high_score = Users.high_score
        LIMIT {int(limit)}
        OFFSET {int(offset)};

        DROP TABLE high_scores_desc;
    """
    cursor.executescript(query)
    conn.commit()
    data = cursor.execute("SELECT * FROM users_to_ranks_to_scores").fetchall()
    cursor.execute("DROP TABLE users_to_ranks_to_scores")
    conn.commit()

    conn.close()
    return data

@app.get("/<username>/game/<game_id>/update_player_stats/<points>/<level>/")
def update_player_stats(username, game_id, points, level):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    points = int(points)
    level = int(level)
    with conn:
        cursor.execute(
            """
            UPDATE Users 
            SET points = ?,  
            high_score = 
                CASE
                    WHEN high_score < ? THEN ?
                    ELSE high_score
                END,
            level = ?
            WHERE username = ?
            """,
            (points, points, points, level, username)
        )
        conn.commit()

    conn.close()
    return ""

#  User pages
@app.route("/<username>/game/generate_static/", methods=["GET", "POST"])
def generate_static(username):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()
    debug = False

    #Save a generated map when the map generation page sends one back
    if request.method == "POST":
        data = request.get_json()
        game_id = data["game_id"]
        save_file_path = os.path.join(map_dir, game_id + ".csv")
        if not debug:
            #Make values above 0 equal 0 and values equaling 0 equal 1. 
            # This is needed for phaser to properly process the csv
            for row in data["map"]:
                for i in range(len(row)):
                    if row[i] > 0:
                        row[i] = 0
                    else: 
                        row[i] = 1

            #Prep the data to be turned into a csv
            columns = data["map"][0]
            grid = data["map"][1:]

            #Save the csv
            pd.DataFrame(data=grid, columns=columns).to_csv(save_file_path, index=False)
        
        conn.close()
        return ""

    #Get a game map if one with less than n players in each quadrant
    with conn:
        player_level = cursor.execute("SELECT level FROM Users WHERE username = ?", (username,)).fetchone()[0]
    available_maps = os.listdir(map_dir)
    if available_maps:
        available_map = random.choice(available_maps)
        if not debug:
            conn.close()
            return redirect(url_for("game", username=session["username"], game_id=available_map[:available_map.find(".")]))

    #Preemptively save the name of the map file in the database
    game_id = uuid.uuid4().hex

    conn.close()
    return render_template(
        "generate_static.html", username=session["username"], 
        quad_size=global_resources["quad_size"],
        cell_val_sets=global_resources["cell_val_sets"], game_id=game_id
    )

@app.route("/<username>/game/<game_id>/", methods=["GET"])
def game(username, game_id):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    with conn:
        player_level = cursor.execute("SELECT level FROM Users WHERE username = ?", (username,)).fetchone()[0]
    game_file_path = os.path.join(map_dir, game_id + ".csv")
    if os.path.exists(game_file_path):
        conn.close()
        return render_template(
            "game.html", 
            username=session["username"], 
            quad_size=global_resources["quad_size"],
            game_id=game_id, player_level=player_level    
        )
    
    conn.close()
    return redirect(url_for('generate_static', username=session["username"]))


# Leaderboard
@app.route("/leaderboard/")
def leaderboard():
    conn, cursor, Users_cols = open_db()
    try:
        query = "SELECT username, points FROM Users ORDER BY points DESC"
        cursor.execute(query)
        leaderboard_data = cursor.fetchall()
    finally:
        conn.close()  # Ensure the connection is closed even if an error occurs
    return render_template("leaderboard.html", users=leaderboard_data)


#Error handlers
@app.errorhandler(404)
def page_not_found(err):
    return render_template('404.html')

@app.errorhandler(500)
def server_error(err):
    return render_template('500.html')


if __name__ == '__main__':
    app.run(debug=True)