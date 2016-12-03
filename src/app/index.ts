import { Canvas } from './canvas';
export class Main {
  canvas = new Canvas();

  textures: any = {
    background: {
      url: './assets/background.jpg',
      width: 394,
      height: 417,
      x: 0.5,
      y: 0.5
    },
    foreground: {
      url: './assets/foreground.png',
      width: 394,
      height: 417,
      x: 0.5,
      y: 0.5
    }
  };

  constructor() {

    this.setupCanvas();
  }

  setupCanvas() {
    this.canvas.create();
    Object.keys(this.textures)
      .forEach(texture => this.canvas.addTexture(this.textures[texture]));

    this.canvas.animateScene();
  }
}
