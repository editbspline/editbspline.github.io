/* @flow */

import BSplineEditor from './components/BSplineEditor';
import React from 'react';
import ReactDOM from 'react-dom';
import { Vector } from './algebra/Vector';

const initialApplication = (
  <BSplineEditor curveDegree={2}
    controlPoints={[2, 1, 1, 3, 2, 2, 4, 3, 3, 5, 4, 4]} />
);

const splineControllerDiv = (document.getElementById('spline-controller'): any);

ReactDOM.render(initialApplication, splineControllerDiv);
