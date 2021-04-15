export default class Taken {
	constructor({ id, color }) {
		this.element = document.getElementById(id);
		this.color = color;

		this.size = "";

		this.pieces = {
			p: document.createElement("div"),
			b: document.createElement("div"),
			n: document.createElement("div"),
			r: document.createElement("div"),
			q: document.createElement("div")
		}
		for (const e of Object.values(this.pieces)) {
			this.element.appendChild(e);
		}
	}

	setSize(size) {
		this.size = size * .5;
		this.element.style.height = `${this.size}px`;
	}

	add(piece) {
		let img = document.createElement("img");
		img.setAttribute("src", `assets/chess/${this.color}${piece}.png`);
		img.style.width = `${this.size}px`;
		img.style.height = `${this.size}px`;
		if (this.pieces[piece].children.length) {
			img.style.marginLeft = `${this.size * -.65}px`;
		}
		this.pieces[piece].appendChild(img);
	}

	clear() {
		for (const e of Object.values(this.pieces)) {
			e.innerHTML = "";
		}
	}
}