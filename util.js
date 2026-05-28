import * as THREE from "three";

const axesScene = new THREE.Scene();
const axesCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
const axesHelper = new THREE.AxesHelper(0.8);

axesScene.add(axesHelper);
axesScene.add(createAxisLabel("X", "#ff4a4a", 0.95, 0, 0));
axesScene.add(createAxisLabel("Y", "#4aff6a", 0, 0.95, 0));
axesScene.add(createAxisLabel("Z", "#5d8cff", 0, 0, 0.95));

function createAxisLabel(text, color, x, y, z) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 64;
  canvas.height = 64;
  context.font = "bold 42px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.fillText(text, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);

  sprite.position.set(x, y, z);
  sprite.scale.setScalar(0.28);

  return sprite;
}

function renderAxesOverlay(renderer, camera, controls) {
  const size = 96;
  const margin = 16;
  const x = window.innerWidth - size - margin;
  const y = window.innerHeight - size - margin;

  axesCamera.position
    .copy(camera.position)
    .sub(controls.target)
    .normalize()
    .multiplyScalar(3);
  axesCamera.lookAt(axesScene.position);

  renderer.clearDepth();
  renderer.setScissorTest(true);
  renderer.setViewport(x, y, size, size);
  renderer.setScissor(x, y, size, size);
  renderer.render(axesScene, axesCamera);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
}


export {
    renderAxesOverlay
}