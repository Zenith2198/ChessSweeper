import Piece from "./Piece.js";
import Square from "./Square.js";
import Taken from "./Taken.js";
import Timer from "./Timer.js";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default class Board {
	constructor({ id, size, network, statusCB, flagCounterCB, turnCounterCB }) {
		this.size = size;
		this.network = network;
		this.statusCB = statusCB;
		this.flagCounterCB = flagCounterCB;
		this.turnCounterCB = turnCounterCB;

		this.element = document.getElementById(id);
		this.element.classList.add("Board");
		this.element.style.width = this.size;
		this.element.style.height = this.size;

		this.squares = {}; //board positions to class objects
		this.squareElements = new Map(); //dom objects to class objects
		this.pieceElements = new Map(); //dom objects to class objects
		this.game = new Chess();

		this.whiteTimer = new Timer({
			id: "whiteTimer",
			flagCB: () => this.flag("w")
		});
		this.blackTimer = new Timer({
			id: "blackTimer",
			flagCB: () => this.flag("b")
		});
		this.whiteTaken = new Taken({
			id: "whiteTaken",
			color: "b"
		});
		this.blackTaken = new Taken({
			id: "blackTaken",
			color: "w"
		});

		this.perspective = "w";
		this.status = "";
		this.dragging = false;
		this.lastMousePos = [];
		this.draggedPiece;
		this.prevSquare;
		this.prevMove = {};

		this.gameOver = false;
		this.currFlags = 0;
		this.prevPositions = {};
		this.color = "";

		this.init();
	}

	mouseDown(event) {
		if (this.gameOver) {
			return;
		}
		let piece = document.elementsFromPoint(event.clientX, event.clientY).find(e => e.classList.contains("Piece"))
		if (event.button === 0 && piece && this.game.turn() === this.pieceElements.get(piece).color && this.color === this.game.turn()) {
			event.preventDefault();
			this.dragging = true;
			this.prevSquare = this.squareElements.get(document.elementsFromPoint(event.clientX, event.clientY).find(e => e.classList.contains("Square")));
			this.lastMousePos = [event.clientX, event.clientY];
			this.draggedPiece = piece;
			this.draggedPiece.style.position = "absolute";
			this.draggedPiece.style.zIndex = 1;
		}
	}

	mouseUp(event) {
		if (this.dragging) {
			event.preventDefault();
			this.dragging = false;
			this.lastMousePos = [];
			let newSquare = this.squareElements.get(document.elementsFromPoint(event.clientX, event.clientY).find(e => e.classList.contains("Square")));
			if (newSquare !== undefined && this.prevSquare !== newSquare) {
				let move = this.game.move({
					from: this.prevSquare.position,
					to: newSquare.position,
					promotion: "q"
				});
				if (move !== null) {
					this.game.undo();
					this.network.send({
						action: "move", args: {
							move,
							timers: {
								whiteTimer: this.whiteTimer.getTime(),
								blackTimer: this.blackTimer.getTime()
							}
						}
					});
				}
			}

			this.draggedPiece.style.top = null;
			this.draggedPiece.style.left = null;
			this.draggedPiece.style.position = null;
			this.draggedPiece.style.zIndex = 0;
			this.draggedPiece = null;
			this.prevSquare = null;
		}
	}

	mouseMove(event) {
		if (this.dragging) {
			event.preventDefault();
			let prevMousePos = [this.lastMousePos[0] - event.clientX, this.lastMousePos[1] - event.clientY];
			this.lastMousePos = [event.clientX, event.clientY];

			this.draggedPiece.style.top = `${this.draggedPiece.offsetTop - prevMousePos[1]}px`;
			this.draggedPiece.style.left = `${this.draggedPiece.offsetLeft - prevMousePos[0]}px`;
		}
	}

	init() {
		for (let i = 0; i < 64; i++) {
			let rank = 8 - Math.floor(i / 8);
			let fileNum = i % 8;
			let file = files[fileNum];
			let bg = rank % 2 === fileNum % 2 ? "light" : "dark";
			let square = new Square({
				rank,
				file,
				bg,
				flagCB: (inc) => {
					if (this.currFlags + inc < 0 || this.currFlags + inc > this.mineCount) {
						return false;
					} else {
						this.currFlags += inc;
						this.flagCounterCB(this.mineCount - this.currFlags);
						return true;
					}
				}
			});
			square.element.onmouseup = (event) => {
				if (!this.gameOver && square.clickedOn && this.color === this.game.turn() && square.msStatus == "raised" && square.element === document.elementsFromPoint(event.clientX, event.clientY).find(e => e.classList.contains("Square"))) {
					if (event.button === 0) {
						if (square.flag === null) {
							this.network.addOnMessage("sink", (data) => {
								if (data.success) {
									if (data.reveal) {
										for (let [k, v] of Object.entries(data.squares)) {
											this.squares[k].sink(v);
										}
									}
								}
								this.network.removeOnMessage("sink");
							});
							this.network.send({
								action: "sink",
								args: {
									position: square.position,
									timers: {
										whiteTimer: this.whiteTimer.getTime(),
										blackTimer: this.blackTimer.getTime()
									}
								}
							});
						}
					} else if (event.button === 2) {
						if (square.flag !== null) {
							if (square.flagCB(-1)) {
								square.element.removeChild(square.flag);
								square.flag = null;
							}
						} else {
							if (square.flagCB(1)) {
								square.flag = document.createElement("img");
								square.flag.setAttribute("src", "assets/minesweeper/flag.svg");
								square.displayChild(square.flag);
								square.element.appendChild(square.flag);
							}
						}
					}
				}
				square.clickedOn = false;
			};
			this.element.appendChild(square.element);
			square.fixSize();
			this.squareElements.set(square.element, square);
			this.squares[`${file}${rank}`] = square;
		}

		this.squareSize = Object.values(this.squares)[0].size;
		this.whiteTaken.setSize(this.squareSize);
		this.blackTaken.setSize(this.squareSize);
		this.setLabels();
	}

	skipTurn(extraInfo) {
		if (Object.keys(this.prevMove).length !== 0) {
			this.squares[this.prevMove.from].element.classList.remove("highlighted");
			this.squares[this.prevMove.to].element.classList.remove("highlighted");
			this.prevMove = {};
		}

		let moveColor = "White";
		let notMoveColor = "Black";
		if (this.game.turn() === "b") {
			moveColor = "Black";
			notMoveColor = "White";
		}

		if (this.game.in_check()) {
			this.status = `Game over, ${moveColor} blew up while in check!`;
			this.gameOver = true;
			this.swapTimer();
		} else {
			if (extraInfo.resetMS) {
				this.resetMS();
			}
			this.status = `${moveColor} blew up! ${notMoveColor} to move.`;
			this.swapTurn();
		}

		this.turnCounterCB(extraInfo.turnCount);
		this.statusCB(this.status);
	}

	swapTurn() {
		let tokens = this.game.fen().split(" ");
		tokens[1] = this.game.turn() === "b" ? "w" : "b";
		tokens[3] = "-";
		this.game.load(tokens.join(" "));
		this.swapTimer();
	}

	flag(color) {
		let moveColor = "White";
		if (color === "b") {
			moveColor = "Black";
		}
		this.status = `Game over, ${moveColor} flagged.`;
		this.gameOver = true;
		this.statusCB(this.status);
	}

	flipBoard() {
		for (let i = 1; i < this.element.childNodes.length; i++) {
			this.element.insertBefore(this.element.childNodes[i], this.element.firstChild);
		}
		this.perspective = this.perspective === "b" ? "w" : "b";
		this.setLabels();
	}

	setLabels() {
		if (this.perspective === "w") {
			for (const s of Object.values(this.squares)) {
				let labelRank = s.position.charAt(0) === "a";
				let labelFile = s.position.charAt(1) === "1";
				s.setLabels(labelRank, labelFile);
			}
		} else {
			for (const s of Object.values(this.squares)) {
				let labelRank = s.position.charAt(0) === "h";
				let labelFile = s.position.charAt(1) === "8";
				s.setLabels(labelRank, labelFile);
			}
		}
	}

	resetMS() {
		for (const s of Object.values(this.squares)) {
			s.resetMS();
		}

		this.currFlags = 0;
		this.flagCounterCB(this.mineCount);
	}

	swapTimer() {
		let firstMove = !(this.whiteTimer.isRunning() && this.blackTimer.isRunning());
		if (this.gameOver) {
			this.whiteTimer.stop(false);
			this.blackTimer.stop(false);
		} else if (this.game.turn() === "w") {
			this.blackTimer.stop(firstMove);
			this.whiteTimer.start();
		} else {
			this.whiteTimer.stop(firstMove);
			this.blackTimer.start();
		}
	}

	setTimers(timers) {
		this.whiteTimer.setTime(timers.whiteTimer);
		this.blackTimer.setTime(timers.blackTimer);
	}

	setBoard(fen, mineCount, prevMove, timeControls, gameOver, disconnect = "") {
		this.game.load(fen);
		this.mineCount = mineCount;
		this.gameOver = gameOver;

		this.whiteTimer.restart();
		this.blackTimer.restart();
		if (timeControls.length !== 0) {
			this.whiteTimer.setControls(timeControls);
			this.blackTimer.setControls(timeControls);
		}
		this.prevPositions = {};
		this.color = "";
		this.resetMS();
		this.pieceElements = new Map();

		this.whiteTaken.clear();
		this.blackTaken.clear();
		let pieces = {
			w: {
				p: 8,
				b: 2,
				n: 2,
				r: 2,
				q: 1,
				k: 1
			},
			b: {
				p: 8,
				b: 2,
				n: 2,
				r: 2,
				q: 1,
				k: 1
			}
		};
		this.game.board().reverse().forEach((rank, ri) => {
			rank.forEach((square, fi) => {
				if (square !== null) {
					pieces[square.color][square.type]--;
					let piece = new Piece({ color: square.color, type: square.type, size: this.squareSize });
					this.squares[`${files[fi]}${ri + 1}`].addPiece(piece.element);
					this.pieceElements.set(piece.element, piece);
				} else {
					this.squares[`${files[fi]}${ri + 1}`].removePiece();
				}
			});
		});
		for (const [k, v] of Object.entries(pieces.w)) {
			for (let i = v; v > 0; v--) {
				this.whiteTaken.add(k);
			}
		}
		for (const [k, v] of Object.entries(pieces.b)) {
			for (let i = v; v > 0; v--) {
				this.blackTaken.add(k);
			}
		}

		if (Object.keys(this.prevMove).length !== 0) {
			this.squares[this.prevMove.from].element.classList.remove("highlighted");
			this.squares[this.prevMove.to].element.classList.remove("highlighted");
			this.prevMove = {};
		}
		if (Object.keys(prevMove).length !== 0) {
			this.squares[prevMove.from].element.classList.add("highlighted");
			this.squares[prevMove.to].element.classList.add("highlighted");
			this.prevMove = prevMove;
		}

		if (disconnect) {
			this.status = `${disconnect} disconnected!`;
		} else if (gameOver) {
			this.status = "Game has not started yet.";
		} else {
			if (this.game.turn() === "w") {
				this.status = "White to move.";
			} else {
				this.status = "Black to move.";
			}
		}
		this.gameOver = gameOver;
		this.statusCB(this.status);
	}

	startGame() {
		this.gameOver = false;
		if (this.game.turn() === "w") {
			this.status = "White to move.";
		} else {
			this.status = "Black to move.";
		}
		this.statusCB(this.status);
	}

	move(move, extraInfo) {
		this.game.move(move);

		let prevSquare = this.squares[move.from];
		let newSquare = this.squares[move.to];
		let draggedPiece = prevSquare.piece
		if (Object.keys(this.prevMove).length !== 0) {
			this.squares[this.prevMove.from].element.classList.remove("highlighted");
			this.squares[this.prevMove.to].element.classList.remove("highlighted");
		}
		prevSquare.element.classList.add("highlighted");
		newSquare.element.classList.add("highlighted");
		this.prevMove = move;
		if (move.promotion === "q") { //promotion
			let piece = this.pieceElements.get(draggedPiece);
			piece.element.setAttribute("src", `assets/chess/${piece.color}q.png`);
		}
		if (move.flags.includes("k")) { //kingside castle
			let rank = move.color === "b" ? "8" : "1";
			let rook = this.squares[`h${rank}`].getPiece();
			this.squares[`h${rank}`].removePiece();
			if (!extraInfo.kcMine) {
				this.squares[`f${rank}`].addPiece(rook);
			} else {
				this.squares[`f${rank}`].sink("mine");
				if (move.color === "b") {
					this.whiteTaken.add("r");
				} else {
					this.blackTaken.add("r");
				}
			}
		}
		if (move.flags.includes("q")) { //queenside castle
			let rank = move.color === "b" ? "8" : "1";
			let rook = this.squares[`a${rank}`].getPiece();
			this.squares[`a${rank}`].removePiece();
			if (!extraInfo.qcMine) {
				this.squares[`d${rank}`].addPiece(rook);
			} else {
				this.squares[`d${rank}`].sink("mine");
				if (move.color === "b") {
					this.whiteTaken.add("r");
				} else {
					this.blackTaken.add("r");
				}
			}
		}
		if (move.flags.includes("e")) { //en passant
			let rank = parseInt(move.to.charAt(1)) + (move.color === "b" ? 1 : -1);
			let file = move.to.charAt(0);
			this.squares[`${file}${rank}`].removePiece();
			if (move.color === "w") {
				this.whiteTaken.add("p");
			} else {
				this.blackTaken.add("p");
			}
		}
		prevSquare.removePiece();
		if (extraInfo.mine) {
			this.game.remove(newSquare.position);
			let tokens = this.game.fen().split(" ");
			tokens[3] = "-";
			this.game.load(tokens.join(" "));
			if (newSquare.hasPiece()) {
				newSquare.removePiece();
				if (move.color === "w") {
					this.whiteTaken.add(this.pieceElements.get(newSquare.piece).type);
				} else {
					this.blackTaken.add(this.pieceElements.get(newSquare.piece).type);
				}
			}
			newSquare.sink("mine");
			if (move.piece === "k") {
				if (move.color === "b") {
					this.status = "Game over, Black's king blew up!";
				} else {
					this.status = "Game over, White's king blew up!";
				}
				this.gameOver = true;
			} else {
				this.swapTurn();
				if (this.game.in_check()) {
					if (move.color === "b") {
						this.status = "Game over, Black blew up a piece while in check!";
					} else {
						this.status = "Game over, White blew up a piece while in check!";
					}
					this.gameOver = true;
				} else {
					if (move.color === "b") {
						this.whiteTaken.add(this.pieceElements.get(draggedPiece).type);
					} else {
						this.blackTaken.add(this.pieceElements.get(draggedPiece).type);
					}
				}
				this.swapTurn();
			}
		} else {
			if (newSquare.hasPiece()) {
				if (move.color === "w") {
					this.whiteTaken.add(this.pieceElements.get(newSquare.piece).type);
				} else {
					this.blackTaken.add(this.pieceElements.get(newSquare.piece).type);
				}
			}
			newSquare.addPiece(draggedPiece);
		}
		if (extraInfo.resetMS) {
			this.resetMS();
		}

		let fen = this.game.fen().split(" ");
		fen.splice(fen.length - 1, 1);
		fen.splice(fen.length - 1, 1);
		fen = fen.join(" ");
		if (fen in this.prevPositions) {
			this.prevPositions[fen] += 1;
		} else {
			this.prevPositions[fen] = 1;
		}

		if (!this.gameOver) {
			let moveColor = "White";
			if (this.game.turn() === "b") {
				moveColor = "Black";
			}
			if (this.game.in_checkmate()) {
				this.status = `Game over, ${moveColor} is in checkmate.`;
				this.gameOver = true;
			} else if (this.game.insufficient_material()) {
				this.status = "Game over, insufficient material.";
				this.gameOver = true;
			} else if (this.game.in_stalemate()) {
				this.status = "Game over, stalemate position.";
				this.gameOver = true;
			} else {
				this.status = `${moveColor} to move.`;
				if (this.game.in_check()) {
					this.status += ` ${moveColor} is in check.`;
				}

				for (const v of Object.values(this.prevPositions)) {
					if (v >= 3) {
						this.status = "Game over, threefold repetition rule.";
						this.gameOver = true;
					}
				}
			}
		}

		this.swapTimer();
		this.turnCounterCB(extraInfo.turnCount);
		this.statusCB(this.status);
	}
}
