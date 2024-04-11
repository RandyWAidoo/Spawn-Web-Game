
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function listeq(a, b){
    if (a.length > b.length){
        for (let i=0; i<a.length; ++i){
            if (i >= b.length || a[i] !== b[i]){
                return false;
            }
        }
    }else{
        for (let i=0; i<b.length; ++i){
            if (i >= a.length || b[i] !== a[i]){
                return false;
            }
        }
    }
    return true;
}

function euclideanDist(v1, v2){
    let sqrd_sum = 0;
    if (v1.length > v2.length){
        for (let i=0; i<v1.length; ++i){
            if (i >= v2.length){
                break;
            }
            sqrd_sum += Math.pow((v1[i] - v2[i]), 2);
        }
    }else{
        for (let i=0; i<v2.length; ++i){
            if (i >= v1.length){
                break;
            }
            sqrd_sum += Math.pow((v2[i] - v1[i]), 2);
        }
    }
    return Math.sqrt(sqrd_sum);
}

function run_game(
    username, game_id, quad_size, player_level, 
    wall_image_path, character_image_path, character_head_image_path,
    coin_image_path, advesary_image_path, advesary_encounter_image_path,
    map_path, 
    // Grid values must never be -1 as -1 is the default for nonexistent tile indexes.
    // 0 means free cell, BOTH 1 & 2 mean wall, other values amean arbitrary things
    wall_value=1, coin_value=3, advesary_value=4 
){
    // Parse string parameters
    quad_size = JSON.parse(quad_size);
    player_level = JSON.parse(player_level);

    // Set up some universal variables/constants
    const mapSize = quad_size * 2 + 1;
    const cellSizeX = 32;
    const cellSizeY = 32;
    const characterSizeX = 32;
    const characterSizeY = 32;
    const mapSizeX = mapSize * cellSizeX;
    const mapSizeY = mapSize * cellSizeY;
    const mapStartPos = [0, 0];
    const mapEndPos = [mapStartPos[0] + mapSizeX, mapStartPos[1] + mapSizeY];
    const cameraSizeX = document.documentElement.clientWidth;
    const cameraSizeY = document.documentElement.clientHeight;
    let advesariesPerSec, coinsPerSec;
    let advesaryLifeSpan, coinLifeSpan;
    let advesaryInterval, coinInterval;
    let minPlayerXCentered, minPlayerYCentered, maxPlayerXCentered, maxPlayerYCentered;
    let playerPoints = 0;
    let pointsToAscend = 5;
    const hardMode = true;

    class Game extends Phaser.Scene
    {
        // Calculates the min and max values of the players' position
        setPlayerBounds(){
            minPlayerXCentered = Math.floor(mapStartPos[0] + cellSizeX * 0.5); // Level 1 value
            minPlayerYCentered = Math.floor(mapStartPos[0] + cellSizeX * 0.5); // Level 1 value
            if (player_level === 2){
                minPlayerXCentered = (quad_size + 1 + 0.5) * cellSizeX;
            }else if (player_level === 3){
                minPlayerXCentered = (quad_size + 1 + 0.5) * cellSizeX;
                minPlayerYCentered = (quad_size + 1 + 0.5) * cellSizeY;
            }else if (player_level === 4){
                minPlayerYCentered = (quad_size + 1 + 0.5) * cellSizeY;
            }
            maxPlayerXCentered = minPlayerXCentered + (quad_size - 1) * cellSizeX;
            maxPlayerYCentered = minPlayerYCentered + (quad_size - 1) * cellSizeY;
        }

        // Changes a tiles' value
        changeTileValue(tileLayer, x, y, value){
            let tile = tileLayer.getTileAtWorldXY(x, y, false);
            if (tile !== null){
                tile.index = value;
            }
        }

        // Set spawn rates lifespans, etc of enemies, coins, etc
        setSpawnParams(){
            advesariesPerSec = player_level / 1.3;
            coinsPerSec = 1 / player_level;
            coinLifeSpan = 7000;
            advesaryLifeSpan = 3000 - (player_level - 1) * 1000 / 2;
        }

        // Function to add an animation a tile as it spawns a coin, enemy, or whatever else.
        //  The function will repeat the animation on an interval and at random grid locations
        //  within the camera window. This is how we will set automate the spawning of coins , enemies, etc
        addSpawnAnimation(tileLayer, spawnsPerSec, frameGenerators, fps=2){
            return setInterval(() => {
                let randPosCentered;
                while (true){
                    let randGridPos = [
                        randInt(
                            Math.floor(minPlayerXCentered / cellSizeX), 
                            Math.floor(maxPlayerXCentered / cellSizeX)
                        ),
                        randInt(
                            Math.floor(minPlayerYCentered / cellSizeY), 
                            Math.floor(maxPlayerYCentered / cellSizeY)
                        )
                    ];

                    randPosCentered = [
                        Math.floor(cellSizeX * (randGridPos[0] + 0.5)), 
                        Math.floor(cellSizeY * (randGridPos[1] + 0.5))
                    ];

                    const tile = tileLayer.getTileAtWorldXY(randPosCentered[0], randPosCentered[1], true);
                    if (tile.index !== wall_value){ // Avoid spawn collision with walls
                        break;
                    }
                }

                let frameIndex = 0;
                const animationId = setInterval(() => {
                    if (frameIndex === frameGenerators.length){
                        clearInterval(animationId);
                    }else{
                        frameGenerators[frameIndex](randPosCentered[0], randPosCentered[1]);
                        ++frameIndex;
                    }
                },  1000 / fps);

            }, 1000 / spawnsPerSec);
        }

        //Add a sprite to the game
        addSprite(x, y, key){
            let sprite = this.add.sprite(characterSizeX, characterSizeY, key);
            sprite.x = x;
            sprite.y = y;
            return sprite;
        }

        // Game functions
        preload (){
            this.load.image('walls', wall_image_path);
            this.load.image('character_head', character_head_image_path);
            this.load.image('character', character_image_path);
            this.load.image('coin', coin_image_path);
            this.load.image('advesary', advesary_image_path);
            this.load.image('advesary_encounter', advesary_encounter_image_path);
            this.load.tilemapCSV('map', map_path);
        }

        create (){
            console.log("Game preloading complete");

            // Setup of the scene
            let game = this;
            let lost = false;
            let ascending = false;
            game.setSpawnParams();
            game.setPlayerBounds();
            game.cameras.main.setSize(cameraSizeX, cameraSizeY);
            game.cameras.main.setBounds(
                mapStartPos[0] - cellSizeX, 
                mapStartPos[1] - cellSizeY, 
                mapEndPos[0] + cellSizeX, 
                mapEndPos[1] + cellSizeY
            );
            game.add.text(Math.floor(minPlayerXCentered + characterSizeX), minPlayerYCentered, 'Move with Arrow Keys', {
                fontSize: '18px',
                fill: '#ffffff',
                backgroundColor: '#000000'
            });
            const map = game.make.tilemap({ key: 'map', tileWidth: cellSizeX, tileHeight: cellSizeY });
            const wallTileset = map.addTilesetImage('walls', null, cellSizeX, cellSizeY, 1, 2);
            const wallTileslayer = map.createLayer(0, wallTileset, 0, 0);
            let player = game.addSprite(minPlayerXCentered, minPlayerYCentered, 'character_head');
            let playerSnakeBody = [];
            game.cameras.main.startFollow(player);
            let posToAdvesaries = {};

            // Handle when the player loses
            function lose(msg="Oops! You can't touch that! You lose :("){
                lost = true;

                let lossMsg = game.add.text(
                    player.x, player.y,
                    msg, 
                    {
                        fontSize: '18px',
                        fill: '#ffffff',
                        backgroundColor: '#ea2a2a'
                    }
                );

                setTimeout(() => {
                    for (let bodyCell of playerSnakeBody){
                        bodyCell.destroy();
                    }
                    playerSnakeBody = [];
                    playerPoints = 0;
                    if (hardMode){
                        player_level = 1;
                        fetch(`/${username}/game/${game_id}/update_player_stats/${playerPoints}/${player_level}`);
                        game.setPlayerBounds();
                        game.setSpawnParams();
                    }
                    
                    lossMsg.destroy();

                    if (posToAdvesaries[[minPlayerXCentered, minPlayerYCentered]] !== undefined){ // Ensure respawn point is free
                        game.changeTileValue(wallTileslayer, minPlayerXCentered, minPlayerYCentered, 0); // Change value back
                        posToAdvesaries[[minPlayerXCentered, minPlayerYCentered]].destroy();
                        delete posToAdvesaries[[minPlayerXCentered, minPlayerYCentered]]; 
                    }
                    player.x = minPlayerXCentered;
                    player.y = minPlayerYCentered;

                    if (hardMode){
                        //*
                        clearInterval(advesaryInterval);
                        clearInterval(coinInterval);
                        advesaryInterval = addAdvesaryAnimation();
                        coinInterval = addCoinAnimation();
                        //*/
                    }

                    lost = false;
                }, 1000);
            }

            // A way to ensure a spawn is safe(nothing at the spawn location) before doing it
            function safeSpawn(x, y, spawnFn, otherConds=() => {return true;}){
                const tile = wallTileslayer.getTileAtWorldXY(x, y, true);
                if (lost || ascending
                    || [wall_value, coin_value, advesary_value].includes(tile.index)
                    || !otherConds())
                {
                    return;
                }
                spawnFn();
            }

            // A way to ensure a destroy is safe(the object exists) before doing it
            function safeDestroy(target){
                if (![null, undefined].includes(target)){
                    target.destroy();
                }
            }

            // Handle when a player collides with an advesary
            function handleAdvesaryCollision(){
                safeDestroy(posToAdvesaries[[player.x, player.y]]);
                posToAdvesaries[[player.x, player.y]] = game.addSprite(player.x, player.y, 'advesary_encounter');
                const [x, y] = [player.x, player.y];
                setTimeout(() => {
                    if (posToAdvesaries[[x, y]] !== undefined){
                        game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                        posToAdvesaries[[x, y]].destroy();
                        delete posToAdvesaries[[x, y]];
                    }
                }, 2000);
                lose();
            }

            // Add spawners for enemies and coins
            //  Enemy spawner. Ensure a position isn't occupied before spawning there
            function addAdvesaryAnimation() {
                return game.addSpawnAnimation(wallTileslayer, advesariesPerSec, [ 
                    (x, y) => {
                        safeSpawn(x, y, () => {posToAdvesaries[[x, y]] = game.addSprite(x, y, 'advesary');});
                    },
                    (x, y) => {safeDestroy(posToAdvesaries[[x, y]]);},
                    (x, y) => {
                        safeSpawn(x, y, () => {posToAdvesaries[[x, y]] = game.addSprite(x, y, 'advesary');});
                    },
                    (x, y) => {safeDestroy(posToAdvesaries[[x, y]]);},
                    (x, y) => {
                        safeSpawn(x, y, () => {
                            posToAdvesaries[[x, y]] = game.addSprite(x, y, 'advesary');
                            game.changeTileValue(wallTileslayer, x, y, advesary_value);
                            if (listeq([player.x, player.y], [x, y])){ // Handle the case when the player overlaps the advesary at spawn point
                                handleAdvesaryCollision(false);
                            }
                            setTimeout(() => {
                                if (posToAdvesaries[[x, y]] !== undefined){ // May not be there due to immediate deletion after an encounter
                                    game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                                    posToAdvesaries[[x, y]].destroy();
                                    delete posToAdvesaries[[x, y]];
                                }
                            }, advesaryLifeSpan);
                        });
                    }
                ], 3);
            } 
            advesaryInterval = addAdvesaryAnimation();
            
            //  Coin spawner.
            //  Only 1 coin at a a time will exist on the screen. 
            //  Destroy upon timeout or collection. Player dies on timeout
            let currCoin = null; 
            let coinMutex = false; // Coin creation must be locked until timeout, even if already collected
            let coinDestroyed = false;
            function addCoinAnimation(){
                return game.addSpawnAnimation(wallTileslayer, coinsPerSec, [ 
                    (x, y) => {
                        safeSpawn(x, y, () => {
                            coinMutex = true;
                            currCoin = game.addSprite(x, y, 'coin');
                            coinDestroyed = false;
                            game.changeTileValue(wallTileslayer, x, y, coin_value);
                            // Set timeout and associated behavior with a rule: 
                            //  The farther from the player the coin is, 
                            //  the more time they have to find it
                            let lifeSpan = coinLifeSpan + euclideanDist([player.x, player.y], [x, y]);
                            setTimeout(() => {
                                if (!coinDestroyed){ // Could have already been destroyed by player collection
                                    game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                                    currCoin.destroy();
                                    coinDestroyed = true;

                                    if (!lost && !ascending && playerPoints){
                                        // Take way the players' last body cell or kill the player 
                                        //  if they don't pick up a coin on time 
                                        if (playerSnakeBody.length > 0){
                                            playerSnakeBody[playerSnakeBody.length - 1].destroy();
                                            playerSnakeBody.pop()
                                        }else{
                                            lose("Too slow!");
                                        }
                                    }
                                }
                                coinMutex = false;
                            }, lifeSpan);
                        }, () => {return (coinMutex === false);}); // current coin may not already be initialized
                    }
                ]);
            }
            coinInterval = addCoinAnimation();

            // Utility functions
            function calcLeft(x){
                return x - cellSizeX;
            }
            function calcRight(x){
                return x + cellSizeX;
            }
            function calcUp(y){
                return y - cellSizeY;
            }
            function calcDown(y){
                return y + cellSizeY;
            }

            function leftInBounds(x){
                return (calcLeft(x) >= minPlayerXCentered);
            }
            function rightInBounds(x){
                return (calcRight(x) <= maxPlayerXCentered);
            }
            function upInBounds(y){
                return (calcUp(y) >= minPlayerYCentered);
            }
            function downInBounds(y){
                return (calcDown(y) <= maxPlayerYCentered);
            }

            // Extend the player body when they earn points
            function extendSnakeBody(){
                // Determine if a new body cells' potential future position collides with something
                function isCollision(x, y){
                    if (listeq([x, y], [player.x, player.y])){
                        return true;
                    }
                    for (const bodyCell of playerSnakeBody){
                        if (listeq([x, y], [bodyCell.x, bodyCell.y])){
                            return true;
                        }
                    }
                    
                    let tile = wallTileslayer.getTileAtWorldXY(x, y, true);
                    if (tile.index === wall_value){
                        return true;
                    }
                    
                    return false;
                }

                // Create and position then new body cell
                const lastPlayerBodyCellIdx = playerSnakeBody.length - 1;
                let lastPlayerBodyCell;
                if (lastPlayerBodyCellIdx === -1){
                    lastPlayerBodyCell = player;
                }else{
                    lastPlayerBodyCell = playerSnakeBody[lastPlayerBodyCellIdx];
                }
                
                let newBodyCell = game.addSprite(lastPlayerBodyCell.x, lastPlayerBodyCell.y, 'character');

                let xResolved = false;
                if (leftInBounds(lastPlayerBodyCell.x)){
                    if (!isCollision(calcLeft(lastPlayerBodyCell.x), lastPlayerBodyCell.y)){
                        newBodyCell.x = calcLeft(lastPlayerBodyCell.x);
                        xResolved = true;
                    }
                }
                else if (rightInBounds(lastPlayerBodyCell.x)){
                    if (!isCollision(calcRight(lastPlayerBodyCell.x), lastPlayerBodyCell.y)){
                        newBodyCell.x = calcRight(lastPlayerBodyCell.x);
                        xResolved = true;
                    }
                }

                if (!xResolved && upInBounds(lastPlayerBodyCell.y)){
                    if (!isCollision(lastPlayerBodyCell.x, calcUp(lastPlayerBodyCell.y))){
                        newBodyCell.y = calcUp(lastPlayerBodyCell.y);
                    }
                }
                else if (!xResolved && downInBounds(lastPlayerBodyCell.y)){
                    if (!isCollision(lastPlayerBodyCell.x, calcDown(lastPlayerBodyCell.y))){
                        newBodyCell.y = calcDown(lastPlayerBodyCell.y);
                    }
                }

                playerSnakeBody.push(newBodyCell);
            }

            // Handle when a player collides with a coin
            function handleCoinCollision(){
                // Handle body size/point increment
                if (playerSnakeBody.length < 4- player_level){
                    extendSnakeBody();
                }
                ++playerPoints;
                if (currCoin !== null 
                    && listeq([player.x, player.y], [currCoin.x, currCoin.y])) //Could have just been naturally destroyed
                { 
                    // Collect the coin
                    game.changeTileValue(wallTileslayer, player.x, player.y, 0); // Change value back
                    currCoin.destroy();
                    coinDestroyed = true;
                }

                // Handle level transference once enough points are gathered
                if (playerPoints > 0 && playerPoints % pointsToAscend === 0){
                    const origPlayerLevel = player_level;

                    let ascensionMsg;
                    if (origPlayerLevel < 4 ){ // No ascension at max level
                        ascending = true;

                        ascensionMsg = game.add.text(
                            player.x, player.y, 
                            "Congrats! You've unlocked the next level!", 
                            {
                                fontSize: '18px',
                                fill: '#ffffff',
                                backgroundColor: '#16df31'
                            }
                        );
                    }

                    setTimeout(() => {
                        if (origPlayerLevel < 4 ){ // No ascension level increment at max level
                            player_level = player_level + 1;
                        }
                        
                        fetch(`/${username}/game/${game_id}/update_player_stats/${playerPoints}/${player_level}`);

                        if (origPlayerLevel < 4 ){ // No ascension reset at max level
                            game.setPlayerBounds();
                            ascensionMsg.destroy();
                            game.setSpawnParams();

                            for (let bodyCell of playerSnakeBody){
                                bodyCell.destroy();
                            }
                            playerSnakeBody = [];
                            player.x = minPlayerXCentered;
                            player.y = minPlayerYCentered;

                            //*
                            clearInterval(advesaryInterval);
                            clearInterval(coinInterval);
                            advesaryInterval = addAdvesaryAnimation();
                            coinInterval = addCoinAnimation();
                            //*/
                            
                            ascending = false;
                        }
                    }, 1000);
                }
            }

            // Handle when a players' head moves to a new position
            function handleNewPlayerHeadPosition(headTile){
                if (headTile === null){
                    return;
                }
                
                if (headTile.index === wall_value){
                    lose();
                }else if (headTile.index === advesary_value){
                    handleAdvesaryCollision();
                }else if (headTile.index === coin_value){
                    handleCoinCollision();
                }
                // Make the player lose upon touching themselves if their level is high enough
                else if (player_level >= 3){
                    for (const bodyCell of playerSnakeBody){
                        if (listeq([player.x, player.y], [bodyCell.x, bodyCell.y])){
                            lose("Oops! You can't touch your tail!");
                            break;
                        }
                    }
                }
            }

            // Move the snake body to follow the players' head
            function moveSnakeBody(oldPos){
                for (let i=0; i<playerSnakeBody.length; ++i){
                    let currPos = [playerSnakeBody[i].x, playerSnakeBody[i].y];
                    playerSnakeBody[i].x = oldPos[0];
                    playerSnakeBody[i].y = oldPos[1];
                    oldPos = currPos;
                }
            }

            // Handling going Left
            game.input.keyboard.on('keydown-LEFT', function left(event)
            {
                if (!ascending && !lost){
                    let oldPos = [player.x, player.y];
                    if (leftInBounds(player.x)){
                        player.x = calcLeft(player.x);
                        moveSnakeBody(oldPos);
                    }

                    handleNewPlayerHeadPosition(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                }
            });

            // Handling going Right
            game.input.keyboard.on('keydown-RIGHT', function right(event)
            {
                if (!ascending && !lost){
                    let oldPos = [player.x, player.y];
                    if (rightInBounds(player.x)){
                        player.x = calcRight(player.x);
                        moveSnakeBody(oldPos);
                    }
                    
                    handleNewPlayerHeadPosition(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                }
            });

            // Handling going Up
            game.input.keyboard.on('keydown-UP', function up(event)
            {
                if (!ascending && !lost){
                    let oldPos = [player.x, player.y];
                    if (upInBounds(player.y)){
                        player.y = calcUp(player.y);
                        moveSnakeBody(oldPos);
                    }
                    
                    handleNewPlayerHeadPosition(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                }
            });

            // Handling going Down
            game.input.keyboard.on('keydown-DOWN', function down(event){
                if (!ascending && !lost){
                    let oldPos = [player.x, player.y];
                    if (downInBounds(player.y)){
                        player.y = calcDown(player.y);
                        moveSnakeBody(oldPos);
                    }
                    
                    handleNewPlayerHeadPosition(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                }
            });

            console.log("Game started");
        }
    }

    const config = {
        type: Phaser.AUTO,
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        parent: 'phaser-example',
        pixelArt: true,
        backgroundColor: '#1a1a2d',
        scene: Game
    };

    const game = new Phaser.Game(config);
}