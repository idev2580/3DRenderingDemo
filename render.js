import * as THREE from "three";
import { SparkRenderer, dyno } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  isDebug,
  gltfUrl,
  gltfSceneScale,
  splat1Url,
  splat1BackgroundOffset,
  splat2Url,
  splat2BackgroundOffset,
} from "config";
import { renderAxesOverlay } from "util";
import { loadSplat, loadGltfScene } from "loader";
import { splatEffectInitialize } from "effect";

const container = document.querySelector("#viewport");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15171c);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
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

const defaultDuckPlaneVertices = [
  new THREE.Vector3(-0.045, 0.047, 0.011),
  new THREE.Vector3(0.05, 0.044, 0.005),
  new THREE.Vector3(-0.0417, -0.05, 0.006),
  new THREE.Vector3(0.055, -0.046, 0.005),
];
const defaultCameraTrajectory = [
  {
    frame: 0,
    camera: {
      pos_x: 0.633671575902512,
      pos_y: 0.25515659509114985,
      pos_z: 0.2157952701420278,
      target_x: 1.8318679906315083e-15,
      target_y: 3.0531133177191805e-15,
      target_z: 3.4416913763379857e-15
    },
  },
  {
    frame: 67,
    camera: {
      pos_x: -0.15,
      pos_y: -0.09,
      pos_z: -0.01,
      target_x: -0.1500177247485086,
      target_y: -0.09001069149089413,
      target_z: -0.010046544163307547,
    },
  },
  {
    frame: 104,
    camera: {
      pos_x: -0.3347315616617145,
      pos_y: -0.0251050291783802,
      pos_z: -0.6688375205083892,
      target_x: -0.23404161963214468,
      target_y: -0.10472954833816957,
      target_z: 0.031195333721293874,
    },
  },
];

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

function styleElement(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setPlaneVertices(mesh, vertices) {
  const positions = mesh.geometry.getAttribute("position");
  vertices.forEach((vertex, index) => {
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  });
  positions.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
}

function formatControlValue(value) {
  return value.toFixed(2);
}

function createManagedInputRow({ label, min, max, step, initialValue, onInput }) {
  const row = document.createElement("label");
  styleElement(row, {
    display: "grid",
    gridTemplateColumns: "48px minmax(0, 1fr) 64px",
    alignItems: "center",
    gap: "10px",
  });

  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  styleElement(labelEl, {
    fontSize: "12px",
    color: "rgba(245, 247, 251, 0.88)",
  });

  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(initialValue);
  styleElement(input, {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#f5f7fb",
  });

  const valueEl = document.createElement("output");
  valueEl.textContent = formatControlValue(initialValue);
  styleElement(valueEl, {
    fontVariantNumeric: "tabular-nums",
    fontSize: "12px",
    textAlign: "right",
    color: "#f5f7fb",
  });

  input.addEventListener("input", () => {
    const nextValue = Number(input.value);
    if (Number.isNaN(nextValue)) {
      return;
    }
    valueEl.textContent = formatControlValue(nextValue);
    onInput(nextValue);
  });

  row.append(labelEl, input, valueEl);
  return {
    row,
    input,
    output: valueEl,
    setValue(value) {
      input.value = String(value);
      valueEl.textContent = formatControlValue(value);
    },
  };
}

function createButton(label, variant = "secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  styleElement(button, {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    background: variant === "primary" ? "#f6d56b" : "rgba(255, 255, 255, 0.07)",
    color: variant === "primary" ? "#17181d" : "#f5f7fb",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.18s ease, color 0.18s ease, opacity 0.18s ease",
  });
  return button;
}

function setButtonDisabled(button, disabled) {
  button.disabled = disabled;
  button.style.opacity = disabled ? "0.45" : "1";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
}

function setToggleButtonState(button, isActive) {
  button.style.background = isActive ? "#f6d56b" : "rgba(255, 255, 255, 0.07)";
  button.style.color = isActive ? "#17181d" : "#f5f7fb";
}

function createInputRow({ label, min, max, step, initialValue, onInput }) {
  return createManagedInputRow({ label, min, max, step, initialValue, onInput }).row;
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
  styleElement(section, {
    display: "grid",
    gap: "10px",
    padding: "12px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.03)",
  });

  const titleEl = document.createElement("div");
  titleEl.textContent = title;
  styleElement(titleEl, {
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.02em",
    color: "#ffffff",
  });

  const descriptionEl = document.createElement("div");
  descriptionEl.textContent = description;
  styleElement(descriptionEl, {
    fontSize: "12px",
    lineHeight: "1.5",
    color: "rgba(245, 247, 251, 0.72)",
  });

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

  const resetButton = createButton("Reset", "secondary");
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

function getCameraTransformValues(targetCamera, targetControls) {
  return {
    position: targetCamera.position.clone(),
    target: targetControls.target.clone(),
  };
}

function applyCameraTransformValues(targetCamera, targetControls, values) {
  targetCamera.position.copy(values.position);
  targetCamera.up.set(0, 1, 0);
  targetControls.target.copy(values.target);
  targetCamera.lookAt(targetControls.target);
  targetCamera.updateMatrixWorld();
  targetControls.update();
}

function createCameraControlSection(targetCamera, targetControls) {
  const section = document.createElement("section");
  styleElement(section, {
    display: "grid",
    gap: "10px",
    padding: "12px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.03)",
  });

  const titleEl = document.createElement("div");
  titleEl.textContent = "Camera Transform";
  styleElement(titleEl, {
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.02em",
    color: "#ffffff",
  });

  const descriptionEl = document.createElement("div");
  descriptionEl.textContent =
    "현재 카메라 위치와 target을 직접 입력할 수 있습니다. Pos 편집 시 Keep View가 켜져 있으면 target도 함께 이동해서 시선 방향을 유지합니다.";
  styleElement(descriptionEl, {
    fontSize: "12px",
    lineHeight: "1.5",
    color: "rgba(245, 247, 251, 0.72)",
  });

  const initialValues = getCameraTransformValues(targetCamera, targetControls);
  const state = {
    position: initialValues.position.clone(),
    target: initialValues.target.clone(),
    keepViewOffsetEnabled: true,
  };
  let isEditing = false;

  function syncStateFromCamera() {
    const nextValues = getCameraTransformValues(targetCamera, targetControls);
    state.position.copy(nextValues.position);
    state.target.copy(nextValues.target);
  }

  function applyStateToCamera() {
    applyCameraTransformValues(targetCamera, targetControls, state);
  }

  function syncTargetRowsFromState() {
    rows.targetX.setValue(state.target.x);
    rows.targetY.setValue(state.target.y);
    rows.targetZ.setValue(state.target.z);
  }

  function setPositionAxis(axis, value) {
    const delta = value - state.position[axis];
    state.position[axis] = value;
    if (state.keepViewOffsetEnabled) {
      state.target[axis] += delta;
      syncTargetRowsFromState();
    }
    applyStateToCamera();
  }

  const rows = {
    posX: createManagedInputRow({
      label: "Pos X",
      min: -20,
      max: 20,
      step: 0.01,
      initialValue: state.position.x,
      onInput: (value) => {
        setPositionAxis("x", value);
      },
    }),
    posY: createManagedInputRow({
      label: "Pos Y",
      min: -20,
      max: 20,
      step: 0.01,
      initialValue: state.position.y,
      onInput: (value) => {
        setPositionAxis("y", value);
      },
    }),
    posZ: createManagedInputRow({
      label: "Pos Z",
      min: -20,
      max: 20,
      step: 0.01,
      initialValue: state.position.z,
      onInput: (value) => {
        setPositionAxis("z", value);
      },
    }),
    targetX: createManagedInputRow({
      label: "Tar X",
      min: -20,
      max: 20,
      step: 0.01,
      initialValue: state.target.x,
      onInput: (value) => {
        state.target.x = value;
        applyStateToCamera();
      },
    }),
    targetY: createManagedInputRow({
      label: "Tar Y",
      min: -20,
      max: 20,
      step: 0.01,
      initialValue: state.target.y,
      onInput: (value) => {
        state.target.y = value;
        applyStateToCamera();
      },
    }),
    targetZ: createManagedInputRow({
      label: "Tar Z",
      min: -20,
      max: 20,
      step: 0.01,
      initialValue: state.target.z,
      onInput: (value) => {
        state.target.z = value;
        applyStateToCamera();
      },
    }),
  };

  const keepViewButton = createButton("Keep View On", "secondary");
  keepViewButton.addEventListener("click", () => {
    state.keepViewOffsetEnabled = !state.keepViewOffsetEnabled;
    keepViewButton.textContent = state.keepViewOffsetEnabled ? "Keep View On" : "Keep View Off";
    setToggleButtonState(keepViewButton, state.keepViewOffsetEnabled);
  });
  setToggleButtonState(keepViewButton, state.keepViewOffsetEnabled);

  function syncRowsFromState() {
    rows.posX.setValue(state.position.x);
    rows.posY.setValue(state.position.y);
    rows.posZ.setValue(state.position.z);
    rows.targetX.setValue(state.target.x);
    rows.targetY.setValue(state.target.y);
    rows.targetZ.setValue(state.target.z);
  }

  const resetButton = createButton("Reset Camera", "secondary");
  resetButton.addEventListener("click", () => {
    state.position.copy(initialValues.position);
    state.target.copy(initialValues.target);
    applyStateToCamera();
    syncRowsFromState();
  });

  section.addEventListener("focusin", () => {
    isEditing = true;
  });

  section.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && section.contains(event.relatedTarget)) {
      return;
    }
    isEditing = false;
    syncStateFromCamera();
    syncRowsFromState();
  });

  section.append(
    titleEl,
    descriptionEl,
    keepViewButton,
    rows.posX.row,
    rows.posY.row,
    rows.posZ.row,
    rows.targetX.row,
    rows.targetY.row,
    rows.targetZ.row,
    resetButton
  );

  return {
    section,
    update() {
      if (isEditing) {
        return;
      }
      syncStateFromCamera();
      syncRowsFromState();
    },
  };
}

function createModelControlPanel(modelTarget, extraSections = []) {
  const panel = document.createElement("aside");
  panel.setAttribute("aria-label", "Model transform controls");
  styleElement(panel, {
    position: "fixed",
    top: "16px",
    left: "16px",
    zIndex: "20",
    width: "min(360px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 32px)",
    overflow: "auto",
    padding: "14px",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    borderRadius: "14px",
    background: "rgba(10, 12, 18, 0.82)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.28)",
    display: "grid",
    gap: "12px",
  });

  const heading = document.createElement("div");
  heading.textContent = "Transform Controls";
  styleElement(heading, {
    fontSize: "14px",
    fontWeight: "600",
    letterSpacing: "0.02em",
    color: "#ffffff",
  });

  const modelSection = createTransformSection({
    title: "Nub Root",
    description: "nub 모델 전체 transform입니다.",
    target: modelTarget,
    ranges: {
      position: [-5, 5],
      scale: [0.05, 3],
    },
  });

  panel.append(heading, modelSection, ...extraSections);
  document.body.appendChild(panel);
  return panel;
}

function inferAnimationFrameRate(animations) {
  const frameStepCandidates = [];
  for (const clip of animations) {
    for (const track of clip.tracks ?? []) {
      const times = track.times ?? [];
      for (let index = 1; index < times.length; index += 1) {
        const delta = times[index] - times[index - 1];
        if (delta > 0.0001) {
          frameStepCandidates.push(delta);
        }
      }
    }
  }

  if (frameStepCandidates.length === 0) {
    return 30;
  }

  const smallestStep = Math.min(...frameStepCandidates);
  const rawFps = 1 / smallestStep;
  const standardRates = [12, 15, 24, 25, 30, 48, 50, 60, 72, 90, 120];
  let closestRate = standardRates[0];
  let closestDelta = Math.abs(standardRates[0] - rawFps);

  for (const rate of standardRates.slice(1)) {
    const rateDelta = Math.abs(rate - rawFps);
    if (rateDelta < closestDelta) {
      closestRate = rate;
      closestDelta = rateDelta;
    }
  }

  if (closestDelta / rawFps < 0.12) {
    return closestRate;
  }

  return clamp(Math.round(rawFps), 1, 240);
}

function buildAnimationTimeline(animations) {
  const duration = Math.max(
    animations.reduce((maxDuration, clip) => Math.max(maxDuration, clip.duration ?? 0), 0),
    1
  );
  const fps = inferAnimationFrameRate(animations);
  const frameCount = Math.max(Math.round(duration * fps) + 1, 2);
  return {
    duration,
    fps,
    frameCount,
    maxFrameIndex: frameCount - 1,
  };
}

function wrapTime(time, duration) {
  if (duration <= 0) {
    return 0;
  }
  return THREE.MathUtils.euclideanModulo(time, duration);
}

function frameToTime(frame, timeline) {
  if (timeline.maxFrameIndex <= 0) {
    return 0;
  }
  const clampedFrame = clamp(Math.round(frame), 0, timeline.maxFrameIndex);
  return (clampedFrame / timeline.maxFrameIndex) * timeline.duration;
}

function timeToFrame(time, timeline) {
  if (timeline.duration <= 0 || timeline.maxFrameIndex <= 0) {
    return 0;
  }
  const normalized = clamp(time / timeline.duration, 0, 1);
  return Math.round(normalized * timeline.maxFrameIndex);
}

function captureCameraPose(targetCamera, targetControls) {
  return {
    position: targetCamera.position.clone(),
    target: targetControls.target.clone(),
  };
}

function applyCameraPose(targetCamera, targetControls, pose) {
  targetCamera.position.copy(pose.position);
  targetControls.target.copy(pose.target);
  targetCamera.up.set(0, 1, 0);
  targetCamera.lookAt(targetControls.target);
  targetCamera.updateMatrixWorld();
  targetControls.update();
}

function interpolateCatmullRomVector3(previous, start, end, next, alpha) {
  const alpha2 = alpha * alpha;
  const alpha3 = alpha2 * alpha;
  return new THREE.Vector3(
    0.5 *
    ((2 * start.x) +
      (-previous.x + end.x) * alpha +
      (2 * previous.x - 5 * start.x + 4 * end.x - next.x) * alpha2 +
      (-previous.x + 3 * start.x - 3 * end.x + next.x) * alpha3),
    0.5 *
    ((2 * start.y) +
      (-previous.y + end.y) * alpha +
      (2 * previous.y - 5 * start.y + 4 * end.y - next.y) * alpha2 +
      (-previous.y + 3 * start.y - 3 * end.y + next.y) * alpha3),
    0.5 *
    ((2 * start.z) +
      (-previous.z + end.z) * alpha +
      (2 * previous.z - 5 * start.z + 4 * end.z - next.z) * alpha2 +
      (-previous.z + 3 * start.z - 3 * end.z + next.z) * alpha3)
  );
}

function interpolateCameraPose(keyframes, time) {
  if (keyframes.length === 0) {
    return null;
  }

  if (keyframes.length === 1 || time <= keyframes[0].time) {
    return {
      position: keyframes[0].position.clone(),
      target: keyframes[0].target.clone(),
    };
  }

  const lastKeyframe = keyframes[keyframes.length - 1];
  if (time >= lastKeyframe.time) {
    return {
      position: lastKeyframe.position.clone(),
      target: lastKeyframe.target.clone(),
    };
  }

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const from = keyframes[index];
    const to = keyframes[index + 1];
    if (time > to.time) {
      continue;
    }

    const segmentDuration = Math.max(to.time - from.time, 0.000001);
    const alpha = clamp((time - from.time) / segmentDuration, 0, 1);
    const previous = keyframes[index - 1]?.position ?? from.position;
    const next = keyframes[index + 2]?.position ?? to.position;
    return {
      position: interpolateCatmullRomVector3(previous, from.position, to.position, next, alpha),
      target: from.target.clone().lerp(to.target, alpha),
    };
  }

  return {
    position: lastKeyframe.position.clone(),
    target: lastKeyframe.target.clone(),
  };
}

function createCameraTrajectoryEditor({
  targetCamera,
  targetControls,
  rendererDomElement,
  animations,
  mixer,
  initialTrajectory = [],
  showUi = true,
  startWithPreview = false,
}) {
  const timeline = buildAnimationTimeline(animations);
  const state = {
    currentTime: 0,
    playbackEnabled: Boolean(mixer),
    previewEnabled: startWithPreview,
    keyframes: [],
    selectedKeyframeId: null,
  };
  let nextKeyframeId = 1;

  const panel = document.createElement("aside");
  panel.setAttribute("aria-label", "Camera trajectory editor");
  styleElement(panel, {
    position: "fixed",
    right: "16px",
    bottom: "16px",
    zIndex: "25",
    width: "min(460px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 32px)",
    overflow: "auto",
    padding: "16px",
    borderRadius: "18px",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    background:
      "linear-gradient(180deg, rgba(11, 14, 21, 0.92) 0%, rgba(17, 21, 29, 0.9) 100%)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 22px 48px rgba(0, 0, 0, 0.34)",
    display: "grid",
    gap: "14px",
    color: "#f5f7fb",
  });

  const header = document.createElement("div");
  styleElement(header, {
    display: "grid",
    gap: "6px",
  });

  const title = document.createElement("div");
  title.textContent = "Camera Trajectory";
  styleElement(title, {
    fontSize: "15px",
    fontWeight: "700",
    letterSpacing: "0.02em",
  });

  const description = document.createElement("div");
  description.textContent =
    "OrbitControls로 원하는 시점을 만든 뒤 Generate Keyframe을 누르면 현재 플레이헤드 프레임에 카메라 키가 저장됩니다.";
  styleElement(description, {
    fontSize: "12px",
    lineHeight: "1.55",
    color: "rgba(245, 247, 251, 0.74)",
  });

  header.append(title, description);

  const summary = document.createElement("div");
  styleElement(summary, {
    display: "grid",
    gap: "2px",
    padding: "10px 12px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  });

  const summaryPrimary = document.createElement("div");
  styleElement(summaryPrimary, {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.01em",
  });

  const summarySecondary = document.createElement("div");
  styleElement(summarySecondary, {
    fontSize: "12px",
    color: "rgba(245, 247, 251, 0.72)",
  });

  summary.append(summaryPrimary, summarySecondary);

  const buttonRow = document.createElement("div");
  styleElement(buttonRow, {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  });

  const generateButton = createButton("Generate Keyframe", "primary");
  const previewButton = createButton("Preview Off", "secondary");
  const playbackButton = createButton("Pause Scene", "secondary");
  const deleteButton = createButton("Delete Selected", "secondary");

  buttonRow.append(generateButton, previewButton, playbackButton, deleteButton);

  const playheadCard = document.createElement("div");
  styleElement(playheadCard, {
    display: "grid",
    gap: "10px",
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: "rgba(255, 255, 255, 0.03)",
  });

  const playheadHeader = document.createElement("div");
  styleElement(playheadHeader, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "10px",
  });

  const playheadLabel = document.createElement("div");
  playheadLabel.textContent = "Scene Playhead";
  styleElement(playheadLabel, {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.02em",
  });

  const playheadValue = document.createElement("div");
  styleElement(playheadValue, {
    fontSize: "12px",
    fontVariantNumeric: "tabular-nums",
    color: "#f6d56b",
  });

  playheadHeader.append(playheadLabel, playheadValue);

  const playheadSlider = document.createElement("input");
  playheadSlider.type = "range";
  playheadSlider.min = "0";
  playheadSlider.max = String(timeline.maxFrameIndex);
  playheadSlider.step = "1";
  playheadSlider.value = "0";
  styleElement(playheadSlider, {
    width: "100%",
    margin: "0",
  });

  const playheadMeta = document.createElement("div");
  styleElement(playheadMeta, {
    fontSize: "12px",
    color: "rgba(245, 247, 251, 0.72)",
    fontVariantNumeric: "tabular-nums",
  });

  playheadCard.append(playheadHeader, playheadSlider, playheadMeta);

  const timelineCard = document.createElement("div");
  styleElement(timelineCard, {
    display: "grid",
    gap: "12px",
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: "rgba(255, 255, 255, 0.03)",
  });

  const timelineLabel = document.createElement("div");
  timelineLabel.textContent = "Keyframe Timeline";
  styleElement(timelineLabel, {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.02em",
  });

  const timelineTrack = document.createElement("div");
  styleElement(timelineTrack, {
    position: "relative",
    height: "60px",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
    cursor: "pointer",
  });

  const timelineBaseline = document.createElement("div");
  styleElement(timelineBaseline, {
    position: "absolute",
    left: "12px",
    right: "12px",
    top: "50%",
    height: "2px",
    transform: "translateY(-50%)",
    background:
      "linear-gradient(90deg, rgba(246, 213, 107, 0.4) 0%, rgba(246, 213, 107, 0.1) 100%)",
  });

  const playheadMarker = document.createElement("div");
  styleElement(playheadMarker, {
    position: "absolute",
    top: "8px",
    bottom: "8px",
    width: "2px",
    left: "0%",
    background: "#f6d56b",
    boxShadow: "0 0 0 4px rgba(246, 213, 107, 0.12)",
    transform: "translateX(-1px)",
    pointerEvents: "none",
  });

  const keyframeLayer = document.createElement("div");
  styleElement(keyframeLayer, {
    position: "absolute",
    inset: "0",
  });

  timelineTrack.append(timelineBaseline, keyframeLayer, playheadMarker);

  const timelineLegend = document.createElement("div");
  styleElement(timelineLegend, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    fontSize: "12px",
    color: "rgba(245, 247, 251, 0.72)",
    fontVariantNumeric: "tabular-nums",
  });

  const timelineStartLabel = document.createElement("div");
  timelineStartLabel.textContent = "0";

  const timelineKeyframeList = document.createElement("div");
  styleElement(timelineKeyframeList, {
    textAlign: "center",
    flex: "1",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  const timelineEndLabel = document.createElement("div");
  timelineEndLabel.textContent = String(timeline.maxFrameIndex);

  timelineLegend.append(timelineStartLabel, timelineKeyframeList, timelineEndLabel);
  timelineCard.append(timelineLabel, timelineTrack, timelineLegend);

  const selectedCard = document.createElement("div");
  styleElement(selectedCard, {
    display: "grid",
    gap: "10px",
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: "rgba(255, 255, 255, 0.03)",
  });

  const selectedHeader = document.createElement("div");
  selectedHeader.textContent = "Selected Keyframe";
  styleElement(selectedHeader, {
    fontSize: "12px",
    fontWeight: "600",
    letterSpacing: "0.02em",
  });

  const selectedFrameRow = document.createElement("label");
  styleElement(selectedFrameRow, {
    display: "grid",
    gridTemplateColumns: "56px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "10px",
  });

  const selectedFrameLabel = document.createElement("span");
  selectedFrameLabel.textContent = "Frame";
  styleElement(selectedFrameLabel, {
    fontSize: "12px",
    color: "rgba(245, 247, 251, 0.72)",
  });

  const selectedFrameInput = document.createElement("input");
  selectedFrameInput.type = "number";
  selectedFrameInput.min = "0";
  selectedFrameInput.max = String(timeline.maxFrameIndex);
  selectedFrameInput.step = "1";
  styleElement(selectedFrameInput, {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: "8px",
    background: "rgba(255, 255, 255, 0.06)",
    color: "#f5f7fb",
  });

  const selectedTValue = document.createElement("div");
  styleElement(selectedTValue, {
    fontSize: "12px",
    fontVariantNumeric: "tabular-nums",
    color: "#f6d56b",
  });

  selectedFrameRow.append(selectedFrameLabel, selectedFrameInput, selectedTValue);

  const selectedHint = document.createElement("div");
  styleElement(selectedHint, {
    fontSize: "12px",
    lineHeight: "1.5",
    color: "rgba(245, 247, 251, 0.72)",
  });

  selectedCard.append(selectedHeader, selectedFrameRow, selectedHint);

  panel.append(header, summary, buttonRow, playheadCard, timelineCard, selectedCard);
  if (showUi) {
    document.body.appendChild(panel);
  }

  function getSelectedKeyframe() {
    return state.keyframes.find((keyframe) => keyframe.id === state.selectedKeyframeId) ?? null;
  }

  function normalizeKeyframe(keyframe) {
    keyframe.frame = clamp(Math.round(keyframe.frame), 0, timeline.maxFrameIndex);
    keyframe.time = frameToTime(keyframe.frame, timeline);
    keyframe.t = timeline.maxFrameIndex <= 0 ? 0 : keyframe.frame / timeline.maxFrameIndex;
    return keyframe;
  }

  function sortKeyframes() {
    state.keyframes.sort((left, right) => {
      if (left.frame === right.frame) {
        return left.id - right.id;
      }
      return left.frame - right.frame;
    });
  }

  function setCurrentFrame(frame) {
    const nextFrame = clamp(Math.round(frame), 0, timeline.maxFrameIndex);
    state.currentTime = frameToTime(nextFrame, timeline);
    if (mixer) {
      mixer.setTime(state.currentTime);
    }
    applyPreviewCameraIfNeeded();
    syncUi();
  }

  function selectKeyframe(keyframeId, shouldJump = false) {
    state.selectedKeyframeId = keyframeId;
    if (shouldJump) {
      const selectedKeyframe = getSelectedKeyframe();
      if (selectedKeyframe) {
        state.currentTime = selectedKeyframe.time;
        if (mixer) {
          mixer.setTime(state.currentTime);
        }
        applyPreviewCameraIfNeeded();
      }
    }
    syncUi();
  }

  function upsertCurrentKeyframe() {
    const pose = captureCameraPose(targetCamera, targetControls);
    const frame = timeToFrame(state.currentTime, timeline);
    const existingKeyframe = state.keyframes.find((keyframe) => keyframe.frame === frame);

    if (existingKeyframe) {
      existingKeyframe.position.copy(pose.position);
      existingKeyframe.target.copy(pose.target);
      normalizeKeyframe(existingKeyframe);
      state.selectedKeyframeId = existingKeyframe.id;
    } else {
      const keyframe = normalizeKeyframe({
        id: nextKeyframeId,
        frame,
        position: pose.position,
        target: pose.target,
      });
      nextKeyframeId += 1;
      state.keyframes.push(keyframe);
      state.selectedKeyframeId = keyframe.id;
    }

    sortKeyframes();
    syncUi(true);
  }

  function updateSelectedKeyframeFrame(frame) {
    const selectedKeyframe = getSelectedKeyframe();
    if (!selectedKeyframe) {
      return;
    }

    selectedKeyframe.frame = frame;
    normalizeKeyframe(selectedKeyframe);
    state.keyframes = state.keyframes.filter((keyframe) => {
      return keyframe.id === selectedKeyframe.id || keyframe.frame !== selectedKeyframe.frame;
    });
    sortKeyframes();
    state.currentTime = selectedKeyframe.time;
    if (mixer) {
      mixer.setTime(state.currentTime);
    }
    applyPreviewCameraIfNeeded();
    syncUi(true);
  }

  function deleteSelectedKeyframe() {
    if (state.selectedKeyframeId === null) {
      return;
    }
    state.keyframes = state.keyframes.filter((keyframe) => keyframe.id !== state.selectedKeyframeId);
    state.selectedKeyframeId = state.keyframes[0]?.id ?? null;
    applyPreviewCameraIfNeeded();
    syncUi(true);
  }

  function applyPreviewCameraIfNeeded() {
    const shouldPreview = state.previewEnabled && state.keyframes.length > 0;
    targetControls.enabled = !shouldPreview;
    rendererDomElement.style.cursor = shouldPreview ? "default" : "grab";

    if (!shouldPreview) {
      return;
    }

    const pose = interpolateCameraPose(state.keyframes, state.currentTime);
    if (pose) {
      applyCameraPose(targetCamera, targetControls, pose);
    }
  }

  function renderKeyframes() {
    keyframeLayer.replaceChildren();

    for (const keyframe of state.keyframes) {
      const diamond = document.createElement("button");
      diamond.type = "button";
      diamond.dataset.keyframe = "true";
      diamond.setAttribute("aria-label", `Camera keyframe at frame ${keyframe.frame}`);
      styleElement(diamond, {
        position: "absolute",
        left: `${keyframe.t * 100}%`,
        top: "50%",
        width: "14px",
        height: "14px",
        borderRadius: "3px",
        border:
          keyframe.id === state.selectedKeyframeId
            ? "2px solid #ffffff"
            : "1px solid rgba(255, 255, 255, 0.22)",
        background: keyframe.id === state.selectedKeyframeId ? "#f6d56b" : "#6ab7ff",
        transform: "translate(-50%, -50%) rotate(45deg)",
        cursor: "grab",
        padding: "0",
        boxShadow:
          keyframe.id === state.selectedKeyframeId
            ? "0 0 0 4px rgba(246, 213, 107, 0.16)"
            : "0 0 0 3px rgba(106, 183, 255, 0.08)",
      });

      diamond.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        selectKeyframe(keyframe.id, true);

        const initialFrame = keyframe.frame;
        const rect = timelineTrack.getBoundingClientRect();
        let hasDragged = false;

        function onPointerMove(moveEvent) {
          hasDragged = true;
          const ratio = clamp((moveEvent.clientX - rect.left) / rect.width, 0, 1);
          const nextFrame = Math.round(ratio * timeline.maxFrameIndex);
          updateSelectedKeyframeFrame(nextFrame);
        }

        function onPointerUp() {
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          diamond.style.cursor = "grab";
          if (!hasDragged) {
            setCurrentFrame(initialFrame);
          }
        }

        diamond.style.cursor = "grabbing";
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      });

      keyframeLayer.appendChild(diamond);
    }
  }

  function syncUi(shouldRerenderKeyframes = false) {
    if (shouldRerenderKeyframes) {
      renderKeyframes();
    }

    const currentFrame = timeToFrame(state.currentTime, timeline);
    const normalizedTime = timeline.maxFrameIndex <= 0 ? 0 : currentFrame / timeline.maxFrameIndex;
    const selectedKeyframe = getSelectedKeyframe();

    summaryPrimary.textContent = `${timeline.frameCount} frames · ${timeline.duration.toFixed(2)}s`;
    summarySecondary.textContent = `Derived ${timeline.fps} fps from nub.compressed animation tracks`;

    playheadValue.textContent = `Frame ${currentFrame} / ${timeline.maxFrameIndex}`;
    playheadMeta.textContent = `t ${normalizedTime.toFixed(3)} · ${state.currentTime.toFixed(2)}s`;
    playheadSlider.value = String(currentFrame);
    playheadMarker.style.left = `${normalizedTime * 100}%`;

    if (selectedKeyframe) {
      selectedFrameInput.value = String(selectedKeyframe.frame);
      selectedTValue.textContent = `t ${selectedKeyframe.t.toFixed(3)}`;
      selectedHint.textContent = `Frame ${selectedKeyframe.frame} · ${selectedKeyframe.time.toFixed(2)}s 지점 카메라입니다. 다이아몬드를 드래그하거나 숫자를 수정해서 위치를 옮길 수 있습니다.`;
      setButtonDisabled(deleteButton, false);
      setButtonDisabled(selectedFrameInput, false);
    } else {
      selectedFrameInput.value = "";
      selectedTValue.textContent = "t -";
      selectedHint.textContent = "선택된 키프레임이 없습니다. 원하는 시점에서 Generate Keyframe을 눌러 첫 키를 추가하세요.";
      setButtonDisabled(deleteButton, true);
      setButtonDisabled(selectedFrameInput, true);
    }

    const keyframeFrames = state.keyframes.map((keyframe) => keyframe.frame);
    timelineKeyframeList.textContent =
      keyframeFrames.length > 0 ? `Keys ${keyframeFrames.join(" · ")}` : "No keys";

    playbackButton.textContent = state.playbackEnabled ? "Pause Scene" : "Play Scene";
    previewButton.textContent = state.previewEnabled ? "Preview On" : "Preview Off";
    setToggleButtonState(playbackButton, state.playbackEnabled);
    setToggleButtonState(previewButton, state.previewEnabled);
  }

  function update(delta) {
    if (state.playbackEnabled) {
      state.currentTime = wrapTime(state.currentTime + delta, timeline.duration);
    }

    if (mixer) {
      mixer.setTime(state.currentTime);
    }

    applyPreviewCameraIfNeeded();
    syncUi();
  }

  generateButton.addEventListener("click", () => {
    upsertCurrentKeyframe();
  });

  previewButton.addEventListener("click", () => {
    state.previewEnabled = !state.previewEnabled;
    applyPreviewCameraIfNeeded();
    syncUi();
  });

  playbackButton.addEventListener("click", () => {
    state.playbackEnabled = !state.playbackEnabled;
    syncUi();
  });

  deleteButton.addEventListener("click", () => {
    deleteSelectedKeyframe();
  });

  playheadSlider.addEventListener("input", () => {
    setCurrentFrame(Number(playheadSlider.value));
  });

  selectedFrameInput.addEventListener("input", () => {
    const nextFrame = Number(selectedFrameInput.value);
    if (Number.isNaN(nextFrame)) {
      return;
    }
    updateSelectedKeyframeFrame(nextFrame);
  });

  timelineTrack.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.dataset.keyframe === "true") {
      return;
    }

    const rect = timelineTrack.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const nextFrame = Math.round(ratio * timeline.maxFrameIndex);
    setCurrentFrame(nextFrame);
  });

  const originalPose = captureCameraPose(targetCamera, targetControls);
  for (const trajectoryEntry of initialTrajectory) {
    const pose = {
      position: new THREE.Vector3(
        trajectoryEntry.camera.pos_x,
        trajectoryEntry.camera.pos_y,
        trajectoryEntry.camera.pos_z
      ),
      target: new THREE.Vector3(
        trajectoryEntry.camera.target_x,
        trajectoryEntry.camera.target_y,
        trajectoryEntry.camera.target_z
      ),
    };
    state.keyframes.push(
      normalizeKeyframe({
        id: nextKeyframeId,
        frame: trajectoryEntry.frame,
        position: pose.position,
        target: pose.target,
      })
    );
    nextKeyframeId += 1;
  }
  applyCameraPose(targetCamera, targetControls, originalPose);
  if (state.keyframes.length > 0) {
    sortKeyframes();
    state.selectedKeyframeId = state.keyframes[0].id;
  }

  setButtonDisabled(deleteButton, true);
  setButtonDisabled(selectedFrameInput, true);
  renderKeyframes();
  syncUi();
  applyPreviewCameraIfNeeded();

  return {
    update,
    isPreviewEnabled() {
      return state.previewEnabled;
    },
    getCurrentTime() {
      return state.currentTime;
    },
  };
}

setPlaneVertices(renderPlane, defaultDuckPlaneVertices);

const clock = new THREE.Clock();
const { gltf, loadedScene, modelRoot, mixer } = await loadGltfScene(
  gltfUrl,
  camera,
  controls,
  gltfSceneScale
);
const followObject = loadedScene.getObjectByName("아마츄어");
const followTarget = new THREE.Vector3();
const initialFollowCameraOffset = new THREE.Vector3(0.75, 0.15, 0.15);

modelRoot.position.copy(defaultNubTransform.position);
modelRoot.rotation.copy(defaultNubTransform.rotation);
modelRoot.scale.setScalar(defaultNubTransform.scale);
modelRoot.add(renderPlane);
scene.add(modelRoot);

if (!followObject) {
  console.warn("follow object not found: 아마츄어");
} else {
  modelRoot.updateMatrixWorld(true);
  followObject.getWorldPosition(followTarget);
  controls.target.copy(followTarget);
  camera.position.copy(followTarget).add(initialFollowCameraOffset);
  controls.update();
}

const cameraControlSection = isDebug ? createCameraControlSection(camera, controls) : null;
if (isDebug) {
  createModelControlPanel(modelRoot, [cameraControlSection.section]);
}

const cameraTrajectoryEditor = createCameraTrajectoryEditor({
  targetCamera: camera,
  targetControls: controls,
  rendererDomElement: renderer.domElement,
  animations: gltf.animations ?? [],
  mixer,
  initialTrajectory: defaultCameraTrajectory,
  showUi: isDebug,
  startWithPreview: true,
});

const bgSplatTimeOffset = -1.5924994035447764;
const bgSplatAnimateT = dyno.dynoFloat(bgSplatTimeOffset);
const effectParams = {
  effect: "Disintegrate",
  intensity: 0.8,
  sceneScale: 0.1,
};

const [bgRoot, bgSplat] = loadSplat(splat1Url, true, splat1BackgroundOffset);
const [bg2Root, bg2Splat] = loadSplat(splat2Url, true, splat1BackgroundOffset);
scene.add(bgRoot);
scene.add(bg2Root)
bgRoot.rotateY(3.141592653589793238 / 3.0);
splatEffectInitialize(bgSplat, bgSplatAnimateT, effectParams);
splatEffectInitialize(bg2Splat, bgSplatAnimateT, effectParams);
splatEffectInitialize(texSplat, bgSplatAnimateT, effectParams);

await Promise.all([bgSplat.initialized, texSplat.initialized]);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

bg2Root.visible = false
bg2Root.rotateY(1.2 * 3.141592653589793238)
bg2Root.position.y = -0.07
bg2Root.position.z = 0.1
bg2Root.position.x = -0.1
const thresholdTime = 2
const switchAnimationHalfLength = 1.6
const switchAnimationLength = 2 * switchAnimationHalfLength
renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  cameraTrajectoryEditor.update(delta);
  const sceneTime = cameraTrajectoryEditor.getCurrentTime();
  const switchElapsedTime = clamp(sceneTime - thresholdTime, 0, switchAnimationLength);
  bgSplatAnimateT.value = bgSplatTimeOffset + switchElapsedTime * 2;
  bgSplat.updateVersion();
  bg2Splat.updateVersion();
  texSplat.updateVersion();

  const hasSwitchedScene = sceneTime >= thresholdTime + switchAnimationHalfLength;
  bg2Root.visible = hasSwitchedScene
  bgRoot.visible = !hasSwitchedScene

  textureCamera.rotation.y += delta * 0.4;
  controls.update();
  cameraControlSection?.update();

  renderer.setRenderTarget(renderTarget);
  renderer.render(textureScene, textureCamera);
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  if (isDebug) {
    renderAxesOverlay(renderer, camera, controls);
  }
});
