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
const defaultNubTransform = {
  position: new THREE.Vector3(-0.15, -0.1, -0.02),
  rotation: new THREE.Euler(0, THREE.MathUtils.degToRad(125), 0),
  scale: 0.0045,
};
const defaultDuckPlaneTransform = {
  position: new THREE.Vector3(2.1, 1.6, 1.9),
  rotation: new THREE.Euler(
    THREE.MathUtils.degToRad(94),
    THREE.MathUtils.degToRad(81),
    THREE.MathUtils.degToRad(-92)
  ),
  scale: 124,
};
const renderPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(0.1, 0.1),
  new THREE.MeshBasicMaterial({
    map: renderTarget.texture,
    side: THREE.DoubleSide,
  })
);
const [texSplatRoot, texSplat] = loadSplat(splat2Url, true, splat2BackgroundOffset);
textureScene.add(texSplatRoot);
renderPlane.position.copy(defaultDuckPlaneTransform.position);
renderPlane.rotation.copy(defaultDuckPlaneTransform.rotation);
renderPlane.scale.setScalar(defaultDuckPlaneTransform.scale);

const clock = new THREE.Clock();
const { loadedScene, modelRoot, mixer } = await loadGltfScene(gltfUrl, camera, controls, gltfSceneScale);
const followObject = loadedScene.getObjectByName("아마츄어");
const transitionObject = loadedScene.getObjectByName("아마츄어001");
const followTarget = new THREE.Vector3();
const previousFollowTarget = new THREE.Vector3();
const initialFollowCameraOffset = new THREE.Vector3(0.48, 0.1, 0.1);
const cameraApproachScale = 0.65;
const cameraApproachDuration = 0.8;
const cameraApproachYaw = THREE.MathUtils.degToRad(90);
const cameraApproachStartOffset = new THREE.Vector3();
const cameraApproachCurrentOffset = new THREE.Vector3();
let hasPreviousFollowTarget = false;
let hasCameraApproachStartOffset = false;

function setObjectOpacity(object, opacity) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];

    for (const material of materials) {
      material.transparent = opacity < 1;
      material.opacity = opacity;
      material.depthWrite = opacity >= 1;
      material.needsUpdate = true;
    }
  });
}

function cloneObjectMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    child.material = Array.isArray(child.material)
      ? child.material.map((material) => material.clone())
      : child.material.clone();
  });
}

if (!followObject) {
  console.warn("follow object not found: 아마츄어");
}

if (transitionObject) {
  cloneObjectMaterials(transitionObject);
  transitionObject.visible = true;
  setObjectOpacity(transitionObject, 0);
} else {
  console.warn("transition object not found: 아마츄어.001");
}

modelRoot.position.copy(defaultNubTransform.position);
modelRoot.rotation.copy(defaultNubTransform.rotation);
modelRoot.scale.setScalar(defaultNubTransform.scale);
modelRoot.add(renderPlane);
scene.add(modelRoot);

if (followObject) {
  modelRoot.updateMatrixWorld(true);
  followObject.getWorldPosition(followTarget);
  controls.target.copy(followTarget);
  camera.position.copy(followTarget).add(initialFollowCameraOffset);
  previousFollowTarget.copy(followTarget);
  hasPreviousFollowTarget = true;
  controls.update();
}

function formatControlValue(value) {
  return value.toFixed(2);
}

function createInputRow({ label, min, max, step, initialValue, onInput }) {
  const row = document.createElement("label");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "48px minmax(0, 1fr) 64px";
  row.style.alignItems = "center";
  row.style.gap = "10px";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  labelEl.style.fontSize = "12px";
  labelEl.style.color = "rgba(245, 247, 251, 0.88)";

  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(initialValue);
  input.style.width = "100%";
  input.style.padding = "8px 10px";
  input.style.border = "1px solid rgba(255, 255, 255, 0.16)";
  input.style.borderRadius = "8px";
  input.style.background = "rgba(255, 255, 255, 0.06)";
  input.style.color = "#f5f7fb";

  const valueEl = document.createElement("output");
  valueEl.textContent = formatControlValue(initialValue);
  valueEl.style.fontVariantNumeric = "tabular-nums";
  valueEl.style.fontSize = "12px";
  valueEl.style.textAlign = "right";
  valueEl.style.color = "#f5f7fb";

  input.addEventListener("input", () => {
    const nextValue = Number(input.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    valueEl.textContent = formatControlValue(nextValue);
    onInput(nextValue);
  });

  row.append(labelEl, input, valueEl);
  return row;
}

function getTransformValues(target) {
  return [
    target.position.x,
    target.position.y,
    target.position.z,
    THREE.MathUtils.radToDeg(target.rotation.x),
    THREE.MathUtils.radToDeg(target.rotation.y),
    THREE.MathUtils.radToDeg(target.rotation.z),
    target.scale.x,
  ];
}

function createTransformSection({ title, description, target, ranges }) {
  const section = document.createElement("section");
  section.style.display = "grid";
  section.style.gap = "10px";
  section.style.padding = "12px";
  section.style.border = "1px solid rgba(255, 255, 255, 0.08)";
  section.style.borderRadius = "12px";
  section.style.background = "rgba(255, 255, 255, 0.03)";

  const titleEl = document.createElement("div");
  titleEl.textContent = title;
  titleEl.style.fontSize = "13px";
  titleEl.style.fontWeight = "600";
  titleEl.style.letterSpacing = "0.02em";
  titleEl.style.color = "#ffffff";

  const descriptionEl = document.createElement("div");
  descriptionEl.textContent = description;
  descriptionEl.style.fontSize = "12px";
  descriptionEl.style.lineHeight = "1.5";
  descriptionEl.style.color = "rgba(245, 247, 251, 0.72)";

  const initialPosition = target.position.clone();
  const initialRotation = target.rotation.clone();
  const initialScale = target.scale.x;

  const rows = [
    createInputRow({
      label: "Pos X",
      min: ranges.position[0],
      max: ranges.position[1],
      step: 0.01,
      initialValue: target.position.x,
      onInput: (value) => {
        target.position.x = value;
      },
    }),
    createInputRow({
      label: "Pos Y",
      min: ranges.position[0],
      max: ranges.position[1],
      step: 0.01,
      initialValue: target.position.y,
      onInput: (value) => {
        target.position.y = value;
      },
    }),
    createInputRow({
      label: "Pos Z",
      min: ranges.position[0],
      max: ranges.position[1],
      step: 0.01,
      initialValue: target.position.z,
      onInput: (value) => {
        target.position.z = value;
      },
    }),
    createInputRow({
      label: "Rot X",
      min: -180,
      max: 180,
      step: 1,
      initialValue: THREE.MathUtils.radToDeg(target.rotation.x),
      onInput: (value) => {
        target.rotation.x = THREE.MathUtils.degToRad(value);
      },
    }),
    createInputRow({
      label: "Rot Y",
      min: -180,
      max: 180,
      step: 1,
      initialValue: THREE.MathUtils.radToDeg(target.rotation.y),
      onInput: (value) => {
        target.rotation.y = THREE.MathUtils.degToRad(value);
      },
    }),
    createInputRow({
      label: "Rot Z",
      min: -180,
      max: 180,
      step: 1,
      initialValue: THREE.MathUtils.radToDeg(target.rotation.z),
      onInput: (value) => {
        target.rotation.z = THREE.MathUtils.degToRad(value);
      },
    }),
    createInputRow({
      label: "Scale",
      min: ranges.scale[0],
      max: ranges.scale[1],
      step: 0.01,
      initialValue: target.scale.x,
      onInput: (value) => {
        target.scale.setScalar(value);
      },
    }),
  ];

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset";
  resetButton.style.marginTop = "4px";
  resetButton.style.padding = "10px 12px";
  resetButton.style.border = "none";
  resetButton.style.borderRadius = "10px";
  resetButton.style.background = "#f5f7fb";
  resetButton.style.color = "#15171c";
  resetButton.style.fontSize = "12px";
  resetButton.style.fontWeight = "600";
  resetButton.style.cursor = "pointer";
  resetButton.addEventListener("click", () => {
    target.position.copy(initialPosition);
    target.rotation.copy(initialRotation);
    target.scale.setScalar(initialScale);

    const inputs = section.querySelectorAll("input[type='number']");
    const values = getTransformValues(target);

    inputs.forEach((input, index) => {
      input.value = String(values[index]);
      const output = input.parentElement?.querySelector("output");
      if (output) {
        output.textContent = formatControlValue(values[index]);
      }
    });
  });

  section.append(titleEl, descriptionEl, ...rows, resetButton);
  return section;
}

function createModelControlPanel(modelTarget, planeTarget) {
  const panel = document.createElement("aside");
  panel.setAttribute("aria-label", "Model transform controls");
  panel.style.position = "fixed";
  panel.style.top = "16px";
  panel.style.left = "16px";
  panel.style.zIndex = "20";
  panel.style.width = "min(360px, calc(100vw - 32px))";
  panel.style.maxHeight = "calc(100vh - 32px)";
  panel.style.overflow = "auto";
  panel.style.padding = "14px";
  panel.style.border = "1px solid rgba(255, 255, 255, 0.14)";
  panel.style.borderRadius = "14px";
  panel.style.background = "rgba(10, 12, 18, 0.82)";
  panel.style.backdropFilter = "blur(16px)";
  panel.style.boxShadow = "0 18px 40px rgba(0, 0, 0, 0.28)";
  panel.style.display = "grid";
  panel.style.gap = "12px";

  const heading = document.createElement("div");
  heading.textContent = "Transform Controls";
  heading.style.fontSize = "14px";
  heading.style.fontWeight = "600";
  heading.style.letterSpacing = "0.02em";
  heading.style.color = "#ffffff";

  const modelSection = createTransformSection({
    title: "Nub Root",
    description: "nub 모델 전체 transform입니다.",
    target: modelTarget,
    ranges: {
      position: [-5, 5],
      scale: [0.05, 3],
    },
  });

  const planeSection = createTransformSection({
    title: "Duck Plane",
    description: "nub의 자식으로 들어간 평면의 로컬 transform입니다.",
    target: planeTarget,
    ranges: {
      position: [-1, 1],
      scale: [0.01, 2],
    },
  });

  panel.append(heading, modelSection, planeSection);
  document.body.appendChild(panel);
}

if (isDebug) {
  createModelControlPanel(modelRoot, renderPlane);
}

const bgSplatTimeOffset = -1.5924994035447764;
// const bgSplatTimeOffset = -1.5924994035447764;
const bgSplatAnimateT = dyno.dynoFloat(bgSplatTimeOffset);
const bgSplatAlpha = dyno.dynoFloat(1);
const bg2SplatAlpha = dyno.dynoFloat(0);
const texSplatAlpha = dyno.dynoFloat(1);
const effectParams = {
  effect: "Disintegrate",
  intensity: 0.8,
  sceneScale: 0.1
};
const bgEffectParams = { ...effectParams, alpha: bgSplatAlpha };
const bg2EffectParams = { ...effectParams, alpha: bg2SplatAlpha };
const texEffectParams = { ...effectParams, alpha: texSplatAlpha };
const [bgRoot, bgSplat] = loadSplat(splat1Url, true, splat1BackgroundOffset);
const [bg2Root, bg2Splat] = loadSplat(splat2Url, true, splat1BackgroundOffset);
scene.add(bgRoot);
scene.add(bg2Root)
bgRoot.rotateY(3.141592653589793238 / 3.0);
splatEffectInitialize(bgSplat, bgSplatAnimateT, bgEffectParams);
splatEffectInitialize(bg2Splat, bgSplatAnimateT, bg2EffectParams);
splatEffectInitialize(texSplat, bgSplatAnimateT, texEffectParams);

await Promise.all([bgSplat.initialized, texSplat.initialized]);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

bg2Root.position.y = -0.07
bg2Root.position.z = -0.2
bg2Root.position.x = -0.2
bg2Root.rotateY(1.8 * 3.141592653589793238)
const thresholdTime = 2
const switchAnimationHalfLength = 1.6
const switchAnimationLength = 2 * switchAnimationHalfLength
const splatFadeStartTime = thresholdTime + switchAnimationHalfLength / 2
const splatFadeEndTime = splatFadeStartTime + switchAnimationHalfLength
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  // console.log(`ElapsedTime = ${clock.elapsedTime}`)
  if(clock.elapsedTime > thresholdTime && clock.elapsedTime < thresholdTime + switchAnimationLength){
    bgSplatAnimateT.value += 2 * delta;
    bgSplat.updateVersion();
    bg2Splat.updateVersion();
    texSplat.updateVersion();
  }
  if (clock.elapsedTime >= splatFadeStartTime) {
    const fadeAlpha = THREE.MathUtils.smoothstep(
      clock.elapsedTime,
      splatFadeStartTime,
      splatFadeEndTime
    );

    bgSplatAlpha.value = 1 - fadeAlpha;
    bg2SplatAlpha.value = fadeAlpha;
    if (transitionObject) {
      setObjectOpacity(transitionObject, fadeAlpha);
    }
    bgSplat.updateVersion();
    bg2Splat.updateVersion();
  }

  if (mixer) {
    mixer.update(delta);
  }
  textureCamera.rotation.y += delta * 0.4;

  if (followObject) {
    followObject.getWorldPosition(followTarget);

    if (!hasPreviousFollowTarget) {
      previousFollowTarget.copy(followTarget);
      hasPreviousFollowTarget = true;
    }

    const followDelta = followTarget.clone().sub(previousFollowTarget);

    controls.target.add(followDelta);
    camera.position.add(followDelta);

    if (clock.elapsedTime >= thresholdTime) {
      if (!hasCameraApproachStartOffset) {
        cameraApproachStartOffset.copy(camera.position).sub(controls.target);
        hasCameraApproachStartOffset = true;
      }

      const approachAlpha = THREE.MathUtils.smoothstep(
        clock.elapsedTime,
        thresholdTime,
        thresholdTime + cameraApproachDuration
      );
      const currentScale = THREE.MathUtils.lerp(1, cameraApproachScale, approachAlpha);
      const currentYaw = cameraApproachYaw * approachAlpha;

      cameraApproachCurrentOffset
        .copy(cameraApproachStartOffset)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), currentYaw)
        .multiplyScalar(currentScale);
      camera.position.copy(controls.target).add(cameraApproachCurrentOffset);
    }

    previousFollowTarget.copy(followTarget);
  }

  controls.update();

  renderer.setRenderTarget(renderTarget);
  renderer.render(textureScene, textureCamera);
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  if (isDebug) {
    renderAxesOverlay(renderer, camera, controls);
  }
});
window.bg2Root = bg2Root
