import {  SparkRenderer, SparkControls, SplatMesh, dyno } from "@sparkjsdev/spark";

function splatEffectInitialize(splat, animateT, effectParams){
    splat.objectModifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => {
        const d = new dyno.Dyno({
        inTypes: { 
            gsplat: dyno.Gsplat, 
            t: "float", 
            intensity: "float" ,
            sceneScale: "float"
        },
        outTypes: { gsplat: dyno.Gsplat },
        globals: () => [
            dyno.unindent(`
            vec3 hash(vec3 p) {
                return fract(sin(p*123.456)*123.456);
            }

            mat2 rot(float a) {
                float s = sin(a), c = cos(a);
                return mat2(c, -s, s, c);
            }

            vec3 headMovement(vec3 pos, float t) {
                pos.xy *= rot(smoothstep(-1., -2., pos.y) * .2 * sin(t*2.));
                return pos;
            }

            vec3 breathAnimation(vec3 pos, float t) {
                float b = sin(t*1.5);
                pos.yz *= rot(smoothstep(-1., -3., pos.y) * .15 * -b);
                pos.z += .3;
                pos.y += 1.2;
                pos *= 1. + exp(-3. * length(pos)) * b;
                pos.z -= .3;
                pos.y -= 1.2;
                return pos;
            }

            vec4 fractal1(vec3 pos, float t, float intensity) {
                float m = 100.;
                vec3 p = pos * .1;
                p.y += .5;
                for (int i = 0; i < 8; i++) {
                p = abs(p) / clamp(abs(p.x * p.y), 0.3, 3.) - 1.;
                p.xy *= rot(radians(90.));
                if (i > 1) m = min(m, length(p.xy) + step(.3, fract(p.z * .5 + t * .5 + float(i) * .2)));
                }
                m = step(m, 0.5) * 1.3 * intensity;
                return vec4(-pos.y * .3, 0.5, 0.7, .3) * intensity + m;
            }

            vec4 fractal2(vec3 center, vec3 scales, vec4 rgba, float t, float intensity) {
                vec3 pos = center;
                float splatSize = length(scales);
                float pattern = exp(-50. * splatSize);
                vec3 p = pos * .65;
                pos.y += 2.;
                float c = 0.;
                float l, l2 = length(p);
                float m = 100.;
                
                for (int i = 0; i < 10; i++) {
                p.xyz = abs(p.xyz) / dot(p.xyz, p.xyz) - .8;
                l = length(p.xyz);
                c += exp(-1. * abs(l - l2) * (1. + sin(t * 1.5 + pos.y)));
                l2 = length(p.xyz);
                m = min(m, length(p.xyz));
                }
                
                c = smoothstep(0.3, 0.5, m + sin(t * 1.5 + pos.y * .5)) + c * .1;              
                return vec4(vec3(length(rgba.rgb)) * vec3(c, c*c, c*c*c) * intensity, 
                        rgba.a * exp(-20. * splatSize) * m * intensity);
            }

            vec4 sin3D(vec3 p, float t) {
                float m = exp(-2. * length(sin(p * 5. + t * 3.))) * 5.;
                return vec4(m) + .3;
            }

            vec4 disintegrate(vec3 pos, float t, float intensity) {
                vec3 p = pos + (hash(pos) * 2. - 1.) * intensity;
                float tt = smoothstep(-1., 0.5, -sin(t + -pos.y * .5));  
                p.xz *= rot(tt * 2. + p.y * 2. * tt);
                return vec4(mix(p, pos, tt), tt);
            }
            `)
        ],
        statements: ({ inputs, outputs }) => dyno.unindentLines(`
            ${outputs.gsplat} = ${inputs.gsplat};
            
            vec3 localPos = ${inputs.gsplat}.center;
            vec3 splatScales = ${inputs.gsplat}.scales;
            vec4 splatColor = ${inputs.gsplat}.rgba;
            
            vec4 e = disintegrate(localPos * ${inputs.sceneScale}, ${inputs.t}, ${inputs.intensity});
            ${outputs.gsplat}.center = e.xyz / ${inputs.sceneScale};
            ${outputs.gsplat}.scales = mix(vec3(.01, .01, .01), ${inputs.gsplat}.scales, e.w);
        `),
        });

        gsplat = d.apply({ 
        gsplat, 
        t: animateT,
        intensity: dyno.dynoFloat(effectParams.intensity),
        sceneScale: dyno.dynoFloat(effectParams.sceneScale)
        }).gsplat;
        return { gsplat };
    }
    );
    splat.updateGenerator();
}

export {
    splatEffectInitialize
}