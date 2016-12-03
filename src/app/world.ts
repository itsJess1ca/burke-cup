import { World as P2World, Body, Box, Material } from 'p2';

export class World {
  world: any = new P2World({
      gravity: [0, -98.20]
    });

  bottom: any;
  left: any;
  right: any;
  boundMaterial: any = new Material(0);

  constructor () {}

  drawBounds () {
    this.bottom = new Body({
      position: [
        10,
        10
      ]
    });

    this.bottom.addShape( new Box({
      width: 394,
      height: 40
    }));

    this.world.addBody(this.bottom);
  }

}