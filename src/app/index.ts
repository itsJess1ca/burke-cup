import { Canvas } from './canvas';
import { World } from './world';

export class Main {
  canvas = new Canvas();
  world = new World();
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
    // Create Canvas
    this.canvas.create();

    // Add base images
    Object.keys(this.textures)
      .forEach(texture => this.canvas.addTexture(this.textures[texture]));

    // Init P2
    this.world.drawBounds();


    // Add Sprite Img

    // ???

    // Animte Scene
    this.canvas.animateScene();
  }
}
