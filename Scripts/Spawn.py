from flask import Flask, render_template, flash, request, url_for, redirect, session
import os
import string
import secrets
from datetime import datetime
import bcrypt
import re
import random
import uuid
import typing as tp
import sqlite3
import sys
sys.path.append(os.path.split(__file__)[0])
import Map_Utils
import Map_Generator
import json


proj_dir = os.path.split(os.path.split(__file__)[0])[0]
resource_dir = os.path.join(proj_dir, "Resources")
static_dir = os.path.join(proj_dir, 'static')
templates_dir = os.path.join(proj_dir, 'templates')
db_path = os.path.join(proj_dir, 'database.db')

app = Flask(__name__, static_folder=static_dir, template_folder=templates_dir)
app.config['SECRET_KEY'] = ''.join(
    secrets.choice(string.ascii_letters + string.digits) 
    for _ in range(32)
)

global_resources = dict()

#Utility
def close_db():
    if "conn" in global_resources:
        if global_resources["conn"]:
            global_resources["conn"].close()
        global_resources.pop("conn")
    if "cursor" in global_resources:
        global_resources.pop("cursor")
    if "Users_cols" in global_resources:
        global_resources.pop("Users_cols")

def open_db(reinit=False)->tuple[sqlite3.Connection, sqlite3.Cursor, list[str]]:
    if reinit:
        close_db()
    if "conn" not in global_resources or not global_resources["conn"]:
        global_resources["conn"] = sqlite3.connect(db_path, check_same_thread=False)
    if "cursor" not in global_resources or not global_resources["cursor"]:
        global_resources["cursor"] = global_resources["conn"].cursor()
    if "Users_cols" not in global_resources or not global_resources["Users_cols"]:
        global_resources["Users_cols"] = [
            record[1] for record in
            global_resources["cursor"].execute("PRAGMA table_info(Users)").fetchall()
        ]
    return (
        global_resources["conn"], global_resources["cursor"], 
        global_resources["Users_cols"], 
    )

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
        return cursor.execute("SELECT max_ppq FROM max_ppq").fetchone()[0]

#Pages
# Authentication
@app.route("/", methods=['GET', 'POST'])
@app.route("/home", methods=['GET', 'POST'])
@app.route('/login', methods=['GET', 'POST'])
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
                return redirect(url_for('generate_static', username=session["username"]))
        else:
            flash('Incorrect Username or Password', category='error')

    return render_template('login.html', username=session["username"])

@app.route('/signup', methods=['GET', 'POST'])
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
                    "INSERT INTO Users VALUES(?, ?, ?, ?, ?)",
                    (
                        uuid.uuid4().hex,
                        username,
                        pw_hash.decode(),
                        0, 
                        1
                    )
                )
            conn.commit()

            return redirect(url_for('login'))

    return render_template('signup.html', username=session["username"])

# Game
@app.route("/<username>/game/generate_static", methods=["GET"])
def generate_static(username):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    #Get a game map if one with less than 10 players in each quadrant
    with conn:
        player_level = cursor.execute("SELECT level FROM Users WHERE username = ?", (username,)).fetchone()[0]
        avaliable_map_id = cursor.execute(
            f"SELECT id FROM Games WHERE Q{player_level}_n_players < ?", 
            (get_max_ppq(),)
        ).fetchone()
        if avaliable_map_id:
            avaliable_map_id = avaliable_map_id[0]
            print(os.path.join(resource_dir, avaliable_map_id + ".json"))
            if os.path.exists(os.path.join(resource_dir, avaliable_map_id + ".json")) and False: #Change this later*********************************************************************8
                return redirect(url_for("game", username=session["username"], game_id=avaliable_map_id))

    #Otherwise, pass data and a map generator to the  loading page 
    # so it can load the game in real time
    quad_size = 18
    quadrants = [[[0 for _ in range(quad_size)] for _ in range(quad_size)] for _ in range(4)]

    #Preemptively save the name of the map file in the database
    save_file_name_no_ext = uuid.uuid4().hex
    with conn:
        cursor.execute("INSERT INTO Games VALUES(?, ?, ?, ?, ?)", (save_file_name_no_ext, 0, 0, 0, 0))
        conn.commit()
    
    #Create a list of numbers to possibly assign to each cell for each level. 
    # Each number means something different
    #  (0=blocked cell(default for all cells), 1=free cell, 2=free cell with coin, 3=free cell with enemy).
    # We will place the bias on simple open cells, then cells with coins/consumables,
    # then cells with enemies in that order and the maximum bias will decrease as the level increases.
    # This will result in less safe blocks and more enemies as the level increases
    cell_val_sets = [
        [1]*50 + [2]*49 + [3]*1,
        [1]*65 + [2]*32 + [3]*3,
        [1]*75 + [2]*21 + [3]*4,
        [1]*80 + [2]*15 + [3]*5,
    ]

    #Return a render of the game grid loader
    save_file_name = os.path.join(resource_dir, save_file_name_no_ext + ".json")
    return render_template(
        "generate_static.html", username=session["username"], 
        conn=conn, cursor=cursor, quad_size=quad_size,
        map_generators=[Map_Generator.in_grid_generator(
            quadrants[i], index=[quad_size//2, quad_size//2],
            length_bias=int(quad_size**(1 + 1/quad_size)), spawn_attempt_rate=1/(i+1),
            assign_from=cell_val_sets[i],
        ) for i in range(len(quadrants))],
        resources_dir=resource_dir,
        dump_fn=json.dump, dump_file=open(save_file_name, 'w')
    )

@app.route("/<username>/game/<game_id>", methods=["GET"])
def game(username, game_id):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    with open(os.path.join(resource_dir, game_id + ".json")) as game_file:
        grid = json.loads(game_file.read())
    return render_template("game.html", username=session["username"], grid=grid)

#Error handlers
@app.errorhandler(404)
def page_not_found(err):
    return render_template('404.html')

@app.errorhandler(500)
def server_error(err):
    return render_template('500.html')


if __name__ == '__main__':
    app.run(debug=True)