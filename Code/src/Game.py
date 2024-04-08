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
import pandas as pd
import sys
import Map_Utils
from Map_Generator import in_grid_generator

#Set up
proj_dir = os.path.split(os.path.split(os.path.split(__file__)[0])[0])[0]
resource_dir = os.path.join(proj_dir, "Resources")
static_dir = os.path.join(proj_dir, 'static')
templates_dir = os.path.join(proj_dir, 'templates')
db_path = os.path.join(proj_dir, 'database.sqlite3')

app = Flask(__name__, static_folder=static_dir, template_folder=templates_dir)
app.config['SECRET_KEY'] = ''.join(
    secrets.choice(string.ascii_letters + string.digits) 
    for _ in range(32)
)

global_resources = dict()

#Create a list of numbers to possibly assign to each cell for each level. 
# Each number means something different
#  (0=blocked cell(default for all cells), 1=free cell, 2=free cell with coin, 3=free cell with enemy).
# We will place the bias on simple open cells, then cells with coins/consumables,
# then cells with enemies in that order and the maximum bias will decrease as the level increases.
# This will result in less safe blocks and more enemies as the level increases
global_resources["cell_val_sets"] = [
    [1]*50 + [2]*49 + [3]*1,
    [1]*65 + [2]*32 + [3]*3,
    [1]*75 + [2]*21 + [3]*4,
    [1]*80 + [2]*15 + [3]*5,
]

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
@app.route("/<username>/generate_next/<quadrant_idx>/<iteration>/<grid_height>/<grid_width>/<endless>")
def generate_next(username, quadrant_idx, iteration, grid_width, grid_height, endless):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    quadrant_idx = int(quadrant_idx)
    iteration = int(iteration)
    grid_height, grid_width = int(grid_height), int(grid_width)
    endless = (endless == "true")

    #Create the generators if need be
    if iteration == 1 or "generators" not in global_resources:
        largest_dim = max(grid_height, grid_width)
        grid = [[0 for _ in range(grid_width)] for _ in range(grid_height)]

        global_resources["generators"] = [ 
            in_grid_generator(
                grid, [grid_height//2, grid_width//2], 
                length_bias=int(largest_dim**(1 + 1/largest_dim)), 
                spawn_attempt_rate=1/(quadrant_idx + 1),
                assign_from=global_resources["cell_val_sets"][quadrant_idx]
            ),
            in_grid_generator(
                grid, [grid_height//2, grid_width//2], 
                length_bias=int(largest_dim**(1 + 1/largest_dim)), 
                spawn_attempt_rate=1/(quadrant_idx + 1),
                assign_from=[0]
            )
        ]
        global_resources["generator_idx"] = 0

    #Perform an iteration and return the result
    generators = global_resources["generators"]
    changed = ([], None)
    try:
        changed = next(generators[global_resources["generator_idx"]])
        changed = changed[1:]
        #Increment builder index if in endless mode
        if endless:
            global_resources["generator_idx"] = (
                (global_resources["generator_idx"] + 1) 
                % len(global_resources["generators"])
            )
    #When the grid is done, then indicate its completion and free the map builder generator fcn
    # or reinitialize the generators
    except StopIteration as err:
        if not endless:
            global_resources.pop("generators")
        else:
            if global_resources["generator_idx"] == 0:
                largest_dim = max(grid_height, grid_width)
                grid = [[0 for _ in range(grid_width)] for _ in range(grid_height)]
                generators[0] = in_grid_generator(
                    grid, 
                    [random.randint(0, grid_height-1), random.randint(0, grid_width-1)], 
                    length_bias=int(largest_dim**(1 + 1/largest_dim)), 
                    spawn_attempt_rate=1/(quadrant_idx + 1),
                    assign_from=global_resources["cell_val_sets"][quadrant_idx]
                )
                changed = next(generators[0])[1:]

            elif global_resources["generator_idx"] == 1:
                largest_dim = max(grid_height, grid_width)
                grid = [[0 for _ in range(grid_width)] for _ in range(grid_height)] 
                generators[1] = in_grid_generator(
                    grid, 
                    [random.randint(0, grid_height-1), random.randint(0, grid_width-1)], 
                    length_bias=int(largest_dim**(1 + 1/largest_dim)), 
                    spawn_attempt_rate=1/(quadrant_idx + 1),
                    assign_from=[0]
                )
                changed = next(generators[1])[1:]

    return list(changed)

@app.route("/<username>/game/generate_static", methods=["GET", "POST"])
def generate_static(username):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()
    debug = False

    #Save a generated map when the map generation page sends one back
    if request.method == "POST":
        data = request.get_json()
        game_id = data["game_id"]
        save_file_path = os.path.join(resource_dir, game_id + ".csv")
        if not debug:
            grid = data["map"]
            columns = grid[0]
            grid = grid[1:]
            del data
            pd.DataFrame(data=grid, columns=columns).to_csv(save_file_path, index=False)
        return ""

    #Get a game map if one with less than 10 players in each quadrant
    with conn:
        player_level = cursor.execute("SELECT level FROM Users WHERE username = ?", (username,)).fetchone()[0]
        avaliable_map_id = cursor.execute(
            f"SELECT id FROM Games WHERE Q{player_level}_n_players < ?", 
            (get_max_ppq(),)
        ).fetchone()
        if avaliable_map_id:
            avaliable_map_id = avaliable_map_id[0]
            if os.path.exists(os.path.join(resource_dir, avaliable_map_id + ".csv")) and not debug:
                return redirect(url_for("game", username=session["username"], game_id=avaliable_map_id))

    #Preemptively save the name of the map file in the database
    game_id = uuid.uuid4().hex
    with conn:
        if not debug:
            cursor.execute("INSERT INTO Games VALUES(?, ?, ?, ?, ?)", (game_id, 0, 0, 0, 0))
            conn.commit()

    return render_template(
        "generate_static.html", username=session["username"], 
        cell_val_sets=global_resources["cell_val_sets"], game_id=game_id
    )

@app.route("/<username>/game/<game_id>", methods=["GET"])
def game(username, game_id):
    if "username" not in session or session["username"] != username:
        return redirect(url_for("login"))

    conn, cursor, Users_cols = open_db()

    game_file_path = os.path.join(resource_dir, game_id + ".csv")
    if os.path.exists(game_file_path):
        return render_template("game.html", username=session["username"], map_path=game_file_path)
    
    return redirect(url_for('generate_static', username=session["username"]))

#Error handlers
@app.errorhandler(404)
def page_not_found(err):
    return render_template('404.html')

@app.errorhandler(500)
def server_error(err):
    return render_template('500.html')


if __name__ == '__main__':
    app.run(debug=True)