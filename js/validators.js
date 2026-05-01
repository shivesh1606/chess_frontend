import { makeMove } from "./game.js";
import { printBoard } from "./engine.js";


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



const validityFunctions = {
    "♖": isValidRookMove,
    "♜": isValidRookMove,
    "♘": isValidKnightMove,
    "♞": isValidKnightMove,
    "♗": isValidBishopMove,
    "♝": isValidBishopMove,
    "♕": isValidQueenMove,
    "♛": isValidQueenMove,
    "♔": isValidKingMove,
    "♚": isValidKingMove,
    "♙": isValidPawnMove,
    "♟": isValidPawnMove,
};

// Function to check if a move is valid
export function isValidMove(game, move) {

    // Piece can't move to its own location
    if (move.fromRow === move.toRow && move.fromCol === move.toCol) return false;

    // User can't move a piece to a place where it's own piece is present
    if (game.board.board[move.toRow][move.toCol]) {
        if (game.currentPlayer === game.board.board[move.toRow][move.toCol].color) {
            return false;
        }
    }

    let isValid = validityFunctions[game.board.board[move.fromRow][move.fromCol].icon](game, move);

    // console.log("valid 1: ", JSON.stringify(isValid))
    
    if (isValid === true) {
        isValid = isValid && !isIllegalMove(game, move);
        // console.log("valid: ", JSON.stringify(isValid))
    }

   
    return isValid;
}
 
// Function to check if a rook move is valid
export function isValidRookMove(game, move) {
    // Check if the move is horizontal or vertical
    if (move.fromRow === move.toRow || move.fromCol === move.toCol) {
        // Check if there are any pieces in the way
        if (move.fromRow === move.toRow) {
            const start = Math.min(move.fromCol, move.toCol) + 1;
            const end = Math.max(move.fromCol, move.toCol);

            for (let col = start; col < end; col++) {
                if (game.board.board[move.fromRow][col]) {
                    return false;
                }
            }
        } else {
            const start = Math.min(move.fromRow, move.toRow) + 1;
            const end = Math.max(move.fromRow, move.toRow);

            for (let row = start; row < end; row++) {
                if (game.board.board[row][move.fromCol]) {
                    return false;
                }
            }
        }

        return true;
    }

    return false;
}

// Function to check if a knight move is valid
export function isValidKnightMove(game, move) {
    // Check if the move is L-shaped
    const rowDiff = Math.abs(move.toRow - move.fromRow);
    const colDiff = Math.abs(move.toCol - move.fromCol);

    return (
        (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)
    );
}

// Function to check if a bishop move is valid
export function isValidBishopMove(game, move) {
    // Check if the move is diagonal
    const rowDiff = Math.abs(move.toRow - move.fromRow);
    const colDiff = Math.abs(move.toCol - move.fromCol);

    if (rowDiff === colDiff && (rowDiff > 0 || colDiff > 0)) {
        // Check if there are any pieces in the way
        const rowDir = move.toRow > move.fromRow ? 1 : -1;
        const colDir = move.toCol > move.fromCol ? 1 : -1;
        let row = move.fromRow + rowDir;
        let col = move.fromCol + colDir;
        while (row !== move.toRow && col !== move.toCol) {
            if (game.board.board[row][col]) {
                return false;
            }

            row += rowDir;
            col += colDir;
        }

        return true;
    }

    return false;
}

// Function to check if a queen move is valid
export function isValidQueenMove(game, move) {
    // Queen move is valid if it's a valid rook move or a valid bishop move
    return (
        isValidRookMove(game, move) ||
        isValidBishopMove(game, move)
    );
}

// Returns true if any piece of attackerColor can attack (targetRow, targetCol).
// Handles pawn and king attacks directly to avoid recursion / incorrect pawn-forward checks.
function isSquareAttackedBy(game, targetRow, targetCol, attackerColor) {
    const pawnDir = attackerColor === 'white' ? -1 : 1;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = game.board.board[r][c];
            if (!piece || piece.color !== attackerColor) continue;
            if (piece.icon === ICONS[attackerColor].pawn) {
                if (r + pawnDir === targetRow && Math.abs(c - targetCol) === 1) return true;
            } else if (piece.icon === ICONS[attackerColor].king) {
                if (Math.abs(r - targetRow) <= 1 && Math.abs(c - targetCol) <= 1 && !(r === targetRow && c === targetCol)) return true;
            } else {
                const dummy = { ...game, currentPlayer: attackerColor };
                if (validityFunctions[piece.icon](dummy, { fromRow: r, fromCol: c, toRow: targetRow, toCol: targetCol })) return true;
            }
        }
    }
    return false;
}

// Function to check if a king move is valid
export function isValidKingMove(game, move) {

    // Normal one-square king move
    const rowDiff = Math.abs(move.toRow - move.fromRow);
    const colDiff = Math.abs(move.toCol - move.fromCol);

    if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1) || (rowDiff === 1 && colDiff === 1)) {
        return true;
    }

    // Castling: king moves exactly 2 squares horizontally from its starting position
    if (rowDiff === 0 && colDiff === 2) {
        const color = game.currentPlayer;
        const rank = color === 'white' ? 7 : 0;
        if (move.fromRow !== rank || move.fromCol !== 4) return false;

        const kingMoved = color === 'white' ? game.whiteKingMoved : game.blackKingMoved;
        if (kingMoved) return false;

        const opponentColor = color === 'white' ? 'black' : 'white';

        if (move.toCol === 6) {
            const rookMoved = color === 'white' ? game.whiteRightRookMoved : game.blackRightRookMoved;
            if (rookMoved) return false;
            if (!game.board.board[rank][7] || game.board.board[rank][7].icon !== ICONS[color].rook) return false;
            if (game.board.board[rank][5] || game.board.board[rank][6]) return false;
            if (isSquareAttackedBy(game, rank, 4, opponentColor)) return false;
            if (isSquareAttackedBy(game, rank, 5, opponentColor)) return false;
            if (isSquareAttackedBy(game, rank, 6, opponentColor)) return false;
            return true;
        }

        if (move.toCol === 2) {
            const rookMoved = color === 'white' ? game.whiteLeftRookMoved : game.blackLeftRookMoved;
            if (rookMoved) return false;
            if (!game.board.board[rank][0] || game.board.board[rank][0].icon !== ICONS[color].rook) return false;
            if (game.board.board[rank][1] || game.board.board[rank][2] || game.board.board[rank][3]) return false;
            if (isSquareAttackedBy(game, rank, 4, opponentColor)) return false;
            if (isSquareAttackedBy(game, rank, 3, opponentColor)) return false;
            if (isSquareAttackedBy(game, rank, 2, opponentColor)) return false;
            return true;
        }
    }

    return false;
}

// Function to check if a pawn move is valid
export function isValidPawnMove(game, move) {

    const direction = game.currentPlayer=='white' ? -1 : 1;

    // Check if it's a valid pawn move one square forward
    if (move.fromCol === move.toCol && move.toRow === move.fromRow + direction && game.board.board[move.toRow][move.toCol] === null) {
        return true;
    }

    // Check if it's a valid pawn move two squares forward from the starting position
    if (
        (
            (direction === -1 && move.fromRow === 6) ||
            (direction === 1 && move.fromRow === 1)
        ) &&
        move.fromCol === move.toCol &&
        move.toRow === move.fromRow + 2 * direction &&
        game.board.board[move.toRow][move.toCol] === null &&
        game.board.board[move.fromRow + direction][move.fromCol] === null
    ) {
        return true;
    }

    // Check if it's a valid pawn capture move
    if (
        Math.abs(move.toCol - move.fromCol) === 1 &&
        move.toRow === move.fromRow + direction &&
        game.board.board[move.toRow][move.toCol] &&
        game.board.board[move.toRow][move.toCol].color !== game.currentPlayer
    ) {
        return true;
    }

    // En passant: diagonal move to empty square when last move was an adjacent 2-square pawn advance
    if (
        game.lastMove !== null &&
        Math.abs(move.toCol - move.fromCol) === 1 &&
        move.toRow === move.fromRow + direction &&
        game.board.board[move.toRow][move.toCol] === null
    ) {
        const lastPiece = game.board.board[game.lastMove.toRow][game.lastMove.toCol];
        if (
            lastPiece &&
            lastPiece.color !== game.currentPlayer &&
            (lastPiece.icon === ICONS.black.pawn || lastPiece.icon === ICONS.white.pawn) &&
            Math.abs(game.lastMove.toRow - game.lastMove.fromRow) === 2 &&
            game.lastMove.toRow === move.fromRow &&
            game.lastMove.toCol === move.toCol
        ) {
            return true;
        }
    }

    return false;
}

export function isPawnPromotion(game, move){
    if (game.board.board[move.fromRow][move.fromCol] && game.board.board[move.fromRow][move.fromCol].icon === ICONS[game.currentPlayer].pawn){
        if(
            (game.currentPlayer===COLORS.W && move.toRow===0) ||
            (game.currentPlayer===COLORS.B && move.toRow===7)
            
        ) return true;
    }
    return false;
}


// Function to check for checkmate
export function isCheckmate(game) {
    // Find the positions of both kings
    let kingPosition = null;

    let pieces = [];

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (
                game.board.board[row][col] &&
                game.currentPlayer === game.board.board[row][col].color
            ) {
                pieces.push([game.board.board[row][col], row, col]);
            }

            if (
                game.board.board[row][col] &&
                (
                    (game.currentPlayer === "black" && game.board.board[row][col].icon === "♚") ||
                    (game.currentPlayer === "white" && game.board.board[row][col].icon === "♔")
                )
            ) {
                kingPosition = {
                    row: row,
                    col: col,
                };
            }
        }
    }

    // Check if the current player's king is in check
    if (isKingThreatened(kingPosition, game)) {
        // Check if the current player has any valid move that can remove the check
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                for (let i = 0; i < pieces.length; i++) {
                    if (isValidMove(
                        game,
                        {
                            fromRow: pieces[i][1],
                            fromCol: pieces[i][2],
                            toRow: row,
                            toCol: col
                        }
                    )) {
                        return false;
                    }
                }
            }
        }

        return true; // No move can remove the check, it's checkmate
    }

    return false; // White king is not in checkmate
}


// Function to check if the king is threatened
export function isKingThreatened(kingPosition, game) {
    // Getting position of all the pieces of the opponent player
    let pieces = [];

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (
                game.board.board[row][col] &&
                game.currentPlayer === game.board.board[row][col].color
            ) {
                pieces.push([game.board.board[row][col], row, col]);
            }
        }
    }

    // Checking if any of the current player's piece can reach the king
    for (let i = 0; i < pieces.length; i++) {
        if (
            validityFunctions[pieces[i][0].icon](
                game,
                {
                    fromRow: pieces[i][1],
                    fromCol: pieces[i][2],
                    toRow: kingPosition.row,
                    toCol: kingPosition.col
                }
            )
        ) {
            // Checking if the valid move is a capture move or not
            return true;
        }
    }

    return false; // King is not threatened
}


// Function to check for stalemate
export function isStalemate(game) {
    // Getting position of all the pieces of the current player
    let pieces = [];


    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (
                game.board.board[row][col] &&
                game.currentPlayer === game.board.board[row][col].color
            ) {
                pieces.push([game.board.board[row][col], row, col]);
            }
        }
    }

    // Going through all the squares present on the chess board
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            // Checking if any piece of the current player can move to this particular square
            for (let i = 0; i < pieces.length; i++) {
                if (isValidMove(
                    game,
                    {
                        fromRow: pieces[i][1],
                        fromCol: pieces[i][2],
                        toRow: row,
                        toCol: col
                    }
                )) {
                    return false;
                }
            }
        }
    }

    return true; // No valid moves available, it's stalemate
}

// Function to check if the move is legal
function isIllegalMove(game, move) {
    // console.log("Hi")
    let initial = JSON.stringify(game);

    let currentPlayer = game.board.board[move.fromRow][move.fromCol].color 
    let opponentColor = currentPlayer === "white" ? "black" : "white";

    let dummy = JSON.parse(JSON.stringify(game))

    // console.log("Initially: ")
    // printBoard(dummy.board.board)

    dummy.selectedSquare = {
        row: move.fromRow,
        col: move.fromCol
    }

    dummy.currentPlayer = game.board.board[move.fromRow][move.fromCol].color 

    makeMove(dummy, move.toRow, move.toCol);

    // console.log("Finally: ")
    // printBoard(dummy.board.board)

    let kingPosition = null;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (
                (currentPlayer === "black" && dummy.board.board[row][col] && dummy.board.board[row][col].icon === "♚") ||
                (currentPlayer === "white" && dummy.board.board[row][col] && dummy.board.board[row][col].icon === "♔")
            ) {
                kingPosition = {
                    row: row,
                    col: col,
                };
            }
        }
    }

    // console.log("king: ", kingPosition)

    if (kingPosition === null) return false;

    dummy.currentPlayer = opponentColor;

    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {

            // There is no piece at this square
            if (
                dummy.board.board[i][j] === null
            )
                continue;

            // Piece can't be moved to its own place
            if (i == kingPosition.row && j == kingPosition.col) continue;

            // User can't move a piece to a place where it's own piece is present
            if (
                dummy.board.board[i][j].color === currentPlayer
            )
                continue;
            if (
                validityFunctions[dummy.board.board[i][j].icon](
                    dummy,
                    {
                        fromRow: i,
                        fromCol: j,
                        toRow: kingPosition.row,
                        toCol: kingPosition.col
                    }
                )
            ) {
                // console.log()
                game = JSON.parse(initial)
                return true;
            }
        }
    }
    game = JSON.parse(initial)
    return false;
}
