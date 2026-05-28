import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


// const gltfUrl = "assets/scene.gltf";
const isDebug = true;
const gltfUrl = "assets/nub1.glb";
const gltfSceneScale = 0.2;
const splatUrl = "assets/splat.ply";
const splatBackgroundOffset = new THREE.Vector3(0, 0, -0.1);

export {isDebug, gltfUrl, gltfSceneScale, splatUrl, splatBackgroundOffset}