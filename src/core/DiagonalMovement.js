var DiagonalMovement = {
    Always: 1,
    Never: 2,
    IfAtMostOneObstacle: 3,
    OnlyWhenNoObstacles: 4,
    OrthogonalOnlyAndMinimizeTurns: 5 // 正交且拐角最小
};

module.exports = DiagonalMovement;