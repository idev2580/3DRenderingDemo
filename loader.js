import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const splatSwapYZMatrix = new THREE.Matrix4().set(
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1
);

function loadSplat(splatUrl, scene, isYzSwap, offset){
    const splatRoot = new THREE.Group();
    const splatBody = new SplatMesh({
        url: splatUrl,
        raycastable: false,
    });

    if(isYzSwap){
        splatBody.applyMatrix4(splatSwapYZMatrix);
    }
    
    splatRoot.add(splatBody)
    scene.add(splatRoot)

    splatBody.initialized.then(()=>{
        splatRoot.position.add(offset);
    }).catch((err)=>{
        console.error(err);
    })
    return [splatRoot, splatBody]
}
function frameObject(camera, controls, object, clippingRadiusScale = 1) {
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

async function loadGltfScene(gltfUrl, scene, camera, controls, sceneScale=1.0){
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(gltfUrl);
    const loadedScene = gltf.scene
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
    const scale = (largestAxis > 0 ? 2 / largestAxis : 1) * sceneScale;
    const modelRoot = new THREE.Group();

    modelRoot.scale.setScalar(scale);
    modelRoot.position.copy(center).multiplyScalar(-scale);
    modelRoot.add(loadedScene);
    scene.add(modelRoot);
    
    let mixer = null;
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(loadedScene);

        for (const clip of gltf.animations) {
            mixer.clipAction(clip).play();
        }
    }
    frameObject(camera, controls, modelRoot, 1 / sceneScale);
    return {gltf, loadedScene, modelRoot, mixer}
}

export {
    loadSplat,
    loadGltfScene
}