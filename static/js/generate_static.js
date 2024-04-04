function print2DGrid(grid) {
    let str_rep = "";
    for (const row of grid){
        for (const cell of row){
            if (cell === 0){
                str_rep += "#";
            }else if (cell === 1){
                str_rep += "_";
            }else if (cell === 2){
                str_rep += "$";
            }else{ //cell === 3
                str_rep += "!";
            }
            str_rep += " ";
        }
        str_rep += "\n";
    }
    console.log(str_rep);
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function* in_grid_generator(
    grid,
    index,
    axis = 0,
    backward = false,
    length_bias = 3,
    spawn_attempt_rate = 1,
    assign_from = [1]
) {
    let children = [[ index, axis, backward ]];
    function spawn(index, axis, backward) {
        children.push([ index, axis, backward ]);
    }
    function at(grid, index) {
        result = grid;
        for (const axisIdx of index){
            result = result[axisIdx];
        }
        return result;
    }
    function assign(grid, index, value) {
        at(grid, index.slice(0, index.length - 1))[index[index.length - 1]] = value;
    }

    while (children.length > 0) {
        let [ index, axis, backward ] = children.pop();
        axis = index.length - 1 - axis; // Reverse for row-major

        // Skip in case of invalid parameters or a revisit
        if (index[axis] < 0) {
            continue;
        } else {
            let axis_len = at(grid, index.slice(0, axis)).length;
            if (index[axis] >= axis_len) {
                continue;
            } else if (assign_from.includes(at(grid, index))) {
                continue;
            }
        }

        // Mark spots in the current direction up to a random point
        // while randomly spawning children in random directions
        const start = index[axis];
        const step = backward ? -1 : 1;
        let end;
        if (backward) {
            end = randInt(-1, index[axis]) - randInt(0, length_bias);
            end = Math.max(end, -1);
        } else {
            let axis_len = at(grid, index.slice(0, axis)).length;
            end = randInt(index[axis], axis_len) + randInt(0, length_bias);
            end = Math.min(end, axis_len);
        }

        while (index[axis] !== end) {
            if (assign_from.includes(at(grid, index))) {
                break;
            }

            let value = assign_from[randInt(0, assign_from.length - 1)];
            assign(grid, index, value);
            yield [grid, index, value];

            // Spawn the children but adjust parameters for some edge cases
            if (randInt(1, 1 / spawn_attempt_rate) === 1) {
                let next_axis = randInt(0, index.length - 1);
                if (index.length - 1 - next_axis === axis) {
                    let index2 = [...index];
                    index2[axis] = start + -step;
                    spawn(index2, next_axis, !backward);
                } else {
                    let index2 = [...index];
                    let next_backward =
                        index2[index.length - 1 - next_axis] >= 1
                        ? Math.random() < 0.5
                        : false;
                    index2[index.length - 1 - next_axis] += next_backward ? -1 : 1;
                    spawn(index2, next_axis, next_backward);
                }
            }

            index[axis] += step;
        }
    }

    return grid;
}
  

// Load the grid/map
function load_map(cell_value_sets, quadSize, fps){
    // Setup
    cell_value_sets = JSON.parse(cell_value_sets);
    let gridSize = quadSize * 2;
    let gridElem = document.getElementById("grid");
    gridElem.style.display = 'grid';
    gridElem.style.height = `${document.documentElement.clientHeight}px`;
    gridElem.style.width = `${document.documentElement.clientWidth}px`;
    gridElem.style.gridTemplateRows = `repeat(${quadSize}, 1fr)`;
    gridElem.style.gridTemplateColumns = `repeat(${quadSize}, 1fr)`;
    let cellSizeY = document.documentElement.clientHeight / quadSize;
    let cellSizeX = document.documentElement.clientWidth / quadSize;

    // Define the quadrants of the map and a current quadrant for modification
    let quadrants = [];
    for (let i=0; i<4; ++i){
        quadrants.push([]);
        for (let j=0; j<quadSize; ++j){
            quadrants[i].push([]);
            for (let k=0; k<quadSize; ++k){
                quadrants[i][j].push(0);
            }
        }
    }
    let quadIdx = 0;

    // [Re]render a quadrant/grid using the grid object
    function render(grid=null, changeIdx=null, value=null){
        //Render if the no change idx or value is give(grid html object is empty)
        if (changeIdx === null || value === null){
            gridElem.innerHTML = "";
            let y = 0;
            for (const row of grid) {
                let x = 0;
                for (const cell of row) {
                    if (x === quadSize || y === quadSize){
                        gridElem.innerHTML += `<div id="cell[${y},${x}]" style="background-color: rgb(245, 10, 10); border: 1px solid #00f; width: ${cellSizeX}px; height: ${cellSizeY}px;"></div>`;
                    } else if (cell > 0) {
                        gridElem.innerHTML += `<div id="cell[${y},${x}]" style="background-color: rgb(245, 245, 245); border: 1px solid #000; width: ${cellSizeX}px; height: ${cellSizeY}px;"></div>`;
                    } else {
                        gridElem.innerHTML += `<div id="cell[${y},${x}]" style="background-color: rgb(10, 10, 10); border: 1px solid #fff; width: ${cellSizeX}px; height: ${cellSizeY}px;"></div>`;
                    }
                    ++x;
                }
                ++y;
            };
        // Otherwise, change the element at the corresponding changedIdx
        }else{
            const [y, x] = changeIdx;
            if (x === quadSize || y === quadSize){
                // Ignore
            } else if (value > 0) {
                document.getElementById(`cell[${y},${x}]`).style = `background-color: rgb(245, 245, 245); border: 1px solid #000; width: ${cellSizeX}px; height: ${cellSizeY}px;`;
            } else {
                document.getElementById(`cell[${y},${x}]`).style = `background-color: rgb(10, 10, 10); border: 1px solid #fff; width: ${cellSizeX}px; height: ${cellSizeY}px;`;
            }
        }
    }
    
    // First render the first quadrant
    render(quadrants[quadIdx]);

    // Generate the map
    return new Promise((resolve, reject) => {
        // Setup a generator
        function getNextGenerator(){
            return in_grid_generator(
                quadrants[quadIdx],
                [Math.floor(quadSize / 2), Math.floor(quadSize / 2)],
                0, false,
                Math.pow(quadSize, 1 + (4 - 1 - quadIdx) / quadSize), 
                1 / Math.min(2, (quadIdx + 1)),
                cell_value_sets[quadIdx]
            );
        }
        let map_generator = getNextGenerator();

        // Get a change, render the current map, wait for the time dictated by the fps,
        // and then do it all again until no more changes occur
        intervalId = setInterval(() => {
            // Get a change
            let next = map_generator.next();
            // Rerender the change if one happened
            if (!next.done){ 
                let [changedIdx, value] = next.value.slice(1);
                render(null, changedIdx, value);
            // Otherwise, increment/remake iterators and render the new quadrant
            }else if (quadIdx < 3){
                ++quadIdx;
                map_generator = getNextGenerator();
                render(quadrants[quadIdx]);
            // Otherwise, terminate
            }else{
                clearInterval(intervalId);
                resolve();
            }
        }, 1000 / fps);  
    })

    // After generating the quadrants, fuse them into a grid
    .then(() => {
        quadrants[0].push(new Array(gridSize).fill(0)); // Add boundary between top and bottom quadrants
        // Add bottom left quadrant
        quadrants[3].forEach((row) => {quadrants[0].push([...row]);});
        // Add boundary between left and right quadrants
        quadrants[0].forEach((row) => {row.push(0);});
        // Add right side quadrants
        for (let i = 0; i < gridSize + 1; ++i) {
            if (i < quadSize) {
                quadrants[1][i].forEach((item) => { quadrants[0][i].push(item); });
            } else if (i > quadSize) {
                quadrants[2][i - 1 - quadSize].forEach((item) => { quadrants[0][i].push(item); });
            }
        }
        quadrants = quadrants[0]; // Drop unnecessary data

        if (gridSize < 22){ // Log the map to console if it's small enough
            print2DGrid(quadrants);
        }

        return quadrants;
    });
}