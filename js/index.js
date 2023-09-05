import { ChessGame, makeMove, getValidMoves, Move } from "./game.js";
import { isCheckmate, isStalemate, isPawnPromotion } from "./validators.js";

const boardDiv = document.querySelector(".board");
const currentPlayerSpan = document.querySelector(".current-player");
const whitePlayerSpan = document.querySelector(".white-player");
const blackPlayerSpan = document.querySelector(".black-player");
const gameIdHeading = document.querySelector(".game-id")
const lostPiecesWhite = document.querySelector(".lost-pieces-white");
const lostPiecesBlack = document.querySelector(".lost-pieces-black");

let squares = null

let game = new ChessGame();

let gameId = window.location.href.split("?").slice(-1)[0];

gameIdHeading.innerHTML += gameId;

let username = localStorage.getItem("username");

console.log(localStorage.getItem("token"))

axios.get('http://127.0.0.1:3000/games/'+gameId, {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem("token") }
})
    .then(function (response) {
        // handle success
        game = JSON.parse(response.data.game);
        whitePlayerSpan.innerHTML += game.whitePlayer
        blackPlayerSpan.innerHTML += game.blackPlayer
        setBoard()
        addListeners()
    })
    .catch(function (error) {
        // handle error
        console.log(error);
    })
    .finally(function () {
        // always executed
    });

// Displaying Board
function setBoard() {
    boardDiv.innerHTML = ''
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            var color = (i + j) % 2 == 0 ? 'white' : 'black'
            boardDiv.innerHTML += `<div class="square ${color}" data-row="${i}" data-col="${j}">${game.board.board[i][j] ? game.board.board[i][j].icon : ''}</div>`
        }
    }
    squares = document.querySelectorAll(".square");
    currentPlayerSpan.innerHTML = game.currentPlayer
    if (game.blackPlayer === localStorage.getItem("username")) {
        boardDiv.style.transform = "rotate(180deg)";
        squares.forEach(square => square.style.transform = "rotate(180deg)");
    }
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
function highlight(boxes) {
    squares.forEach(square => square.classList.remove('highlight'));
    boxes.forEach((box) => {
        squares[box.row * 8 + box.col].classList.add('highlight');
    })
}

// Assigning event listeners to all squares
function addListeners() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            squares[i * 8 + j].addEventListener("click", () => selectSquare(i, j));
        }
    }
}

addListeners();

// 
async function selectSquare(row, col) {

    if(game.finished) {
        alert("Game finished")
        return;
    }
    let square = squares[row * 8 + col]
    if(
        game.currentPlayer === 'white' && game.whitePlayer !== localStorage.getItem("username") ||
        game.currentPlayer === 'black' && game.blackPlayer !== localStorage.getItem("username")
    ){
        alert("Not your turn");
        return;
    }
    if (square.classList.contains("highlight")) {
        
        let promotion = isPawnPromotion(game, new Move(game.selectedSquare.row, game.selectedSquare.col, row, col));

        if (promotion){
            promotion = window.prompt("Type the piece name to which you want to promote\nChoices are 'queen', 'bishop', 'knight', 'rook': ")
            let options = ['queen', 'bishop', 'knight', 'rook']
            while (!options.includes(promotion)){
                promotion = window.prompt("Type the piece name to which you want to promote\nChoices are 'queen', 'bishop', 'knight', 'rook': ")
            }
        }

        makeMove(game, row, col, promotion);
        setBoard();

        if (isCheckmate(game)) {
            alert(game.currentPlayer === "white" ? "black" : "white" + " won!")
            game.winner = game.currentPlayer === "white" ? "black" : "white";
            game.finished = true;
        }
        else  if (isStalemate(game)) {
            alert(game.currentPlayer + " has nothing to play. Match tied!")
            game.draw = true;
            game.finished = true;
        }

        socket.emit("play-game", { gameId: gameId, updated_game: JSON.stringify(game) });

        addListeners()
    }
    else if (game.board.board[row][col]) {
        if (game.currentPlayer == game.board.board[row][col].color) {
            var boxes = getValidMoves(game, game.board.board[row][col]);
            highlight(boxes);
            game.selectedSquare = { row: row, col: col }
        }
        else {
            alert("Not your piece")
        }
    }
}

const socket = io("http://localhost:3000");

socket.on("connect", () => {
    socket.emit("join-game", { gameId: gameId })
})

socket.on("play-game", ({gameId, updated_game}) => {
    game = JSON.parse(updated_game);
    setBoard()
    if(game.finished){
        if(game.draw){
            alert("Stalemate")
        }
        else if(game.resigned){
            alert(game.resigned+" has resigned")
        }
        else if(game.winner){
            alert(game.winner + "won!")
        }
    }
    addListeners()
})






