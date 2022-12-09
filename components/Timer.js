export default class Timer {
	constructor({ id, flagCB }) {
		this.element = document.getElementById(id);
		this.duration = 0;
		this.increment = 0;
		this.flagCB = flagCB;

		this.element.classList.add("Timer");
		this.element.textContent = this.parse(0);
		this.currTime = 0;
		this.startTime = null;

		this.running = false;
		this.timeout = null;
	}

	start() {
		if (!this.running && this.currTime > 0) {
			this.startTime = Date.now();
			this.running = true;
			this.tick();
		}
	}

	stop(inc = true) {
		if (this.running) {
			this.running = false;
			this.currTime = this.currTime - ((Date.now() - this.startTime) / 1000);
			if (inc) {
				this.currTime += this.increment;
			}
			this.element.textContent = this.parse(this.currTime);
			clearTimeout(this.timeout);
		}
	}

	tick() {
		let diff = this.currTime - ((Date.now() - this.startTime) / 1000);

		if (diff > 0) {
			this.timeout = setTimeout(() => this.tick(), 1);
		} else {
			diff = 0;
			this.running = false;
			this.flagCB();
		}

		this.element.textContent = this.parse(diff);
	}

	restart() {
		this.running = false;
		this.currTime = this.duration;
		this.element.textContent = this.parse(this.currTime);
		clearTimeout(this.timeout);
	}

	setControls(tc) {
		this.duration = tc[0];
		this.increment = tc[1];
		this.element.textContent = this.parse(this.duration);
		this.currTime = this.duration;
	}

	getTime() {
		return this.currTime;
	}

	setTime(time) {
		this.currTime = time;
	}

	isRunning() {
		return this.running;
	}

	parse(seconds) {
		let min = (seconds / 60) | 0;
		let sec = (seconds % 60) | 0;
		let cent = Math.floor(seconds * 100) % 100;
		if (min > 0) {
			return `${min < 10 ? "0" + min : min}:${sec < 10 ? "0" + sec : sec}`;
		} else {
			return `${sec < 10 ? "0" + sec : sec}.${cent === 0 ? "00" : cent < 10 ? "0" + cent : cent}`; //probably a better way to do this
		}
	}
}




