import Network from "./components/Network.js";
import Board from "./components/Board.js";

const network = new Network(() => document.getElementById("serverStatus").innerHTML = "Connected", () => document.getElementById("serverStatus").innerHTML = "Disconnected");
const board = new Board({
	id: "board",
	size: "400px",
	network,
	statusCB: (text) => document.getElementById("status").innerHTML = text,
	flagCounterCB: (text) => document.getElementById("flagCounter").innerHTML = text,
	turnCounterCB: (text) => document.getElementById("turnCounter").innerHTML = `Move ${text}`
});

network.addOnMessage("setBoard", (data) => {
	document.getElementById("claimWhite").disabled = data.whitePlayer;
	if (data.whitePlayer) {
		document.getElementById("youAreWhite").innerHTML = "White is claimed.";
	} else {
		document.getElementById("youAreWhite").innerHTML = "White is not claimed.";
	}
	document.getElementById("claimBlack").disabled = data.blackPlayer;
	if (data.blackPlayer) {
		document.getElementById("youAreBlack").innerHTML = "Black is claimed.";
	} else {
		document.getElementById("youAreBlack").innerHTML = "Black is not claimed.";
	}
	board.setBoard(data.fen, data.mineCount, data.prevMove, !(data.whitePlayer && data.blackPlayer));
	document.getElementById("flagCounter").innerHTML = data.mineCount;
});
network.addOnMessage("resetBoard", (data) => {
	board.setBoard(data.fen, data.mineCount, data.prevMove, !(data.whitePlayer && data.blackPlayer));
	document.getElementById("claimWhite").disabled = false;
	document.getElementById("claimBlack").disabled = false;
	document.getElementById("youAreWhite").innerHTML = "White is not claimed.";
	document.getElementById("youAreBlack").innerHTML = "Black is not claimed.";
});
network.addOnMessage("whiteClaimed", (data) => {
	if (data.taken) {
		document.getElementById("youAreWhite").innerHTML = "White is claimed.";
		document.getElementById("claimWhite").disabled = true;
	} else {
		board.setBoard(data.fen, data.mineCount, {}, true, "White");
		document.getElementById("claimWhite").disabled = false;
		document.getElementById("claimBlack").disabled = false;
		document.getElementById("youAreWhite").innerHTML = "White is not claimed.";
		document.getElementById("youAreBlack").innerHTML = "Black is not claimed.";
	}
});
network.addOnMessage("blackClaimed", (data) => {
	if (data.taken) {
		document.getElementById("youAreBlack").innerHTML = "Black is claimed.";
		document.getElementById("claimBlack").disabled = true;
	} else {
		board.setBoard(data.fen, data.mineCount, {}, true, "Black");
		document.getElementById("claimWhite").disabled = false;
		document.getElementById("claimBlack").disabled = false;
		document.getElementById("youAreWhite").innerHTML = "White is not claimed.";
		document.getElementById("youAreBlack").innerHTML = "Black is not claimed.";
	}
});
network.addOnMessage("startGame", () => {
	board.startGame();
});
network.addOnMessage("moveAll", (data) => {
	board.setTimers(data.timers);
	if (data.move) {
		board.move(data.move, data.extraInfo);
	} else {
		board.skipTurn(data.extraInfo);
	}
});

network.connect(document.getElementById("serverIP").value, document.getElementById("serverPort").value); //173.95.165.30
// document.getElementById("serverConnect").onclick = () => {
// 	network.disconnect();
// 	network.connect(document.getElementById("serverIP").value, document.getElementById("serverPort").value);
// };
document.getElementById("connectForm").onsubmit = (event) => {
	event.preventDefault();
	network.disconnect();
	network.connect(document.getElementById("serverIP").value, document.getElementById("serverPort").value);
};
document.getElementById("serverDisconnect").onclick = () => {
	network.disconnect();
};
// document.getElementById("joinLobby").onclick = () => {
// 	network.send({
// 		action: "joinLobby",
// 		args: {
// 			lobbyCode: document.getElementById("lobbyCode")
// 		}
// 	});
// };
document.getElementById("lobbyForm").onsubmit = (event) => {
	event.preventDefault();
	network.addOnMessage("joinLobby", (data) => {
		if (data.error) {
			console.log(error);
		} else {
			document.getElementById("lobbyCode").innerHTML = data.lobbyCode;
			document.getElementById("lobbyCodeInput").value = "";
		}
		network.removeOnMessage("joinLobby");
	});
	network.send({
		action: "joinLobby",
		args: {
			lobbyCode: document.getElementById("lobbyCodeInput").value
		}
	});
};
document.getElementById("createLobby").onclick = () => {
	network.addOnMessage("createLobby", (data) => {
		if (data.error) {
			console.log(error);
		} else {
			document.getElementById("lobbyCode").innerHTML = data.lobbyCode;
			document.getElementById("lobbyCodeInput").value = "";
		}
		network.removeOnMessage("createLobby");
	});
	network.send({ action: "createLobby" });
}

document.getElementById("board").onmousedown = (event) => {
	board.mouseDown(event);
	document.querySelectorAll(":focus").forEach((e) => e.blur());
	return false;
};
document.onmouseup = (event) => {
	board.mouseUp(event);
};
document.onmousemove = (event) => {
	board.mouseMove(event);
};

document.getElementById("flipBoard").onclick = () => {
	document.getElementById("container").classList.toggle("flipped");
	board.flipBoard();
};
document.getElementById("resetBoard").onclick = () => {
	network.send({ action: "resetBoard" });
};

document.getElementById("claimWhite").onclick = () => {
	network.addOnMessage("claimWhite", (data) => {
		if (data.error) {
			console.log(error);
		} else {
			board.color = "w";
			if (board.perspective !== "w") {
				document.getElementById("container").classList.toggle("flipped");
				board.flipBoard();
			}
			document.getElementById("claimWhite").disabled = true;
			document.getElementById("claimBlack").disabled = true;
			document.getElementById("youAreWhite").innerHTML = "You are White.";
		}
		network.removeOnMessage("claimWhite");
	});
	network.send({ action: "claimWhite" });
};
document.getElementById("claimBlack").onclick = () => {
	network.addOnMessage("claimBlack", (data) => {
		if (data.error) {
			console.log(error);
		} else {
			board.color = "b";
			if (board.perspective !== "b") {
				document.getElementById("container").classList.toggle("flipped");
				board.flipBoard();
			}
			document.getElementById("claimWhite").disabled = true;
			document.getElementById("claimBlack").disabled = true;
			document.getElementById("youAreBlack").innerHTML = "You are Black."
		}
		network.removeOnMessage("claimBlack");
	});
	network.send({ action: "claimBlack" });
};