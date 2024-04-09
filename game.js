class GameScene extends Phaser.Scene {
    
    constructor(map_math) {
        super({ key: 'MyScene' });
        this.map_path = map_math;
        this.player_info = new Character("Z", 0, 0, false, true);
        this.direction = "up";
        this.player_score;
        this.temp_font;
        this.cnt;
    }

    preload() {
        
        this.load.image('tiles', 'assets/Icons/BlackSquarePNG.png');
        this.load.image('coins', 'assets/Icons/CoinPNG.png');
        //this.add.image(100, 100, 'coins');
        this.load.image('enemies', 'assets/Icons/EnemyPNG.png');
        this.load.image('walls', 'assets/Icons/WallPNG.png');

        console.log("This is the map_path: ", this.map_path);
        this.load.tilemapCSV({
            key: 'map',
            url: this.map_path
        });
        
        //this.load.tilemapCSV('map', this.map_path, null, Phaser.tilemapCSV);
        //const map = this.make.tilemapCSV({key: 'map', w: 32, h: 32});
        //const tileset = ma

        console.log("Test: ", typeof(this.load.tilemapCSV));
        console.log("Test 2: " , this.load.tilemapCSV('map'));
                //console.log(this.load.tilemapCSV);

    }

    
    create() {

        //const map = this.make.tilemap({key: 'map', tileWidth: 32, tileHeight: 32});
        //console.log(map);
        //const tileset = map.addTilesetImage('coins', null, 32, 32, 1, 2);
        //const layer = map.createLayer(0, tileset, 0, 0);

        const player = this.add.image(config.width / 2, config.height / 2, 'tiles', 'playerFrame');

        this.input.keyboard.on('keydown-A', event =>
        {
            /*const tile = layer.getTileAtWorldXY(player.x - 32, player.y, true);
            if (tile.index === 2)
            {
                //  Blocked, we can't move
                console.log("Blocked, movement not allowed");
            }
            else
            {*/
            if(player.x - 32 > 0){
                console.log(player.x);
                player.x -= 32;
                player.angle = 180;
            }else{
                console.log("Player would go offscreen");
            }
            

        });

        //  Right
        this.input.keyboard.on('keydown-D', event =>
        {
            
            if(player.x + 32 < config.width){
                console.log(player.x);
                player.x += 32;
                player.angle = 0;
            }

        });

        //  Up
        this.input.keyboard.on('keydown-W', event =>
        {

            if(player.y - 32 > 0){
                console.log(player.y);
                player.y -= 32;
                player.angle = -90;
            }else{
                console.log("Player would go offscreen");
            }

        });

        //  Down
        this.input.keyboard.on('keydown-S', event =>
        {

            console.log(player.y);
            if(player.y + 32 < config.height){
                player.y += 32;
                player.angle = 90;
            }else{
                console.log("Player would go offscreen");
            }

        });

        //Create an enemy when 3 pops up
        //const enemy = add the enemy's image
        //const enemy_info = new Character("Z", 0, 0, false, true);
                

        this.add.text(320, 32, 'Move using WASD', {
            fontSize: '24px',
            fill: '#f0000f',
            
            //backgroundColor: '#000000',
        });

        this.player_score = this.add.text(32, 32, "SCORE: " + this.player_info.GetPoints(),
        {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: '#000000',
        });

    }

    update() {

        // Your update logic here
        //This is where I'd update points under certain conditions
        //This function runs every single second
        //console.log("Running");
        switch(this.direction){
            case "up":
                break;
            default:
                console.log("Something is wrong");
                break;
        }

        if(this.player_info.OnLevel() < lvl_pt_complete.length &&
        this.player_info.GetPoints() >= lvl_pt_complete[this.player_info.OnLevel()] ){
           
            this.temp_font = this.add.text(320, 320, 'YOU CAN MOVE TO THE NEXT LEVEL!!!!', {
                fontSize: '24px',
                fill: '#ffffff',
                backgroundColor: '#000000',
            });
            this.cnt = 100;
            this.player_info.ChangeLevel(this.player_info.OnLevel() + 1); //Ch
        }

        if(this.cnt < 0){
            this.temp_font.text = "";
        }else{
            this.cnt--;
        }

        this.player_info.ChangePoints(1);
        this.player_score.text = "Score: " + this.player_info.GetPoints();

    }

}

// Initialize Phaser game
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 640,
    backgroundColor: 0x006400,
    scene: GameScene
};

const game = new Phaser.Game(config);
const lvl_pt_complete = [200, 400, 800, 1200];

function run_game(map_path){ //add a parameter to get the username

    let path = map_path.substr(-36);
    //console.log("mapPath: ", path);
    map_path = path;
    fetch(map_path, { method: "HEAD" }) 
    .then(response => { 
        if (response.ok) { 
            //When I run this, sometimes I get s[?] as the two beginning characters of the map_path
            //in the console, but it still says it exists
            console.log("Map_path file exists: ", map_path); 
        } else { 
            console.log("Map_path file does not exist"); 
        } 
    }) 
    .catch(error => { 
        console.log("An error occurred: ", error); 
    }); 
    //console.log("New map path: ", map_path);
    //map_path = "25f7145064364cbaa47371e14456c60e.csv";
    game.scene.add('GameScene', new GameScene(map_path));
    game.scene.start('GameScene');

    
    //player_one = new Player("Z", 0, 0, false, true);

    //Copy phaser behaviour to read
    //0s are black squares
    //1s, 2s and 3s are different version of cells
    
    //0 for walls
    //1 is free
    //2 is a coin
    //3 is an enemy

    //cell_val_sets

    //make sure fetch command is separate from my code
    //just call fetch with parameters

    //Go on phaser thing, copy what they have, reorganize it

}



function level_complete(){

    //Update DB and let them know which level was completed
    //Go back to

}


function player_lost(){



}

function restart(){



}

class Character{

    constructor(name, points, on_level, is_enemy, alive){
        this.name = name;
        this.points = points;
        this.on_level = on_level;
        this.is_enemy = is_enemy;
        this.alive = alive;
    }

    ChangePoints(change){
        this.points += change
    }

    ChangeLevel(new_level){
        this.on_level = new_level;
    }

    GetName(){ //Returns true if player collided with an enemy
        return this.name;
    }

    GetPoints(){ //Returns true if player collided with an enemy
        return this.points;
    }

    OnLevel(){ //Returns true if player collided with an enemy
        return this.on_level;
    }   

    IsEnemy(){ //Returns true if player collided with an enemy
        return this.is_enemy;
    }

    IsAlive(){
        return this.alive;
    }
}