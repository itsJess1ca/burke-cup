import { Container, autoDetectRenderer } from 'pixi.js';

export class Canvas {
  stage: any;
  renderer: any;
  constructor() {

  }
  create() {
    this.stage = new Container();
    this.renderer = autoDetectRenderer(256, 256);
    document.body.appendChild(this.renderer.view);
  }
}
