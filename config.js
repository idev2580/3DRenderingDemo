import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


// const gltfUrl = "assets/scene.gltf";
const isDebug = true;
const gltfUrl = "assets/nub1.glb";
const gltfSceneScale = 0.2;
const splat1Url = "assets/nubzuki_world.compressed.ply";
const splat1BackgroundOffset = new THREE.Vector3(0, 0, 0.0);
const splat2Url = "assets/duck_full.compressed.ply";
const splat2BackgroundOffset = new THREE.Vector3(0, 0, -0.1);

export {isDebug, gltfUrl, gltfSceneScale, splat1Url, splat1BackgroundOffset, splat2Url, splat2BackgroundOffset}