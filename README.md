Running the game:
-Run reinit.py: This creates the database and initializes all the tables required to run the game and folders.
-Run Game.py: This starts the server on 127.0.0.1:5000(browser url).

Game Work flow:
-After running the game, the title page is displayed and user has to choose to login, signup, or view other options.
-After signing up, they can login to go the game
-The player may be redirected to a loading page. The page should be left open until loading completes. The user will be automatically redirected to the game screen.
-Player can use arrow keys to navigate the player. The objective is to collect coins that will randomly spawn while avoiding touching their growing tails or any advesaries(mines) which will also randomly spawn
-There are 4 levels which are four quadrants: The easiest would be quadrant 1 and the difficulty increases when they move to next quadrant in a clockwise manner. 
-If the player touches any obstacle(tail, mine, wall), they die and start over with 0 points but their highscore is tracked
-The player's score and tail grow with each coin they collect
-The game will always begin at the players' current level even after they leave and return
