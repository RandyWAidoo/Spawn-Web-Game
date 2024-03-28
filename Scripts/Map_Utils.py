#Retreive a list value at some index of some depth
def at(grid: list, index: tuple, reverse: bool = False):
    if reverse:
        index = list(reversed(index))
    result = grid
    for i in range(len(index)):
        result = result[index[i]]
    return result

#Assign a list value at some index of some depth to some other value
def assign(grid: list, index: tuple, value, reverse: bool = False):
    outer = at(grid, index[:len(index) - 1], reverse)
    outer[index[len(index) - 1]] = value

def in_bounds(grid: list, index: tuple, reverse: bool = False)->bool:
    if reverse:
        index = list(reversed(index))
    result = grid
    for i in range(len(index)):
        if index[i] >= len(result):
            return False
        result = result[index[i]]
    return True

def print_2D_grid(grid):
    for _ in grid:
        for __ in _:
            if __:
                print("_", end="")
            else: print("*", end="")
        print()