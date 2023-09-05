import { ChessGame, makeMove, getValidMoves } from "./game.js";
import { minimax, printBoard } from "./engine.js";
import { isCheckmate, isStalemate } from "./validators.js";

const boardDiv = document.querySelector(".board");
const callsSpan = document.querySelector(".calls");
const lostPiecesWhite = document.querySelector(".lost-pieces-white");
const lostPiecesBlack = document.querySelector(".lost-pieces-black");
const currentPlayer = document.querySelector(".current-player");
const newGameButton = document.querySelector(".new-game")

let squares = null

let game = new ChessGame('Vaibhav', 'Computer');

// Displaying Board
function setBoard(){
    boardDiv.innerHTML = ''
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            var color = (i+j)%2==0 ? 'white' : 'black'
            boardDiv.innerHTML += `<div class="square ${color}" data-row="${i}" data-col="${j}">${game.board.board[i][j] ? game.board.board[i][j].icon : ''}</div>`
        }
    }
    squares = document.querySelectorAll(".square");
    currentPlayer.innerHTML = game.currentPlayer
    lostPiecesBlack.innerHTML = ""
    lostPiecesWhite.innerHTML = ""
    game.capturedWhites.forEach((piece) => {
        lostPiecesWhite.innerHTML += piece.icon + " ";
    })
    game.capturedBlacks.forEach((piece) => {
        lostPiecesBlack.innerHTML += piece.icon + " ";
    })
}

setBoard()

// A function to highlight valid moves
function highlight(boxes){
    squares.forEach(square => square.classList.remove('highlight'));
    boxes.forEach((box) => {
        squares[box.row*8+box.col].classList.add('highlight');
    })
}

// Assigning event listeners to all squares
function addListeners(){
    // console.log("called")
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            squares[i * 8 + j].addEventListener("click", () => selectSquare(i, j));
        }
    }
}

addListeners();

// 
async function selectSquare(row, col){
    let square = squares[row*8+col]
    if(square.classList.contains("highlight")){
        // console.log(game.whitePieces)
        callsSpan.innerHTML = "0"
        makeMove(game, row, col);
        // console.log(game.whitePieces)
        setBoard();

        if(isCheckmate(game)){
            alert(game.currentPlayer === "white" ? "black" : "white" + " won!")
            window.location.reload()
        }
        else if (isStalemate(game)) {
            alert(game.currentPlayer + " has nothing to play. Match tied!")
            window.location.reload()
        }

        let [bestMove, value ] = [null, null]
        
        setTimeout(() => {
            [bestMove, value] = minimax(game, 3, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, true);

            game.selectedSquare = {
                row: bestMove.fromRow,
                col: bestMove.fromCol
            }
            // console.log(game.selectedSquare)
            makeMove(game, bestMove.toRow, bestMove.toCol, false, true)
            printBoard(game.board.board)
            setBoard()
            addListeners()
        }, 1)
        // printBoard(game.board.board)
        // console.log("got: ", bestMove)
        
    }
    else if(game.board.board[row][col]){ 
        if(game.currentPlayer==game.board.board[row][col].color){
            var boxes = getValidMoves(game, game.board.board[row][col]);
            highlight(boxes);
            game.selectedSquare = { row: row, col: col}
        }
        else{
            alert("Not your piece")
        }
    }
}

newGameButton.addEventListener("click", () => {
    game = new ChessGame("Vaibhav", "Computer")
    setBoard();
    callsSpan.innerHTML = "0"
})







