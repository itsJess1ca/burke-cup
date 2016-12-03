import { Container, autoDetectRenderer, Texture, Sprite } from 'pixi.js';

export class Canvas {
  stage: any;
  renderer: any;
  constructor() {

  }
  create() {
    this.stage = new Container();
    this.renderer = autoDetectRenderer(1000, 1000, {backgroundColor : 0x1099bb});
    document.body.appendChild(this.renderer.view);
  }

  animateScene() {
    requestAnimationFrame(() => this.animateScene());
    this.renderer.render(this.stage);
  }

  addImage() {
    const backgroundTexture = './assets/background.jpg';
    const foregroundTexture = './assets/foreground.png';

    const topChest = Sprite.fromImage(backgroundTexture);
    const bottomChest = Sprite.fromImage(foregroundTexture);

    bottomChest.anchor.x = 0.5;
    bottomChest.anchor.y = 0.5;

    bottomChest.position.x = 394;
    bottomChest.position.y = 417;
    bottomChest.height = 417;
    bottomChest.width = 394;

    topChest.anchor.x = 0.5;
    topChest.anchor.y = 0.5;

    topChest.position.x = 394;
    topChest.position.y = 417;
    topChest.height = 417;
    bottomChest.width = 394;

    this.stage.addChild(bottomChest);
    this.stage.addChild(topChest);

    console.log(this.stage);
    

  }  
}
