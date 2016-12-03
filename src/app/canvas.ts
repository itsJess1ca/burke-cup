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
    const textures = {
      foreground: {
        url: './assets/foreground.png',
        width: 394,
        height: 417
      },
      background: {
        url: './assets/background.jpg',
        width: 394,
        height: 417
      }
    };
    const foregroundTexture = './assets/foreground.png';

    const topChest = Sprite.fromImage(textures.foreground.url);
    const bottomChest = Sprite.fromImage(textures.background.url);

    bottomChest.position.x = textures.background.width;
    bottomChest.position.y = textures.background.height;

    topChest.position.x = textures.foreground.width;
    topChest.position.y = textures.foreground.height;

    bottomChest.anchor.x = 0.5;
    bottomChest.anchor.y = 0.5;
    topChest.anchor.x = 0.5;
    topChest.anchor.y = 0.5;

    this.stage.addChild(bottomChest);
    this.stage.addChild(topChest);

    console.log(this.stage);


  }
}
