
import { Canvas } from './canvas';
export class Main {
  canvas = new Canvas();

  textures: any = {
    foreground: {
      url: './assets/foreground.png',
      width: 394,
      height: 417,
      x: 0.5,
      y: 0.5
    },
    background: {
      url: './assets/background.jpg',
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
    this.canvas.addImage();

    this.canvas.animateScene();
  }
}
