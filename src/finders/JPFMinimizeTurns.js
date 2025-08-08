/**
 * @author AI Assistant
 * Jump Point Finder that minimizes corner turns (orthogonal movement only)
 */
var JumpPointFinderBase = require('./JumpPointFinderBase');
var Util = require('../core/Util');
var DiagonalMovement = require('../core/DiagonalMovement');

/**
 * Jump Point Finder optimized for minimum corner turns with orthogonal movement only
 * @param {object} opt
 * @param {function} opt.heuristic Heuristic function
 * @param {boolean} opt.minimizeTurns Whether to prioritize paths with fewer turns
 * @param {number} opt.lookAheadDistance How far ahead to look for smoother paths
 */
function JPFMinimizeTurns(opt) {
    opt = opt || {};
    JumpPointFinderBase.call(this, opt);
    this.minimizeTurns = opt.minimizeTurns !== false;
    this.lookAheadDistance = opt.lookAheadDistance || 3;
    this.turnPenalty = typeof opt.turnPenalty === 'number' ? opt.turnPenalty : 0.5;
}

JPFMinimizeTurns.prototype = new JumpPointFinderBase();
JPFMinimizeTurns.prototype.constructor = JPFMinimizeTurns;

/**
 * Enhanced jump function that looks for smoother paths
 * @protected
 * @return {Array<Array<number>>} The x, y coordinate of the jump point found, or null if not found
 */
JPFMinimizeTurns.prototype._jump = function (x, y, px, py) {
    var grid = this.grid,
        dx = x - px, dy = y - py;

    if (!grid.isWalkableAt(x, y)) {
        return null;
    }

    if (this.trackJumpRecursion === true) {
        grid.getNodeAt(x, y).tested = true;
    }

    if (grid.getNodeAt(x, y) === this.endNode) {
        return [x, y];
    }

    // 防御性：严格禁止对角起跳
    if (dx !== 0 && dy !== 0) {
        return null;
    }

    // Orthogonal movement only - no diagonal checks
    if (dx !== 0) {
        // Horizontal movement
        if ((grid.isWalkableAt(x + dx, y + 1) && !grid.isWalkableAt(x, y + 1)) ||
            (grid.isWalkableAt(x + dx, y - 1) && !grid.isWalkableAt(x, y - 1))) {
            return [x, y];
        }
    } else if (dy !== 0) {
        // Vertical movement
        if ((grid.isWalkableAt(x + 1, y + dy) && !grid.isWalkableAt(x + 1, y)) ||
            (grid.isWalkableAt(x - 1, y + dy) && !grid.isWalkableAt(x - 1, y))) {
            return [x, y];
        }
    }

    // Enhanced: Look for smoother paths when turn minimization is enabled
    if (this.minimizeTurns) {
        var smoothJump = this._findSmoothJump(x, y, dx, dy, grid);
        if (smoothJump) {
            return smoothJump;
        }
    }

    return this._jump(x + dx, y + dy, x, y);
};

/**
 * Find a smoother jump point by looking ahead
 * @param {number} x Current x
 * @param {number} y Current y
 * @param {number} dx Direction x
 * @param {number} dy Direction y
 * @param {PF.Grid} grid The grid
 * @return {Array<number>|null} Smooth jump point or null
 */
JPFMinimizeTurns.prototype._findSmoothJump = function (x, y, dx, dy, grid) {
    // 防御性：严格禁止对角前瞻
    if (dx !== 0 && dy !== 0) {
        return null;
    }

    // Look ahead for potential smoother paths
    var nx = x + dx * this.lookAheadDistance;
    var ny = y + dy * this.lookAheadDistance;

    // Check if we can reach the look-ahead point directly
    if (grid.isWalkableAt(nx, ny)) {
        var line = Util.interpolate(x, y, nx, ny);
        var blocked = false;

        for (var i = 1; i < line.length - 1; i++) {
            if (!grid.isWalkableAt(line[i][0], line[i][1])) {
                blocked = true;
                break;
            }
        }

        if (!blocked) {
            return [nx, ny];
        }
    }

    // Try shorter look-ahead distances
    for (var dist = this.lookAheadDistance - 1; dist >= 1; dist--) {
        nx = x + dx * dist;
        ny = y + dy * dist;

        if (grid.isWalkableAt(nx, ny)) {
            var line = Util.interpolate(x, y, nx, ny);
            var blocked = false;

            for (var i = 1; i < line.length - 1; i++) {
                if (!grid.isWalkableAt(line[i][0], line[i][1])) {
                    blocked = true;
                    break;
                }
            }

            if (!blocked) {
                return [nx, ny];
            }
        }
    }

    return null;
};

/**
 * Enhanced neighbor finding with turn optimization
 * @return {Array<Array<number>>} The neighbors found
 */
JPFMinimizeTurns.prototype._findNeighbors = function (node) {
    var parent = node.parent,
        x = node.x, y = node.y,
        grid = this.grid,
        px, py, dx, dy,
        neighbors = [], neighborNodes, neighborNode, i, l;

    // If no parent, return all neighbors (standard behavior)
    if (!parent) {
        neighborNodes = grid.getNeighbors(node, DiagonalMovement.Never);
        for (i = 0, l = neighborNodes.length; i < l; ++i) {
            neighborNode = neighborNodes[i];
            neighbors.push([neighborNode.x, neighborNode.y]);
        }
        return neighbors;
    }

    // Directed pruning with turn optimization
    px = parent.x;
    py = parent.y;
    dx = (x - px) / Math.max(Math.abs(x - px), 1);
    dy = (y - py) / Math.max(Math.abs(y - py), 1);

    // Orthogonal movement only
    if (dx !== 0) {
        // Horizontal movement
        if (grid.isWalkableAt(x + dx, y)) {
            neighbors.push([x + dx, y]);
        }
        if (grid.isWalkableAt(x + dx, y + 1)) {
            neighbors.push([x + dx, y + 1]);
        }
        if (grid.isWalkableAt(x + dx, y - 1)) {
            neighbors.push([x + dx, y - 1]);
        }
    } else if (dy !== 0) {
        // Vertical movement
        if (grid.isWalkableAt(x, y + dy)) {
            neighbors.push([x, y + dy]);
        }
        if (grid.isWalkableAt(x + 1, y + dy)) {
            neighbors.push([x + 1, y + dy]);
        }
        if (grid.isWalkableAt(x - 1, y + dy)) {
            neighbors.push([x - 1, y + dy]);
        }
    }

    // Enhanced: Add potential smoother neighbors for turn minimization
    if (this.minimizeTurns) {
        var smoothNeighbors = this._findSmoothNeighbors(node, dx, dy, grid);
        neighbors = neighbors.concat(smoothNeighbors);
    }

    return neighbors;
};

/**
 * Find additional smooth neighbors to reduce turns (orthogonal movement only)
 * @param {PF.Node} node Current node
 * @param {number} dx Current direction x
 * @param {number} dy Current direction y
 * @param {PF.Grid} grid The grid
 * @return {Array<Array<number>>} Additional smooth neighbors
 */
JPFMinimizeTurns.prototype._findSmoothNeighbors = function (node, dx, dy, grid) {
    var smoothNeighbors = [];
    var x = node.x, y = node.y;

    // Orthogonal movement only - look for perpendicular directions
    if (dx !== 0) {
        // For horizontal movement, check vertical directions
        var vertDirs = [[0, 1], [0, -1]];
        for (var i = 0; i < vertDirs.length; i++) {
            var nx = x + vertDirs[i][0];
            var ny = y + vertDirs[i][1];

            if (grid.isWalkableAt(nx, ny)) {
                // Check if this leads to a smoother path
                var smoothJump = this._jump(nx, ny, x, y);
                if (smoothJump) {
                    smoothNeighbors.push([nx, ny]);
                }
            }
        }
    } else if (dy !== 0) {
        // For vertical movement, check horizontal directions
        var horizDirs = [[1, 0], [-1, 0]];
        for (var i = 0; i < horizDirs.length; i++) {
            var nx = x + horizDirs[i][0];
            var ny = y + horizDirs[i][1];

            if (grid.isWalkableAt(nx, ny)) {
                var smoothJump = this._jump(nx, ny, x, y);
                if (smoothJump) {
                    smoothNeighbors.push([nx, ny]);
                }
            }
        }
    }

    return smoothNeighbors;
};

JPFMinimizeTurns.prototype._identifySuccessors = function (node) {
    var grid = this.grid,
        heuristic = this.heuristic,
        openList = this.openList,
        endX = this.endNode.x,
        endY = this.endNode.y,
        neighbors, neighbor,
        jumpPoint, i, l,
        x = node.x, y = node.y,
        jx, jy, dx, dy, d, ng, jumpNode,
        abs = Math.abs, max = Math.max;

    neighbors = this._findNeighbors(node);
    for (i = 0, l = neighbors.length; i < l; ++i) {
        neighbor = neighbors[i];
        jumpPoint = this._jump(neighbor[0], neighbor[1], x, y);
        if (jumpPoint) {
            jx = jumpPoint[0];
            jy = jumpPoint[1];
            jumpNode = grid.getNodeAt(jx, jy);

            if (jumpNode.closed) {
                continue;
            }

            // 使用曼哈顿距离作为从当前节点到跳点的代价（严格正交）
            d = abs(jx - x) + abs(jy - y);
            ng = node.g + d * jumpNode.weight;

            // 可选：对拐弯施加惩罚，鼓励更少的拐点
            if (this.minimizeTurns && node.parent) {
                var prevDx = Math.sign(node.x - node.parent.x);
                var prevDy = Math.sign(node.y - node.parent.y);
                var currDx = Math.sign(jx - x);
                var currDy = Math.sign(jy - y);
                var isTurn = (prevDx !== currDx) || (prevDy !== currDy);
                if (isTurn) {
                    ng += this.turnPenalty;
                }
            }

            if (!jumpNode.opened || ng < jumpNode.g) {
                jumpNode.g = ng;
                // 仍然使用启发式评估到终点（建议使用曼哈顿）
                jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY));
                jumpNode.f = jumpNode.g + jumpNode.h;
                jumpNode.parent = node;

                if (!jumpNode.opened) {
                    openList.push(jumpNode);
                    jumpNode.opened = true;
                } else {
                    openList.updateItem(jumpNode);
                }
            }
        }
    }
};

module.exports = JPFMinimizeTurns; 