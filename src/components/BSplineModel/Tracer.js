import projectToCanvasPlane from './projectToCanvasPlane';
import round from 'lodash/round';

export class Tracer {
  constructor(minKnot, maxKnot, queryStep, spline) {
    this.minKnot = minKnot;
    this.maxKnot = maxKnot;
    this.queryStep = queryStep;
    this.spline = spline;
    this.param = minKnot;
    this.feederArray = [];
  }

  doTrace = (idleDeadline) => {
    while (this.param <= this.maxKnot && idleDeadline.timeRemaining() > 0) {
      this.feederArray.push(projectToCanvasPlane(
        this.param, this.spline.evaluate(this.param)
      ));

      this.param = round(this.param + this.queryStep, 4);
    }

    if (this.param >= this.maxKnot) {
      this.onFinish();
    } else {
      window.requestIdleCallback(this.doTrace);
    }
  }

  run() {
    return new Promise((resolve) => {
      this.onFinish = () => resolve(this.feederArray);
      window.requestIdleCallback(this.doTrace);
    });
  }
}

export default Tracer;
