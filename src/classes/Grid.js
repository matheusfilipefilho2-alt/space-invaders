import Invader from "./invader.js";
import { INVADERS } from "../../utils/constantes.js";

class Grid {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;

    this.direction = "right";
    this.moveDown = false;

    this.invadersVelocity = 1.5;
    this.invaders = this.init();
  }

  init() {
    const array = [];
    const invadersPath = INVADERS[Math.floor(Math.random() * INVADERS.length)];

    for (let row = onabort; row < this.rows; row += 1) {
      for (let col = onabort; col < this.cols; col += 1) {
        const invader = new Invader(
          {
            x: col * 50 + 20,
            y: row * 37 + 120,
          },
          this.invadersVelocity,
          invadersPath
        );

        array.push(invader);
      }
    }

    return array;
  }

  draw(ctx) {
    this.invaders.forEach((invader) => invader.draw(ctx));
  }

  update(playerStatus) {
    if (this.reachedRightBoundary()) {
      this.direction = "left";
      this.moveDown = true;
    } else if (this.reachedleftBoundary()) {
      this.direction = "right";
      this.moveDown = true;
    }

    if (!playerStatus) this.moveDown = false;

    this.invaders.forEach((invader) => {
      if (this.moveDown) {
        invader.moveDown();
        invader.incrementVelocity(1);
        this.invadersVelocity = invader.velocity;
      }

      if (this.direction === "right") invader.moveRight();
      if (this.direction === "left") invader.moveLeft();
    });

    this.moveDown = false;
  }

  reachedRightBoundary() {
    return this.invaders.some(
      (invader) => invader.position.x + invader.width >= innerWidth
    );
  }

  reachedleftBoundary() {
    return this.invaders.some((invader) => invader.position.x <= 0);
  }

  getRandomInvader() {
    const index = Math.floor(Math.random() * this.invaders.length);
    return this.invaders[index];
  }

  restart() {
    this.invaders = this.init();
    this.direction = "right";
  }
}

export default Grid;
