import * as THREE from "three";
import { FileUtils } from "../utils/FileUtils";
import { MaterialUtils } from "../utils/MaterialUtils";
import { SpringDrag } from "../interaction/SpringDrag";
import { SceneBuilder } from "./SceneBuilder";
import { Text3D } from "./Text3D";
import { SparkleField } from "../effects/Sparkles";
import { SoftBlobShadow } from "../effects/SoftBlobShadow";
import { VolumetricSpot } from "../effects/VolumetricSpot";

class FloorMesh extends THREE.Mesh {
    constructor(radius = 1) {
        super(new THREE.CircleGeometry(radius, 100), FloorMesh.MAT);
        this.rotation.x = -Math.PI / 2;
        this.position.y = -0.001; // tiny offset avoids z-fighting with podium base
        this.scale.set(50,50,1);
        this.receiveShadow = true;
    }

    public static readonly MAT = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 0.9,
        metalness: 0.0,
    });
}

class PodiumMesh extends THREE.Mesh {
    public readonly shadow: THREE.Mesh;
    constructor() {
        super(
            new THREE.CylinderGeometry(1.45, 1.45, 0.35, 96, 1, false),
            PodiumMesh.MAT
        );

        this.castShadow = false;
        this.receiveShadow = true;
        this.shadow = new THREE.Mesh(
            new THREE.CircleGeometry(1.6, 64), PodiumMesh.SHADOW_MAT
        );

        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.001;
        this.add(this.shadow);
    }

    public static readonly MAT = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.6,
        metalness: 0.25,
    });

    public static readonly SHADOW_MAT = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.55,
    });
}

class EmblemPodium extends THREE.Group{
    public readonly podium = new PodiumMesh();
    public readonly emblem: THREE.Group = new THREE.Group();
    // Lighting
    public readonly lights: Array<THREE.Light> = new Array();
    public readonly beam: VolumetricSpot;
    public readonly sparkles: SparkleField;
    public readonly shadow: SoftBlobShadow;
    // Animate
    public timestamp: number = 0.0;

    constructor(name?: string) {
        super();
        this.rebuildLighting();

        if (name) this.load(name);
        this.add(this.podium);
        this.add(this.emblem);

        // SoftShadow
        this.shadow = new SoftBlobShadow({
            baseSize: 2,      // tune: ~slightly bigger than podium top
            sizePerUnit: 30,  // how quickly it grows as emblem rises
            maxOpacity: 0.5,   // initial darkness
            opacityFalloff: 0.54,
        });
        this.shadow.position.y = 0.18;
        this.shadow.position.z = 0.3;
        this.add(this.shadow);

        // God's Light
        const beamLen = 6.0; // length of visible shaft
        const beam = new VolumetricSpot(beamLen, THREE.MathUtils.degToRad(22), 0xffffff, 0.03);
        beam.position.set(0, 5, 0);
        // aim the beam from the light toward the same target
        //const up = new THREE.Vector3(0,1,0);
        //const m = new THREE.Matrix4().lookAt(beam.position, this.emblem.position, up);
        //beam.quaternion.setFromRotationMatrix(m);
        this.beam = beam
        this.add(beam);
        // Sparkles
        this.sparkles = new SparkleField({
            count: 30,
            diskRadius: 1,
            height: 0.5,
            sizePx: 0.5,
            intensity: 1,
            blinkRate: 0.8,     // speed of blinking
            seExponent: 1,    // superellipse exponent (4 = squircle)
            color: 0xfff6d0,
            depthTest: true,    // hide behind emblem for clean silhouette
        });
        // this.sparkles.rotation.x = Math.PI / 2;
        // this.sparkles.position.y = EmblemPodium.emblemHeights;
    }

    public load(name: string) {
        FileUtils.loadObj(name).then((obj) => {
            obj.material = MaterialUtils.createTexturedMat(
                MaterialUtils.gold,
                (obj.material as any).map
            );
            this.emblem.clear();
            this.emblem.add(obj);
        });
    }

    public rebuildLighting() {
        this.lights.length = 0;
        this.clear();
        // ---------- Lighting ----------
        this.add(new THREE.AmbientLight(0xffffff, 0.08)); // just a whisper to lift pure black

        // Overhead spotlight 1 (key light)
        const spot1 = new THREE.SpotLight(0xffffff, 80, 20, THREE.MathUtils.degToRad(22), 0.35, 1.2);
        spot1.position.set(0, 6.0, 0.6); // slightly forward to show a highlight on the rim
        spot1.target.position.set(0, 0.25, 0);
        spot1.castShadow = true;
        spot1.shadow.mapSize.set(2048, 2048);
        spot1.shadow.bias = -0.0005;          // helps avoid acne
        spot1.shadow.radius = 6;              // blur the shadow edges (PCFSoftShadowMap required)
        this.add(spot1);
        this.add(spot1.target);

        // Overhead spotlight 2
        const spot2 = new THREE.SpotLight(0xffffff, 2, 20, THREE.MathUtils.degToRad(22), 0.35, 1.2);
        spot2.position.set(0, 5.0, 6); // slightly forward to show a highlight on the rim
        spot2.target.position.set(0, 0.25, 0);
        this.add(spot2);
        this.add(spot2.target);

        // Subtle rim fill from front-right to reveal edges
        // const fill = new THREE.DirectionalLight(0xffffff, 2);
        // fill.position.set(-1.2, -1.6, -2.4); // flipped Z
        // fill.castShadow = false;
        // this.add(fill);
    }

    public update() {
        const t = this.timestamp += 0.016;
        // Gentle hover and micro-rotation for life
        const emblemBody = this.emblem.children[0];
        if (emblemBody) {
            const hover = Math.sin(t * 1.2) * EmblemPodium.emblemHoverScale;
            emblemBody.position.y = EmblemPodium.emblemHeights + hover;
            emblemBody.rotation.y = Math.sin(t * 0.25) * 0.06 + Math.PI / 2;
            this.shadow.updateFromHover(-hover + EmblemPodium.emblemHoverScale);
            this.shadow.rotation.z = this.emblem.rotation.y;
            //this.sparkles.update();
        }

        // animate "God's light"
        this.beam.update(t);
    }

    // Constants
    public static readonly emblemHeights = 1.25;
    public static readonly emblemHoverScale = 0.02;
}

class RankPodium extends EmblemPodium {
    constructor(rankModel = "MasterEmblem", rankText = "Master 5", roleIcon = "Damage.svg") {
        super(rankModel);
        const text = new Text3D(rankText, roleIcon);
        text.position.y = 2.5;
        this.add(text);
    }
}

class RankScene extends SceneBuilder {
    public readonly floor = new FloorMesh();
    public readonly controller: SpringDrag;
    public readonly items: Array<EmblemPodium> = new Array();
    public curRole = 0;

    private readonly targetQuat: THREE.Quaternion = new THREE.Quaternion();

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);   
        const scene = this.scene;
        const camera = this.camera;
        // Camera
        camera.position.set(0, RankScene.cameraHeight, 0);
        // Floor
        this.floor = new FloorMesh();
        scene.add(this.floor);

        this.placeItems(
            new RankPodium("TOP500Emblem", "TOP 91", "Open.svg"),
            new RankPodium("MasterEmblem", "Master 4", "Support.svg"),
            new RankPodium("MasterEmblem", "Master 5", "Damage.svg"),
            new RankPodium("MasterEmblem", "Master 3", "Tank.svg"),
        );
        this.camera.lookAt(0,0,1);
        this.controller = new SpringDrag(canvas, {
            // tweak if you want a different feel:
            maxAngle: Math.PI / 4,   // allow up to ±30°
            dragGain: 3.5,           // more/less sensitive to drag
            stiffness: 24,           // snappier spring
            damping: 0.9,            // heavier damping -> less bounce
        });

        this.focusOn(this.curRole);
        this.bindEvent();
    }

    public placeItems(...items: Array<EmblemPodium>) {
        const delta = Math.PI * 2 / items.length;
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            item.position.set(
                Math.sin(index * delta) * RankScene.itemDistance,
                0,
                Math.cos(index * delta) * RankScene.itemDistance,
            );
            item.lookAt(0, 0, 0);
            this.scene.add(item);
            this.items.push(item);
        }
    }

    public focusOn(roleIndex: number = this.curRole) {
        const item = this.items[roleIndex];
        // Compute the new lookAt orientation
        const targetPos = new THREE.Vector3(item.position.x, RankScene.cameraHeight + 0.3, item.position.z);
        const m = new THREE.Matrix4().lookAt(this.camera.position, targetPos, this.camera.up);
        this.targetQuat.setFromRotationMatrix(m);

        this.controller.setTarget(item.emblem);
    }

    public bindEvent() {
        const prevBtn = document.getElementById("PrevRoleBtn") as HTMLButtonElement;
        prevBtn.addEventListener("click",() => {
            this.curRole = (this.curRole + 1) % this.items.length;
            this.focusOn(this.curRole);    
        });
        const nextBtn = document.getElementById("NextRoleBtn") as HTMLButtonElement;
        nextBtn.addEventListener("click",() => {
            this.curRole = (this.curRole + this.items.length - 1) % this.items.length;
            this.focusOn(this.curRole);    
        });
        window.addEventListener("keyup", (ev) => {
            if (ev.key === "w") {
                this.camera.position.y +=0.5;
                this.focusOn();
            }
            if (ev.key === "g") {
                this.items[0].beam.rotation.y +=0.1;
            }

            if (ev.key === "h") {
                this.items[0].beam.rotation.y -=0.1;
            }
        })
    }

    public override animate(now: number): void {
        const dt = this.clock.getDelta();
        this.controller.update(dt);
        this.items.forEach(item => item.update());
        // Smoothly rotate camera toward target
        this.camera.quaternion.slerp(this.targetQuat, 0.03); // adjust speed
        super.animate(now);
    }

    public static readonly itemDistance = 4.6;
    public static readonly cameraHeight = 1;
}

function initRanksScene() {
    const canvas = document.getElementById("ranks-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    new RankScene(canvas);
}

export {
    initRanksScene
}