import { isValidMove } from "./validators.js";

const COLORS = {
    W: 'white',
    B: 'black'
}

const ICONS = {
    black:
    {
        pawn: '♟',
        knight: '♞',
        bishop: '♝',
        rook: '♜',
        queen: '♛',
        king: '♚',
    },
    white: {
        pawn: '♙',
        knight: '♘',
        bishop: '♗',
        rook: '♖',
        queen: '♕',
        king: '♔'
    }
}

export class Piece {
    constructor(color, row, col, left, right, icon, promoted=false) {
        this.color = color;
        this.row = row;
        this.col = col;
        this.moved = false;
        this.left = left;
        this.right = right;
        this.icon = icon;
        this.promoted = promoted;
    }
}

export function getValidMoves(game, piece) {
    var moves = [];
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            if (isValidMove(game, new Move(piece.row, piece.col, i, j))) {
                moves.push({ row: i, col: j });
            }
        }
    }
    return moves;
}

export class Board {
    constructor() {
        this.board = this.initializeBoard();
    }

    initializeBoard() {
        let board = new Array(8).fill(null).map(() => new Array(8).fill(null));

        // Initialize pawns
        for (let i = 0; i < 8; i++) {
            board[1][i] = new Piece(COLORS.B, 1, i, false, false, ICONS[COLORS.B].pawn);
            board[6][i] = new Piece(COLORS.W, 6, i, false, false, ICONS[COLORS.W].pawn);
        }

        // Initialize other pieces
        board[0][0] = new Piece(COLORS.B, 0, 0, true, false, ICONS[COLORS.B].rook);
        board[0][7] = new Piece(COLORS.B, 0, 7, false, true, ICONS[COLORS.B].rook);
        board[7][0] = new Piece(COLORS.W, 7, 0, true, false, ICONS[COLORS.W].rook);
        board[7][7] = new Piece(COLORS.W, 7, 7, false, true, ICONS[COLORS.W].rook);
        board[0][1] = new Piece(COLORS.B, 0, 1, true, false, ICONS[COLORS.B].knight);
        board[0][6] = new Piece(COLORS.B, 0, 6, false, true, ICONS[COLORS.B].knight);
        board[7][1] = new Piece(COLORS.W, 7, 1, true, false, ICONS[COLORS.W].knight);
        board[7][6] = new Piece(COLORS.W, 7, 6, false, true, ICONS[COLORS.W].knight);
        board[0][2] = new Piece(COLORS.B, 0, 2, true, false, ICONS[COLORS.B].bishop);
        board[0][5] = new Piece(COLORS.B, 0, 5, false, true, ICONS[COLORS.B].bishop);
        board[7][2] = new Piece(COLORS.W, 7, 2, true, false, ICONS[COLORS.W].bishop);
        board[7][5] = new Piece(COLORS.W, 7, 5, false, true, ICONS[COLORS.W].bishop);
        board[0][3] = new Piece(COLORS.B, 0, 3, false, false, ICONS[COLORS.B].queen);
        board[7][3] = new Piece(COLORS.W, 7, 3, false, false, ICONS[COLORS.W].queen);
        board[0][4] = new Piece(COLORS.B, 0, 4, false, false, ICONS[COLORS.B].king);
        board[7][4] = new Piece(COLORS.W, 7, 4, false, false, ICONS[COLORS.W].king);

        return board;
    }
}

export class Move {
    constructor(fromRow, fromCol, toRow, toCol) {
        this.fromRow = fromRow,
        this.fromCol = fromCol,
        this.toRow = toRow,
        this.toCol = toCol
    }
}

export class ChessGame {
    constructor() {
        this.board = new Board();
        this.currentPlayer = COLORS.W;
        this.whitePlayer = null;
        this.blackPlayer = null;
        this.lastMove = null;
        this.capturedWhites = [];
        this.capturedBlacks = [];
        this.selectedSquare = null;
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        this.whiteLeftRookMoved = false;
        this.whiteRightRookMoved = false;
        this.blackLeftRookMoved = false;
        this.blackRightRookMoved = false;
        this.finished = false;
        this.winner = null;
        this.draw = false;
        this.resign = null;
    }
}


export function makeMove(game, row, col, promoted=false, check = false) {

    game.lastMove = new Move(game.selectedSquare.row, game.selectedSquare.col, row, col)

    if (!game.whiteKingMoved && game.board.board[game.selectedSquare.row][game.selectedSquare.col].icon === ICONS.white.king) game.whiteKingMoved = true;
    if (!game.whiteKingMoved && game.board.board[game.selectedSquare.row][game.selectedSquare.col].icon === ICONS.white.king) game.blackKingMoved = true;
    if (!game.whiteLeftRookMoved && game.selectedSquare.row === 7 && game.selectedSquare.col === 0 && game.board.board[game.selectedSquare.row][game.selectedSquare.col].icon === ICONS.white.rook) game.whiteLeftRookMoved = true;
    if (!game.whiteRightRookMoved && game.selectedSquare.row === 7 && game.selectedSquare.col === 7 && game.board.board[game.selectedSquare.row][game.selectedSquare.col].icon === ICONS.white.rook) game.whiteRightRookMoved = true;
    if (!game.blackLeftRookMoved && game.selectedSquare.row === 0 && game.selectedSquare.col === 0 && game.board.board[game.selectedSquare.row][game.selectedSquare.col].icon === ICONS.black.rook) game.blackLeftRookMoved = true;
    if (!game.blackRightRookMoved && game.selectedSquare.row === 0 && game.selectedSquare.col === 7 && game.board.board[game.selectedSquare.row][game.selectedSquare.col].icon === ICONS.black.rook) game.blackRightRookMoved = true;

    game.board.board[game.selectedSquare.row][game.selectedSquare.col].moved = true;

    game.board.board[game.selectedSquare.row][game.selectedSquare.col].row = row;
    game.board.board[game.selectedSquare.row][game.selectedSquare.col].col = col;

    if(game.board.board[row][col]){
        if(game.currentPlayer===COLORS.W) game.capturedBlacks.push(game.board.board[row][col]);
        else game.capturedWhites.push(game.board.board[row][col])
    }

    if(!promoted) game.board.board[row][col] = game.board.board[game.selectedSquare.row][game.selectedSquare.col]
    else {
        console.log(ICONS[game.currentPlayer][promoted])
        game.board.board[row][col] = new Piece(game.currentPlayer, row, col, false, false, ICONS[game.currentPlayer][promoted], true)
    }
    game.board.board[game.selectedSquare.row][game.selectedSquare.col] = null;

    game.selectedSquare = null;
    game.currentPlayer = game.currentPlayer === COLORS.W ? COLORS.B : COLORS.W;

}
