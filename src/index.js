/* @flow */

import BSplineEditor from './components/BSplineEditor';
import React from 'react';
import ReactDOM from 'react-dom';
import { Vector } from './graphs/Vector';

const initialApplication = (
  <BSplineEditor curveDegree={2}
    controlPoints={[ Vector(0, 0), Vector(1, 0), Vector(1, 1), Vector(0, 0), Vector(1, 0) ]} />
);

const splineControllerDiv = (document.getElementById('spline-controller'): any);

ReactDOM.render(initialApplication, splineControllerDiv);
