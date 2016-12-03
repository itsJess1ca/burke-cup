import { randomRange, rotation } from './util';
export class Pixel {
  gemAnimationGameFrames: number = 0;

  constructor(
    private type: 'coin' | 'gem',
    private physical: any,
    private renderable: any,
    private animationFrames: any,
    private tier: any,
    private amount: any
  ){}

  impulse() {
    this.physical.velocity = rotation(randomRange(300, 600), randomRange(0, Math.PI / 2) + Math.PI / 4);
  }

  kill() {}
}
