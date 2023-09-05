// import { cloneDeep } from 'lodash'
import { Move, ChessGame, getValidMoves, makeMove } from './game.js'


/* 
 * Piece Square Tables, adapted from Sunfish.py:
 * https://github.com/thomasahle/sunfish/blob/master/sunfish.py
 */

var weights = {
    '♟': 100,
    '♞': 280,
    '♝': 320,
    '♜': 479,
    '♛': 929,
    '♚': 60000,
    '♙': 100,
    '♘': 280,
    '♗': 320,
    '♖': 479,
    '♕': 929,
    '♔': 60000
};


const calls = document.querySelector(".calls")


/* 
 * Evaluates the board at this point in time, 
 * using the material weights and piece square tables.
*/

function evaluateBoard(game) {
    let whiteScore = 0;
    let blackScore = 0;

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            if (game.board.board[i][j]) {
                if (game.board.board[i][j].color === 'white') whiteScore += weights[game.board.board[i][j].icon];
                if (game.board.board[i][j].color === 'black') blackScore += weights[game.board.board[i][j].icon];
            }
        }
    }
    if (game.currentPlayer == 'white') return whiteScore - blackScore
    else return blackScore - whiteScore
}

/*
 * Performs the minimax algorithm to choose the best move: https://en.wikipedia.org/wiki/Minimax (pseudocode provided)
 * Recursively explores all possible moves up to a given depth, and evaluates the game board at the leaves.
 * 
 * Basic idea: maximize the minimum value of the position resulting from the opponent's possible following moves.
 * Optimization: alpha-beta pruning: https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning (pseudocode provided)
 * 
 * Inputs:
 *  - game:                 the game object.
 *  - depth:                the depth of the recursive tree of all possible moves (i.e. height limit).
 *  - isMaximizingPlayer:   true if the current layer is maximizing, false otherwise.
 * 
 * Output:
 *  the best move at the root of the current subtree.
 */
export function minimax(game, depth, alpha, beta, isMaximizingPlayer) {
    let allMoves = [];
    calls.innerHTML = parseInt(calls.innerHTML)+1;

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            if (game.board.board[i][j] != null) {
                if (game.board.board[i][j].color === game.currentPlayer) {
                    let moves = getValidMoves(game, game.board.board[i][j])
                    moves.forEach(move => allMoves.push(
                        {
                            fromRow: i,
                            fromCol: j,
                            toRow: move.row,
                            toCol: move.col
                        }
                    ))
                }
            }
        }
    }

    var children = allMoves;

    // Sort moves randomly, so the same move isn't always picked on ties
    children.sort(function (a, b) { return 0.5 - Math.random() });

    var currMove;
    // Maximum depth exceeded or node is a terminal node (no children)
    if (depth === 0 || children.length === 0) {
        return [null, evaluateBoard(game)]
    }

    // Find maximum/minimum from list of 'children' (possible moves)
    var maxValue = Number.NEGATIVE_INFINITY;
    var minValue = Number.POSITIVE_INFINITY;

    var bestMove;

    let initial = JSON.stringify(game)


    for (var i = 0; i < children.length; i++) {

        currMove = children[i];

        let dummy = JSON.parse(JSON.stringify(game))
        dummy.selectedSquare = {
            row: currMove.fromRow,
            col: currMove.fromCol
        }
        makeMove(dummy, currMove.toRow, currMove.toCol)


        var [childBestMove, childValue] = minimax(dummy, depth - 1, alpha, beta, !isMaximizingPlayer);
        // If white is playing then it will try to increase the value in positive side
        if (isMaximizingPlayer) {
            if (childValue > maxValue) {
                maxValue = childValue;
                bestMove = currMove;
            }
            if (childValue > alpha) {
                alpha = childValue;
            }
        }

        // If black is playing then it will try to increase the value in negative side
        else {
            if (childValue < minValue) {
                minValue = childValue;
                bestMove = currMove;
            }
            if (childValue < beta) {
                beta = childValue;
            }
        }

        // Alpha-beta pruning
        if (alpha >= beta) {
            break;
        }
    }

    game = JSON.parse(initial)

    if (isMaximizingPlayer) {
        return [bestMove, maxValue]
    }
    else {
        return [bestMove, minValue];
    }
}


export function printBoard(board) {
    var str = ""
    for (var i = 0; i < 8; i++) {
        var s = ""
        for (var j = 0; j < 8; j++) {
            if (board[i][j]) s += board[i][j].icon
            else s += "  ";
            s += " "
        }
        s += "\n"
        str += s
    }
    console.log(str)
}


