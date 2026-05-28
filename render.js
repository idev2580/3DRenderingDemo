import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import {isDebug, gltfUrl, gltfSceneScale, splatUrl, splatBackgroundOffset, splatSwapYZMatrix} from "config";
import { renderAxesOverlay } from "util";
import { loadSplat } from "loader";

const container = document.querySelector("#viewport");
const status = document.querySelector("#status");

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

const loader = new GLTFLoader();
let loadedScene = null;
let mixer = null;
const clock = new THREE.Clock();

function frameObject(object, clippingRadiusScale = 1) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const radius = Math.max(sphere.radius, 0.1);
  const clippingRadius = Math.max(radius * clippingRadiusScale, 0.1);
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const fitFov = Math.min(verticalFov, horizontalFov);
  const distance = (radius / Math.sin(fitFov / 2)) * 1.25;
  const viewDirection = new THREE.Vector3(1, 0.55, 1).normalize();

  camera.position.copy(center).addScaledVector(viewDirection, distance);
  camera.near = Math.max(distance - clippingRadius * 4, 0.01);
  camera.far = distance + clippingRadius * 4;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

loadSplat(splatUrl, scene, true, splatBackgroundOffset);

loader.load(
  gltfUrl,
  (gltf) => {
    loadedScene = gltf.scene;

    loadedScene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.computeVertexNormals();
      object.castShadow = true;
      object.receiveShadow = true;
    });

    const box = new THREE.Box3().setFromObject(loadedScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const largestAxis = Math.max(size.x, size.y, size.z);
    const scale = (largestAxis > 0 ? 2 / largestAxis : 1) * gltfSceneScale;
    const modelRoot = new THREE.Group();

    modelRoot.scale.setScalar(scale);
    modelRoot.position.copy(center).multiplyScalar(-scale);
    modelRoot.add(loadedScene);
    scene.add(modelRoot);

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(loadedScene);

      for (const clip of gltf.animations) {
        mixer.clipAction(clip).play();
      }
    }

    frameObject(modelRoot, 1 / gltfSceneScale);
    status.textContent =
      gltf.animations.length > 0
        ? `GLTF 장면 로드 완료, 애니메이션 ${gltf.animations.length}개 재생 중`
        : "GLTF 장면 로드 완료";
  },
  (event) => {
    if (!event.total) return;
    const percent = Math.round((event.loaded / event.total) * 100);
    status.textContent = `GLTF 장면 로딩 중... ${percent}%`;
  },
  (error) => {
    console.error(error);
    status.textContent = "GLTF 장면을 로드하지 못했습니다. 경로와 서버 실행 여부를 확인하세요.";
  }
);

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
