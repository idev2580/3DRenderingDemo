import * as THREE from "three";
import {  SparkRenderer, SparkControls, SplatMesh, dyno } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {isDebug, gltfUrl, gltfSceneScale, splat1Url, splat1BackgroundOffset, splat2Url, splat2BackgroundOffset} from "config";
import { renderAxesOverlay } from "util";
import { loadSplat, loadGltfScene } from "loader";
import {splatEffectInitialize} from "effect";

const container = document.querySelector("#viewport");


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15171c);
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.2, 4);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const spark = new SparkRenderer({ renderer });
scene.add(spark);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.8, 0);

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x384050, 1.8);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(3, 4, 5);
scene.add(keyLight);

const textureScene = new THREE.Scene();
textureScene.background = new THREE.Color(0x263047);
const textureSpark = new SparkRenderer({ renderer });
textureScene.add(textureSpark);

const textureCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
textureCamera.position.set(0, 0, 0);
textureCamera.lookAt(0, 0, 1);

const renderTarget = new THREE.WebGLRenderTarget(512, 512);
const renderPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(0.1, 0.1),
  new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
    side: THREE.DoubleSide,
  })
);
const [texSplatRoot, texSplat] = loadSplat(splat2Url, true, splat2BackgroundOffset);
textureScene.add(texSplatRoot)
renderPlane.position.set(-0.055, -0.035, 0);
renderPlane.rotateY(3.141592653589793238 / 2.0)
renderPlane.rotateX(3.141592653589793238 / 16.0)
// renderPlane.rotateZ(3.141592653589793238 / 24.0)
scene.add(renderPlane);

const clock = new THREE.Clock();
const { loadedScene, mixer, modelRoot } = await loadGltfScene(gltfUrl, camera, controls, gltfSceneScale);
scene.add(modelRoot)

const bgSplatTimeOffset = -1.5924994035447764;
// const bgSplatTimeOffset = -1.5924994035447764;
const bgSplatAnimateT = dyno.dynoFloat(bgSplatTimeOffset);
const effectParams = {
  effect: "Disintegrate",
  intensity: 0.8,
  sceneScale: 0.1
};
const [bgRoot, bgSplat] = loadSplat(splat1Url, true, splat1BackgroundOffset);
scene.add(bgRoot)
bgRoot.rotateY(3.141592653589793238 / 3.0)
splatEffectInitialize(bgSplat, bgSplatAnimateT, effectParams)

await Promise.all([bgSplat.initialized, texSplat.initialized])
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // bgSplatAnimateT.value += 2 * delta;
  // bgSplat.updateVersion();

  if (mixer) {
    mixer.update(delta);
  }
  textureCamera.rotation.y += delta * 0.4;

  controls.update();

  renderer.setRenderTarget(renderTarget);
  renderer.render(textureScene, textureCamera);
  renderer.setRenderTarget(null);

  renderer.render(scene, camera);
  if(isDebug){
    renderAxesOverlay(renderer, camera, controls);
  }
});
