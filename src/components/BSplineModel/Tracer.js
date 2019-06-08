/* @flow */

import { Evaluable } from '../../algebra/Evaluable';
import projectToCanvasPlane from './projectToCanvasPlane';
import round from 'lodash/round';
import { type StrictTupleVector } from '../../algebra/Vector';

const PREC = 4;

/**
 * {@code Tracer} can asynchronously trace an mathematical
 * relation that maps numbers to vectors/numbers and project
 * it on a 2D map. It can draw a n-dimensional curve.
 */
export class Tracer {
  /**
   * Lower boundary of range in which the relation
   * is evaluated.
   */
  minKnot: number;

  /**
   * Upper boundary of range in which the relation
   * is evaluated.
   */
  maxKnot: number;

  /**
   * Spacing at which subsequent evaluations are done.
   */
  queryStep: number;

  /**
   * Vectorial dimensions of evaluations.
   */
  enforcedDimensions: number;

  /**
   * Relation that is being resolved (typically a spline).
   */
  spline: Evaluable;

  /**
   * This function is called regularly with the fractional
   * progress made.
   */
  onUpdateProgress: void | (number) => void;

  /**
   * Value till which this tracer has evaluated the
   * relation.
   */
  #param: number;

  /**
   * Array of evaluations projected to the a 2D plane.
   */
  feederArray: Array<StrictTupleVector>;

  /**
   * Current {@code requestIdleCallback} handle used by
   * this tracer.
   */
  #ricHandle: any;

  /**
   * Internally used to resolve {@code run}'s promise.
   */
  onFinish: void | () => void;

  /**
   * Run tag used (internally) by {@code TracerEmitter}.
   */
  teRunTag: number | void;

  constructor(minKnot: number, maxKnot: number,/* eslint-disable-line */
    queryStep: number, enforcedDimensions: number,
    spline: Evaluable, onUpdateProgress?: (number) => void
  ) {
    this.minKnot = minKnot;
    this.maxKnot = maxKnot;
    this.queryStep = queryStep;
    this.enforcedDimensions = enforcedDimensions;
    this.spline = spline;
    this.onUpdateProgress = onUpdateProgress;

    this.#param = minKnot;
    this.feederArray = [];
  }

  /**
   * Recursive (using requestIdleCallback) function do trace
   * {@code this.spline}.
   */
  doTrace = (idleDeadline: any) => {
    while (this.#param <= this.maxKnot && idleDeadline.timeRemaining() > 0) {
      this.feederArray.push(projectToCanvasPlane(
        this.#param, this.enforcedDimensions, this.spline.evaluate(this.#param)
      ));

      this.#param = round(this.#param + this.queryStep, PREC);
    }

    if (this.#param >= this.maxKnot) {
      (this.onFinish: any)();
    } else {
      if (this.onUpdateProgress) {
        this.onUpdateProgress((this.#param - this.minKnot) /
          (this.maxKnot - this.minKnot));
      }

      this.#ricHandle = window.requestIdleCallback(this.doTrace);
    }
  }

  /**
   * Runs this {@code Tracer}. It should be called only
   * once to prevent corruption/leaks.
   */
  run() {
    return new Promise<Array<StrictTupleVector>>((resolve) => {
      this.onFinish = () => resolve(this.feederArray);
      this.#ricHandle = window.requestIdleCallback(this.doTrace);
    });
  }

  /**
   * Cancels this tracer.
   */
  cancel() {
    window.cancelIdleCallback(this.#ricHandle);
  }
}

export default Tracer;
