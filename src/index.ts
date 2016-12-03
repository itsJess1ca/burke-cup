import { Container, autoDetectRenderer } from 'pixi.js';

let stage, renderer;

const createContainer = () => {
  stage = new Container();
  renderer = autoDetectRenderer(256, 256);
  document.body.appendChild(renderer.view);
}

createContainer();