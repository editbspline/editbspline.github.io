import * as PIXI from 'pixi.js';

const BUILD_DIMEN = 28;
const CENTER_X = 14;
const CENTER_Y = 14;
const INNER_RADIUS = 10;
const OUTER_RADIUS = 13;

const ALPHA = 0.5;
const ALPHA_OUT = 0.9;
const KERNEL_COLOR = 0xfe59d0;
const BORDER_COLOR = 0xffffff;

export function ControlPointIndicator(x = 0, y = 0) {
  const gBuild = new PIXI.Graphics();
  gBuild.height = BUILD_DIMEN;
  gBuild.width = BUILD_DIMEN;
  gBuild.x = x - (BUILD_DIMEN / 2);
  gBuild.y = y - (BUILD_DIMEN / 2);
  gBuild.lineStyle(1);
  gBuild.beginFill(BORDER_COLOR, ALPHA_OUT)
    .drawCircle(CENTER_X, CENTER_Y, OUTER_RADIUS)
    .endFill()
    .closePath();
  gBuild.beginFill(KERNEL_COLOR, ALPHA)
    .drawCircle(CENTER_X, CENTER_Y, INNER_RADIUS)
    .endFill();
  gBuild.zIndex = 10;

  /* eslint-disable no-use-before-define */
  registerInteractiveEventHandlers(gBuild);
  return gBuild;
}

function registerInteractiveEventHandlers(gBuild) {
  gBuild.interactive = true;
  gBuild.on('mouseover', onmouseover);
  gBuild.on('mouseout', onmouseout);
}

/* eslint-disable babel/no-invalid-this */
function onmouseover() {
  const delta = BUILD_DIMEN / 2;
  this.width += delta;
  this.height += delta;
  this.x -= delta / 2;
  this.y -= delta / 2;
}

function onmouseout() {
  const delta = BUILD_DIMEN / 2;
  this.width -= delta;
  this.height -= delta;
  this.x += delta / 2;
  this.y += delta / 2;
}

export default {
  ControlPointIndicator,
};
