/* @flow */

import { Tracer } from './Tracer';

type TracerOperation = Tracer | Array<Tracer>;

/**
 * {@code TracerEmitter} is an abstraction that prevent
 * multiple tracing operations to exist concurrently in on
 * scope. If a relation is modified before it is traced,
 * it will cancel tracing of the obselete relation.
 *
 * It notifies the client when curve-tracing is completed,
 * and it also hides away tracing of obselete curves.
 */
export class TracerEmitter {
  /**
   * Callback to be invoked when a tracing operation is
   * complete.
   */
  client: (any) => void;

  /**
   * Currently ongoing tracing operation.
   */
  current: TracerOperation | void;

  /**
   * Unique id attached to the current operation.
   */
  runTag: number;

  constructor(client: (any) => void) {
    this.client = client;
    this.runTag = -1;
  }

  /**
   * Accepts an (not running) tracer/array-of-tracers and
   * runs them. It will prevent the previous operation from
   * calling the client.
   */
  run(operation: TracerOperation) {
    if (this.current) {
      if (this.current instanceof Tracer) {
        this.current.cancel();
      } else {
        this.current.forEach((tracer) => {
          tracer.cancel();
        });
      }
    }

    ++this.runTag;
    this.current = operation;

    let operationPromise: Promise<any>;/* eslint-disable-line init-declarations */
    if (operation instanceof Tracer) {
      operation.teRunTag = this.runTag;
      operationPromise = operation.run();
    } else {
      operationPromise = Promise.all(operation.map((tracer) => {
        tracer.teRunTag = this.runTag;
        return tracer.run();
      }));
    }

    operationPromise.then(this.client);
  }
}

export default TracerEmitter;
