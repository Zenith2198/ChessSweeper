export default class Network {
	constructor(onOpen, onClose) {
		this.onOpen = onOpen;
		this.onClose = onClose;
		this.ws = null;
		// this.reconnect = true;
		// this.retry = 2000;
		this.onMessage = {};
	}

	connect(ip, port) {
		// this.reconnect = true;
		this.ws = new WebSocket(`ws://${ip}:${port}`);

		this.ws.onopen = () => {
			// this.retry = 2000;
			console.log("Aaaaaaaaaaaaaaaaannnddddddddddd... OPEN!");
			this.onOpen();
		};

		this.ws.onclose = () => {
			// 	console.log("Connection closed")
			// 	if (this.reconnect) {
			// 		console.log("Retrying connection in", this.retry / 1000, "seconds...");
			// 		window.setTimeout(() => {
			// 			this.retry = Math.min(this.retry * 2, 30000);
			// 			this.connect(ip, port);
			// 		}, this.retry);
			// 	}
			this.onClose();
		};

		this.ws.onmessage = (event) => {
			let data = JSON.parse(event.data);
			if (data.action in this.onMessage) {
				if ("args" in data) {
					// if ("error" in data.args) {
					// 	console.log(data.args.error);
					// 	console.log(data);
					// } else {
					this.onMessage[data.action](data.args);
					// }
				} else {
					this.onMessage[data.action]();
				}
			} else {
				console.log(`NO HANDLER: ${JSON.stringify(data)}`);
			}
		};
	}

	disconnect() {
		// this.reconnect = false;
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	addOnMessage(action, fun) {
		this.onMessage[action] = fun;
	}

	removeOnMessage(action) {
		delete this.onMessage[action];
	}

	send(message, numTries = 10) {
		if (!numTries) {
			console.log("Network timed out!");
			return false;
		} else if (this.ws.readyState === 0) {
			setTimeout(() => {
				this.send(message, numTries - 1);
			}, 1000);
		} else if (this.ws.readyState === 1) {
			let success = this.ws.send(JSON.stringify(message));
			return success && true;
		} else if (this.ws.readyState === 2 || this.ws.readyState === 3) {
			console.log("Network failed!");
			return false;
		} else {
			console.log("Unknown network error occurred.");
			return false;
		}
	}
}