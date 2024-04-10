How to run a game :

Setting up the server to run a game:
-Run reinint_user_db.py : This creates the database and initializes all the tables required to run the game.
-Run Game.py : This starts the server on 127.0.0.1:5000(browser url).

Game Work flow:
-After running the game, signin page is displayed and user has to signup.
-After signing up, they can login to go the game
-The player may be redirected to a loading page. The page should be left open until loading completes and the user is automatically redirected to the game screen.
-Player can use arrow key functions to navigate the player. The objective is to collect coins that will randomly spawn while avoiding touching themselves or any advesaries(mines) which will also randomly spawn
-There are 4 levels which are four quadrants: The easiest would be quadrant 1 and the difficulty increases when they move to next quadrant in a clockwise manner. 
-If player touches any obstacle, he dies.
-Player's score increases depending on how many coins they have gathered
-If the player dies, the game restarts at the players' current level.
-The game will always begin at the players' current level including after they leave and return
