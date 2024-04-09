How to run a game :

Setting up the server to run a game:
-Run reinin_user_db.py : This creates the database and initializes all the tables required to run the game.
-Run Spawn.py : This generates the game map and initializes all the quadrats for the game and server 127.0.0.5000 is initialized which we can run in the browser

Game Work flow:
-After running the game, signin page is displayed and user has to signup.
-After signing up, they can login to the game which would take the user to title page 
-This is where a user can start the game or see the leaderboard
-If player chooses to start the game, the map is generated and taken to main game page
-Player can use WASD functions to navigate the player (W: Move Up, S: Move Down, A:Move right, D: Move Left)
-Player can use WASD functions to move around the map and complete their level.
-There are 4 levels which are four quadrants: The easiest would be quadrant 1 and the difficulty increases when they move to next quadrant)
-If player touches any obstacle, he dies.
-Player's score increases depending on how many obstacles they have cleared and their score is updated in the leaderboard.
_After player dies, he is redirected to the title page where he can chose to play game again or quit.
