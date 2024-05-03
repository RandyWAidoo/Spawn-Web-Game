let debug = false;
var playerDir = "";
var lost = false;
var ascending = false;
var playerPoints = 0;
var pointsToAscend = 15;
var username = null;
var game_id = null;
var playerSnakeBody = [];
var player = null;
var player_level = null;
var quad_size = null

//Random movement --> level 4
//Auto movement --> level2+
//Sound effects for powerups
var mapSize = null;
const cellSizeX = 32;
const cellSizeY = 32;
const characterSizeX = 32;
const characterSizeY = 32;
var mapSizeX = null;
var mapSizeY = null;
var mapStartPos = null;
var mapEndPos = null;
var cameraSizeX = document.documentElement.clientWidth;
var cameraSizeY = document.documentElement.clientHeight;
var advesariesPerSec;
var coinsPerSec;
var minPlayerXCentered, minPlayerYCentered, maxPlayerXCentered, maxPlayerYCentered;

var fastCoinsPerSec, slowCoinsPerSec, blueCoinsPerSec, randomCoinsPerSec;
//var fastCoinInteveral, slowCoinInterval, blueCoinInterval, randomCoinInterval;
var fastCoinLifeSpan, slowCoinLifeSpan, blueCoinLifeSpan, randomCoinLifeSpan;

var map = null;
var wallTileset = null;
var wallTileslayer = null;
posToCoins = {};
posToAdvesaries = {};
var coinsRemaining = null;

const wall_value=1;
const coin_value=3;
const advesary_value=4;

const bcoin_value = 5;
const fcoin_value = 6;
const scoin_value = 7;
const rcoin_value = 8;

var wait_before_movement = 10;
var wait_time = 4;
var wait_multiplier = 1.5;
var entire_game = null;

var advesaryInterval, coinInterval;
var advesaryLifeSpan;
var coinLifeSpan;

var bCoinInterval, fCoinInterval, sCoinInterval, rCoinInterval;

var movements = ['keydown-LEFT', 'keydown-RIGHT', 'keydown-UP', 'keydown-DOWN']

var move = 0; //Set this to 0 at all times if the level is greater than 1

var instructionMsg;

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
        if (tile.index === 1){ //wall_value
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
    
    let newBodyCell = entire_game.addSprite(lastPlayerBodyCell.x, lastPlayerBodyCell.y, 'character');

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

// Send out player stats
function sendPlayerStats(){
    fetch(
        `/${username}/game/${game_id}/update_player_stats/${playerPoints*player_level}/${player_level}/`, 
        {method: "POST"}
    );
    
    fetch(`/${username}/game/${game_id}/get_leaderboard/5/0/`)
    .then((response) => {
        return response.json();
    })
    .then((records) => {
        // Build data to send
        data = {
            "data": [
                {
                    "Group": "Calico",
                    "Title": "Top 5 Scores"
                }
            ]
        };
        for (let i=0; i<5; ++i){
            if (i >= records.length){
                data["data"][0][`N/A ${i + 1}`] = "N/A";
            }else{data["data"][0][records[i][0]] = records[i][1];}
        }
        console.log("Sending:", data, "...");

        // Send and handle the reponse to the data
        let url = debug 
                  ? `/health/`
                  : "https://eope3o6d7z7e2cc.m.pipedream.net"
        fetch(url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .catch((reason) => {
            console.log(`Error on POST to ${url}:`, reason);
        });
    });
}

function resetIntervals(){
    clearInterval(advesaryInterval);
    clearInterval(coinInterval);
    clearInterval(bCoinInterval);
    clearInterval(fCoinInterval);
    clearInterval(sCoinInterval);
    clearInterval(rCoinInterval);

    advesaryInterval = addAdvesaryAnimation();
    coinInterval = addCoinAnimation();
    bCoinInterval = addBlueCoinAnimation();
    fCoinInterval = addFastCoinAnimation();
    sCoinInterval = addSlowCoinAnimation();
    rCoinInterval = addRandomCoinAnimation();
}

// Handle when the player loses
function lose(msg="Oops! You can't touch that! You lose :("){
    lost = true;
    
    let lossMsg = entire_game.add.text(
        player.x, player.y,
        msg, 
        {
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: '#ea2a2a'
        }
    );

    setTimeout(() => {
        console.clear();
        
        for (let bodyCell of playerSnakeBody){
            bodyCell.destroy();
        }
        playerSnakeBody = [];
        playerPoints = 0;
        player_level = 1;
        sendPlayerStats();
        playerDir = "";
        wait_time = 4;
        movements = ['keydown-LEFT', 'keydown-RIGHT', 'keydown-UP', 'keydown-DOWN']
        entire_game.resetGameParams();
        entire_game.setPlayerBounds();
        if ([minPlayerXCentered, minPlayerYCentered] in posToAdvesaries){ // Ensure respawn point is free
            entire_game.changeTileValue(wallTileslayer, minPlayerXCentered, minPlayerYCentered, 0); // Change value back
            posToAdvesaries[[minPlayerXCentered, minPlayerYCentered]].destroy();
            //delete posToAdvesaries[[minPlayerXCentered, minPlayerYCentered]]; 
        }
        
        lossMsg.destroy();

        coinsRemaining.destroy();
        resetIntervals();
        player.x = minPlayerXCentered;
        player.y = minPlayerYCentered;
        coinsRemaining = entire_game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);

        lost = false;
    }, 1000);
}

// Handle when a player collides with/collects a coin
function handleCoinCollision(val){
    // Handle body size/point increment
    function addPoints(){
        extendSnakeBody();
        playerPoints += player_level;
        let gainMsg = entire_game.add.text(
            player.x - cellSizeX/2, player.y - cellSizeX/2, 
            `+${player_level}`
        );
        setTimeout(() => {gainMsg.destroy();}, 500);
        sendPlayerStats();
    }
    if(val == 3){
        addPoints();
    }else{
        for(let x = 0; x < 5; x++){
            addPoints();
        }
    }
    
    coinsRemaining.destroy()
    coinsRemaining = entire_game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);
    if (posToCoins[[player.x, player.y]] !== undefined){ //Could have just been naturally deleted
        posToCoins[[player.x, player.y]].destroy();
        delete posToCoins[[player.x, player.y]];
    }

    // Change value back
    entire_game.changeTileValue(wallTileslayer, player.x, player.y, 0);

    // Handle level transference once enough points are gathered
    if (playerPoints >= pointsToAscend 
        || (player_level >= 4 && playerPoints % quad_size == 0)) //After max level, update db every now and then
    {
        const origPlayerLevel = player_level;

        let ascensionMsg;
        if (origPlayerLevel < 4 ){ // No ascension at max level
            ascending = true;

            ascensionMsg = entire_game.add.text(
                player.x, player.y, 
                "Level Up!", 
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

            sendPlayerStats();

            if (origPlayerLevel < 4 ){ // No ascension reset at max level
                ascensionMsg.destroy();

                for (let bodyCell of playerSnakeBody){
                    bodyCell.destroy();
                }
                playerSnakeBody = [];
                playerPoints = 0;
                playerDir = "";
                wait_time = 4;
                movements = ['keydown-LEFT', 'keydown-RIGHT', 'keydown-UP', 'keydown-DOWN']
                entire_game.setPlayerBounds();
                entire_game.resetGameParams();
                player.x = minPlayerXCentered;
                player.y = minPlayerYCentered;
                coinsRemaining.destroy();
                coinsRemaining = entire_game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);

                resetIntervals();
                
                ascending = false;
            }
        }, 1000);
    }
}

// Look for times and handle when the player collides with their snake body
function handlePossibleSelfCollision(){
    for (let i=0; i<playerSnakeBody.length; ++i){
        const bodyCell = playerSnakeBody[i];
        if (bodyCell.x === player.x && bodyCell.y === player.y){
            lost = true;
            break;
        }
    }
    if (lost){
        lose("Oops! You can't touch tail!");
    }
}

// Handle when a players' head moves to a new position
function handlePossibleCollisions(headTile){
    if (headTile === null){
        return;
    }else if (headTile.index === wall_value){
        lose();
    }else if (headTile.index === advesary_value){
        handleAdvesaryCollision();
    }else if (headTile.index === coin_value || headTile.index === bcoin_value){
        handleCoinCollision(headTile.index);
    }else if(headTile.index === fcoin_value || headTile.index === scoin_value || headTile.index === rcoin_value){
        handlePowerUpCollision(headTile.index);
    }
    else{// Self collision
        handlePossibleSelfCollision();
    }
}

function handlePowerUpCollision(val){

    switch(val){
        case 6:
            wait_time = 2;
        break;
        case 7:
            wait_time = 8;
        break;
        case 8:
            //Controls get funky
            playerDir = "";
            let currentIndex = movements.length;

            //Below code shuffles the movement keys!
            // While there remain elements to shuffle...
            while (currentIndex != 0) {

                // Pick a remaining element...
                let randomIndex = Math.floor(Math.random() * currentIndex);
                currentIndex--;

                // And swap it with the current element.
                [movements[currentIndex], movements[randomIndex]] = [movements[randomIndex], movements[currentIndex]];
            }
        break;
        default:
            //Something is wrong
        break;
    }

    if (posToCoins[[player.x, player.y]] !== undefined){ //Could have just been naturally deleted
        posToCoins[[player.x, player.y]].destroy();
        delete posToCoins[[player.x, player.y]];
    }
    entire_game.changeTileValue(wallTileslayer, player.x, player.y, 0);

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

 // A way to ensure a spawn is safe(nothing at the spawn location) before doing it
 function safeSpawn(x, y, spawnFn, otherConds=() => {return true;}){
    const tile = wallTileslayer.getTileAtWorldXY(x, y, true);
    if (lost || ascending
        || [wall_value, coin_value, advesary_value, fcoin_value, bcoin_value, scoin_value, rcoin_value].includes(tile.index)
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
    if (posToAdvesaries[[player.x, player.y]] !== undefined){
        posToAdvesaries[[player.x, player.y]].destroy();
    }
    posToAdvesaries[[player.x, player.y]] = entire_game.addSprite(player.x, player.y, 'advesary_encounter');
    const [x, y] = [player.x, player.y];
    setTimeout(() => {
        if (posToAdvesaries[[x, y]] !== undefined){
            entire_game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
            posToAdvesaries[[x, y]].destroy();
            delete posToAdvesaries[[x, y]];
        }
    }, 2000);
    lose();
}

// Add spawners for enemies and coins
function addAdvesaryAnimation() {
    return entire_game.addSpawnAnimation(wallTileslayer, advesariesPerSec, [ 
        (x, y) => {
            safeSpawn(x, y, () => {posToAdvesaries[[x, y]] = entire_game.addSprite(x, y, 'advesary');});
        },
        (x, y) => {safeDestroy(posToAdvesaries[[x, y]]);},
        (x, y) => {
            safeSpawn(x, y, () => {posToAdvesaries[[x, y]] = entire_game.addSprite(x, y, 'advesary');});
        },
        (x, y) => {safeDestroy(posToAdvesaries[[x, y]]);},
        (x, y) => {
            safeSpawn(x, y, () => {
                posToAdvesaries[[x, y]] = entire_game.addSprite(x, y, 'advesary');
                entire_game.changeTileValue(wallTileslayer, x, y, advesary_value);
                if (listeq([player.x, player.y], [x, y])){ // Handle the case when the player overlaps the advesary at spawn point
                    handleAdvesaryCollision();
                }
                setTimeout(() => {
                    if (posToAdvesaries[[x, y]] !== undefined){ // May not be there due to immediate deletion after an encounter
                        entire_game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                        posToAdvesaries[[x, y]].destroy();
                        delete posToAdvesaries[[x, y]];
                    }
                }, advesaryLifeSpan);
            });
        }
    ], 3);
} 

function addCoinAnimation(){
    return entire_game.addSpawnAnimation(wallTileslayer, coinsPerSec, [ // Coin spawner
        (x, y) => {
            safeSpawn(x, y, () => {
                posToCoins[[x, y]] = entire_game.addSprite(x, y, 'coin');
                entire_game.changeTileValue(wallTileslayer, x, y, coin_value);
                setTimeout(() => {
                    if (posToCoins[[x, y]] !== undefined){ // Could have already been deleted by player collection
                        entire_game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                        posToCoins[[x, y]].destroy();
                        delete posToCoins[[x, y]];
                    }
                }, coinLifeSpan);
            }, 
            () => {
                return !listeq([player.x, player.y], [x, y]);
            });
        }
    ], 2);
}

function addBlueCoinAnimation(){
    return entire_game.addSpawnAnimation(wallTileslayer, blueCoinsPerSec, [ // Coin spawner
        (x, y) => {
            safeSpawn(x, y, () => {
                posToCoins[[x, y]] = entire_game.addSprite(x, y, 'bCoin');
                entire_game.changeTileValue(wallTileslayer, x, y, bcoin_value);
                setTimeout(() => {
                    if (posToCoins[[x, y]] !== undefined){ // Could have already been deleted by player collection
                        entire_game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                        posToCoins[[x, y]].destroy();
                        delete posToCoins[[x, y]];
                    }
                }, blueCoinLifeSpan);
            });
        }
    ], 1);
}

function addFastCoinAnimation(){
    return entire_game.addSpawnAnimation(wallTileslayer, fastCoinsPerSec, [ // Coin spawner
        (x, y) => {
            safeSpawn(x, y, () => {
                posToCoins[[x, y]] = entire_game.addSprite(x, y, 'fCoin');
                entire_game.changeTileValue(wallTileslayer, x, y, fcoin_value);
                setTimeout(() => {
                    if (posToCoins[[x, y]] !== undefined){ // Could have already been deleted by player collection
                        entire_game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                        posToCoins[[x, y]].destroy();
                        delete posToCoins[[x, y]];
                    }
                }, fastCoinLifeSpan);
            });
        }
    ], 1);
}

function addSlowCoinAnimation(){
    return entire_game.addSpawnAnimation(wallTileslayer, slowCoinsPerSec, [ // Coin spawner
        (x, y) => {
            safeSpawn(x, y, () => {
                posToCoins[[x, y]] = entire_game.addSprite(x, y, 'sCoin');
                entire_game.changeTileValue(wallTileslayer, x, y, scoin_value);
                setTimeout(() => {
                    if (posToCoins[[x, y]] !== undefined){ // Could have already been deleted by player collection
                        entire_game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                        posToCoins[[x, y]].destroy();
                        delete posToCoins[[x, y]];
                    }
                }, slowCoinLifeSpan);
            });
        }
    ], 1);
}

function addRandomCoinAnimation(){
    return entire_game.addSpawnAnimation(wallTileslayer, randomCoinsPerSec, [ // Coin spawner
        (x, y) => {
            safeSpawn(x, y, () => {
                posToCoins[[x, y]] = entire_game.addSprite(x, y, 'rCoin');
                entire_game.changeTileValue(wallTileslayer, x, y, rcoin_value);
                setTimeout(() => {
                    if (posToCoins[[x, y]] !== undefined){ // Could have already been deleted by player collection
                        entire_game.changeTileValue(wallTileslayer, x, y, 0); // Change value back
                        posToCoins[[x, y]].destroy();
                        delete posToCoins[[x, y]];
                    }
                }, randomCoinLifeSpan);
            }, () => {return (player_level > 2);});
        }
    ], 1);
}

function run_game(
    uname, g_id, q_size, p_level, 
    wall_image_path, character_image_path, character_head_image_path,
    coin_image_path, advesary_image_path, advesary_encounter_image_path,
    map_path, sound_path, bCoin_image_path, fCoin_image_path, sCoin_image_path, rCoin_image_path,
    wall_value=1
){
    
    username = uname;
    game_id = g_id;

    // Parse string parameters
    quad_size = JSON.parse(q_size);
    player_level = JSON.parse(p_level);

    // Set up some universal variables/constants
    mapSize = quad_size * 2 + 1;
    /*const cellSizeX = 32;
    const cellSizeY = 32;
    const characterSizeX = 32;
    const characterSizeY = 32;*/
    mapSizeX = mapSize * cellSizeX;
    mapSizeY = mapSize * cellSizeY;
    mapStartPos = [0, 0];
    mapEndPos = [mapStartPos[0] + mapSizeX, mapStartPos[1] + mapSizeY];
    cameraSizeX = document.documentElement.clientWidth;
    cameraSizeY = document.documentElement.clientHeight;
    //advesariesPerSec, coinsPerSec;
    //let advesaryInterval, coinInterval;
    advesaryLifeSpan = 0;
    coinLifeSpan = 0;
    
    fastCoinLifeSpan = 0;
    slowCoinLifeSpan = 0;
    blueCoinLifeSpan = 0;
    randomCoinLifeSpan = 0;

    minPlayerXCentered, minPlayerYCentered, maxPlayerXCentered, maxPlayerYCentered;
    //let playerPoints = 0;
    //let pointsToAscend;

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

        // Set spawn rates, points to level up, etc
        resetGameParams(){
            if (player_level > 1){
                wait_multiplier = 1.9;
            }else{
                wait_multiplier = 1;
            }

            advesariesPerSec = player_level;
            advesaryLifeSpan = 3000 + player_level * 500;
            
            coinsPerSec = player_level / 2;
            coinLifeSpan = 10000;
            
            pointsToAscend = 10 * player_level**2;

            fastCoinLifeSpan = 10000;
            slowCoinLifeSpan = 10000;
            blueCoinLifeSpan = 50000;
            randomCoinLifeSpan = 10000;
            
            blueCoinsPerSec = player_level / 100;

            if(player_level > 1){
                fastCoinsPerSec = player_level / 24;
                slowCoinsPerSec = player_level / 12;
            }else{
                fastCoinsPerSec = player_level / 9999999999999;
                slowCoinsPerSec = player_level / 9999999999999;
            } 
            if(player_level > 3){
                randomCoinsPerSec = player_level / 50;
            }else{
                randomCoinsPerSec = player_level / 9999999999999;
            }
//var fastCoinInteveral, slowCoinInterval, blueCoinInterval, randomCoinInterval;
        }

        // Function to add an animation a tile as it spawns a coin, enemy, or whatever else.
        //  The function will repeat the animation on an interval and at random grid locations
        //  within the camera window. This is how we will set automate the spawning of coins , enemies, etc
        addSpawnAnimation(tileLayer, spawnsPerSec, frameGenerators, fps=1.5){
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
            this.load.audio('BGMusic', sound_path);

            this.load.image('bCoin', bCoin_image_path);
            this.load.image('fCoin', fCoin_image_path);
            this.load.image('sCoin', sCoin_image_path);
            this.load.image('rCoin', rCoin_image_path);

        }

        create (){
            console.log("Game preloading complete");

            // Setup of the scene
            let game = this;
            entire_game = game;

            let BGMusic = this.sound.add("BGMusic", {loop: true, volume: 0.35});
            BGMusic.play();

            game.setPlayerBounds();
            game.resetGameParams();
            game.cameras.main.setSize(cameraSizeX, cameraSizeY);
            game.cameras.main.setBounds(
                mapStartPos[0] - cellSizeX, 
                mapStartPos[1] - cellSizeY, 
                mapEndPos[0] + cellSizeX, 
                mapEndPos[1] + cellSizeY
            );
            
            
            map = game.make.tilemap({ key: 'map', tileWidth: cellSizeX, tileHeight: cellSizeY });
            wallTileset = map.addTilesetImage('walls', null, cellSizeX, cellSizeY, 1, 2);
            wallTileslayer = map.createLayer(0, wallTileset, 0, 0);
            player = game.addSprite(minPlayerXCentered, minPlayerYCentered, 'character_head');
            let instructions = 'Move with Arrow Keys\nLeft: ' + movements[0] + '\nRight: '  + movements[1] + '\nUp: ' + movements[2] + '\nDown: '  + movements[3];
            instructionMsg = entire_game.add.text(700, minPlayerYCentered + 750, instructions, {
                fontSize: '18px',
                fill: '#ffffff',
                backgroundColor: '#000000'
            });
            
            //let playerSnakeBody = [];
            game.cameras.main.startFollow(player);
            posToCoins = {};
            posToAdvesaries = {};
            coinsRemaining = game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);

            resetIntervals();

            console.log("Game started");
        }

        update(){
            
            let instructions = 'Move with Arrow Keys\nLeft: ' + movements[0] + '\nRight: '  + movements[1] + '\nUp: ' + movements[2] + '\nDown: '  + movements[3];
            instructionMsg.setText(instructions);
            {
                let xdist = player.x - instructionMsg.x;
                let ydist = player.y - instructionMsg.y;
                let too_close = (
                    (xdist == 0
                    || (xdist < 0 && xdist > -cellSizeX*2)
                    || (xdist > 0 && xdist < cellSizeX*7))
                    && (ydist == 0
                        || (ydist < 0 && ydist > -cellSizeY*2)
                        || (ydist > 0 && ydist < cellSizeY*3))
                )
                if (too_close){
                    instructionMsg.setText("");
                }
            }
            //console.log(movements[0] + "\n" + movements[1] + "\n" + movements [2] + "\n" + movements[3]);
            //console.log(instructions);

             // Handling going Left
            entire_game.input.keyboard.on(movements[0], function left(event)
            {
                //console.log(movements[0])
                playerDir = "Left";
                move = 1;
            });

            // Handling going Right
            entire_game.input.keyboard.on(movements[1], function right(event)
            {
                //console.log(movements[1])
                playerDir = "Right";
                move = 1;
            });
 
            // Handling going Up
            entire_game.input.keyboard.on(movements[2], function up(event)
            {
                //console.log(movements[2])
                playerDir = "Up";
                move = 1;
            });
 
            // Handling going Down
            entire_game.input.keyboard.on(movements[3], function down(event)
            {
                //console.log(movements[3])
                playerDir = "Down";
                move = 1;
            });

            if(player_level > 1){
                move = 1; //Automatic movement
            }

            if(wait_before_movement != 0){
                wait_before_movement--;
            }
            else{
                switch(playerDir){
                    case "Up":
                        //console.log("Run5");
                        if (!ascending && !lost && move == 1){
                            let oldPos = [player.x, player.y];
                            if (upInBounds(player.y)){
                                player.y = calcUp(player.y);
                                moveSnakeBody(oldPos);
                                coinsRemaining.destroy()
                                coinsRemaining = entire_game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);
                            }
                            handlePossibleCollisions(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                            wait_before_movement = Math.ceil(wait_time*wait_multiplier);
                            move = 0;   
                        }
                    break;
                    case "Left":
                        //console.log("Run6");
                        if (!ascending && !lost && move == 1){
                            let oldPos = [player.x, player.y];
                            if (leftInBounds(player.x)){
                                player.x = calcLeft(player.x);
                                moveSnakeBody(oldPos);
                                coinsRemaining.destroy()
                                coinsRemaining = entire_game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);
                            }
                            handlePossibleCollisions(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                            wait_before_movement = Math.ceil(wait_time*wait_multiplier);
                            move = 0;
                        }
                        break;
                    case "Right":
                        //console.log("Run7");
                        if (!ascending && !lost && move == 1){
                            let oldPos = [player.x, player.y];
                            if (rightInBounds(player.x)){
                                player.x = calcRight(player.x);
                                moveSnakeBody(oldPos);
                                coinsRemaining.destroy()
                                coinsRemaining = entire_game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);
                            }
                            handlePossibleCollisions(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                            wait_before_movement = Math.ceil(wait_time*wait_multiplier);
                            move = 0;
                        }
                        break;
                    case "Down":
                        //console.log("Run8");
                        if (!ascending && !lost && move == 1){
                            let oldPos = [player.x, player.y];
                            if (downInBounds(player.y)){
                                player.y = calcDown(player.y);
                                moveSnakeBody(oldPos);
                                coinsRemaining.destroy()
                                coinsRemaining = entire_game.add.text(player.x, player.y, `${pointsToAscend - playerPoints}`);
                            }
                            handlePossibleCollisions(wallTileslayer.getTileAtWorldXY(player.x, player.y, false));
                            wait_before_movement = Math.ceil(wait_time*wait_multiplier);
                            move = 0;
                        }
                        break;
                    default:
                        //console.log("Run4");
                        //console.log("Player didn't choose a direction yet");
                        break;
                    
                }
            }

            

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
