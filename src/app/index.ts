
import { Canvas } from './canvas';
export class Main {
  canvas = new Canvas();
  constructor() {
    this.canvas.create();
    this.canvas.addImage();

    this.canvas.animateScene();
  }
}
