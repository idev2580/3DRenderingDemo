import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {isDebug, gltfUrl, gltfSceneScale, splatUrl, splatBackgroundOffset} from "config";
import { renderAxesOverlay } from "util";
import { loadSplat, loadGltfScene } from "loader";

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

const clock = new THREE.Clock();
const { loadedScene, mixer } = await loadGltfScene(gltfUrl, scene, camera, controls, gltfSceneScale);
loadSplat(splatUrl, scene, true, splatBackgroundOffset);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  controls.update();
  renderer.render(scene, camera);
  if(isDebug){
    renderAxesOverlay(renderer, camera, controls);
  }
});
