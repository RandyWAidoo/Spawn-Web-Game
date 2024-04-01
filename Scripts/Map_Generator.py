import random
import typing as tp
import time
import subprocess
import platform
import os
import sys
sys.path.append(os.path.split(__file__)[0])
from Map_Utils import at, print_2D_grid, assign

random.seed(80)

#Activate a random but contigous subset of a grid. Assumes a row-major grid
def in_grid(
    grid: list, index: list[int], axis: int = 0, 
    backward: bool = False, length_bias: int = 3,
    spawn_attempt_rate: float = 1, assign_from: list[int] = [1],
    show_if_2D: bool = False, fps: float = 3
):
    children: list[tuple[list[int], int, bool]] = [(index, axis, backward)]
    def spawn(index: list[int], axis: int, backward: bool):
        children.append((index, axis, backward))

    while children:
        index, axis, backward = children.pop()
        axis = len(index) - 1 - axis #Reverse for row-major

        #Skip in case of invalid parameters
        if index[axis] < 0:
            continue
        else:
            axis_len = len(at(grid, index[:axis]))
            if index[axis] >= axis_len:
                continue
            elif at(grid, index) in assign_from:
                continue

        #Mark spots in the current direction up to a random point 
        # while randomly spawning children in random directions
        start = index[axis]
        step = backward*-1 + (not backward)*1
        if backward:
            end = random.randint(-1, index[axis]) - random.randint(0, length_bias)
            end = max(end, -1)
        else:
            axis_len = len(at(grid, index[:axis]))
            end = random.randint(index[axis], axis_len) + random.randint(0, length_bias)
            end = min(end, axis_len)

        while index[axis] != end:
            if at(grid, index) in assign_from: 
                break

            assign(grid, index, random.choice(assign_from))
            if show_if_2D and len(index) == 2:
                print_2D_grid(grid)
                time.sleep(1/fps)
                system = platform.system()
                if system == "Windows":
                    subprocess.run("cls", shell=True)
                elif system == "Linux" or system == "Darwin": 
                    subprocess.run("clear", shell=True)
                    
            #Spawn the children but adjust parameters for some edge cases
            if random.randint(1, int(1/spawn_attempt_rate)) == 1:
                next_axis = random.randint(1, len(index)) - 1
                if len(index) - 1 - next_axis == axis:
                    index2 = list(index)
                    index2[axis] = start + -step 
                    spawn(index2, next_axis, (not backward))
                else:
                    index2 = list(index)
                    if index2[len(index) - 1 - next_axis] >= 1: 
                        next_backward = bool(random.randint(0, 1))
                    else: 
                        next_backward = False
                    index2[len(index) - 1 - next_axis] += (next_backward*-1 + (not next_backward)*1)
                    spawn(index2, next_axis, next_backward)
            
            index[axis] += step

#`in_grid` as a generator. Yields after each edit
def in_grid_generator(
    grid: list, index: list[int], axis: int = 0, 
    backward: bool = False, length_bias: int = 3,
    spawn_attempt_rate: float = 1, assign_from: list[int] = [1]
):
    children: list[tuple[list[int], int, bool]] = [(index, axis, backward)]
    def spawn(index: list[int], axis: int, backward: bool):
        children.append((index, axis, backward))

    while children:
        index, axis, backward = children.pop()
        axis = len(index) - 1 - axis #Reverse for row-major

        #Skip in case of invalid parameters
        if index[axis] < 0:
            continue
        else:
            axis_len = len(at(grid, index[:axis]))
            if index[axis] >= axis_len:
                continue
            elif at(grid, index) in assign_from:
                continue

        #Mark spots in the current direction up to a random point 
        # while randomly spawning children in random directions
        start = index[axis]
        step = backward*-1 + (not backward)*1
        if backward:
            end = random.randint(-1, index[axis]) - random.randint(0, length_bias)
            end = max(end, -1)
        else:
            axis_len = len(at(grid, index[:axis]))
            end = random.randint(index[axis], axis_len) + random.randint(0, length_bias)
            end = min(end, axis_len)

        while index[axis] != end:
            if at(grid, index) in assign_from: 
                break

            assign(grid, index, random.choice(assign_from))
            yield grid
                    
            #Spawn the children but adjust parameters for some edge cases
            if random.randint(1, int(1/spawn_attempt_rate)) in assign_from:
                next_axis = random.randint(1, len(index)) - 1
                if len(index) - 1 - next_axis == axis:
                    index2 = list(index)
                    index2[axis] = start + -step 
                    spawn(index2, next_axis, (not backward))
                else:
                    index2 = list(index)
                    if index2[len(index) - 1 - next_axis] >= 1: 
                        next_backward = bool(random.randint(0, 1))
                    else: 
                        next_backward = False
                    index2[len(index) - 1 - next_axis] += (next_backward*-1 + (not next_backward)*1)
                    spawn(index2, next_axis, next_backward)
            
            index[axis] += step

    return grid