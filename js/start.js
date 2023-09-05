import { ChessGame } from "./game.js";

const roomIdInput = document.getElementById("room_id");
const roleInput = document.getElementById("role");
const createButton = document.getElementById("create");
const joinButton = document.getElementById("join");
const playButton = document.getElementById("play");

function createRoom(e) {
    e.preventDefault();
    const game = new ChessGame()
    console.log(typeof(JSON.stringify(game)));
    fetch("http://localhost:3000/games/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({game: JSON.stringify(game)})
    }).then(async (res) => {
        return res.json();
    })
    .then(res => {
        window.location.href = "/index.html?" + res.obj.gameId;
    })
}

function joinRoom(e) {
    e.preventDefault();
    window.location.href = "/index.html?" + roomIdInput.value;
}

function playWithComputer(e) {
    e.preventDefault();
    window.location.href = "/computer.html";
}

createButton.addEventListener("click", createRoom);
joinButton.addEventListener("click", joinRoom);
playButton.addEventListener("click", playWithComputer);
