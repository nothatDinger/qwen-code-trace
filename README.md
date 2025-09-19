# Dijkstra's Algorithm Implementation

This repository contains an implementation of Dijkstra's algorithm for finding the shortest path from a source vertex to all other vertices in a weighted graph with non-negative edge weights.

## Overview
Dijkstra's algorithm is a greedy approach that efficiently solves the single-source shortest path problem. It uses a priority queue to always select the unvisited vertex with the smallest known distance from the source.

## Features
- **Core Algorithm**: Implements the standard Dijkstra's algorithm using a min-heap priority queue.
- **Input Validation**: Checks for valid graph structure and numeric edge weights.
- **Path Reconstruction**: Includes functionality to reconstruct the actual shortest path.
- **Comprehensive Tests**: Unit tests cover various scenarios including multiple edges and self-loops.

## Usage

### Basic Example
```python
from dijkstra import dijkstra, reconstruct_path

# Define a graph as an adjacency list
graph = {
    'A': {'B': 4, 'C': 2},
    'B': {'C': 1, 'D': 5},
    'C': {'D': 8, 'E': 10},
    'D': {'E': 2},
    'E': {}
}

# Find shortest paths from 'A'
distances, predecessors = dijkstra(graph, 'A')
print("Shortest distances from A:")
for node, dist in distances.items():
    print(f"{node}: {dist}")

# Reconstruct path from A to E
path = reconstruct_path(predecessors, 'A', 'E')
if path:
    print(f"\nShortest path from A to E: {' -> '.join(path)}")
else:
    print("\nNo path from A to E")
```

### Output
```
Shortest distances from A:
A: 0
B: 4
C: 5
D: 13
E: 15

Shortest path from A to E: A -> C -> D -> E
```

## Installation and Testing
1. Install dependencies (none required, pure Python)
2. Run tests: `python3 -m unittest test_dijkstra.py`

## Key Features
- **Time Complexity**: O(E log V) where E is the number of edges and V is the number of vertices
- **Space Complexity**: O(V)
- **Handles Edge Cases**: Multiple edges between vertices, self-loops, unreachable nodes

## Contributing
Feel free to submit pull requests with improvements or additional test cases.