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
}

export {
    loadSplat
}