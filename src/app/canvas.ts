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

  addTexture(texture: any) {
    const t = Sprite.fromImage(texture.url);

    t.height = texture.height;
    t.width = texture.width;
    t.position.x = texture.x;
    t.position.y = texture.y;

    this.stage.addChild(t);
  }


}
