
import { 
    Group, 
    Mesh, 
    MeshStandardMaterial, 
    Sprite, 
    SpriteMaterial, 
    SRGBColorSpace, 
    TextureLoader 
} from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FileUtils } from "../utils/FileUtils";

const font = await FileUtils.loadFont("BigNoodleTitling_Regular");

class Text3D extends Group {
    public readonly textMesh: Mesh;
    constructor(text: string, iconFile: string) {
        super();
        const textHeight = 0.18;
        const gap = 0.06;
        const textGeo = new TextGeometry(text, {
            font,
            size: textHeight,
            depth: 0.03,
            curveSegments: 8,
            bevelEnabled: false,
        });
        
        textGeo.computeBoundingBox();
        const bbox = textGeo.boundingBox!;
        const textW = bbox.max.x - bbox.min.x;
        const textH = bbox.max.y - bbox.min.y;

        // center the text around its origin for easy alignment
        textGeo.translate(-0.5 * textW, -0.5 * textH, 0);

        const textMat = new MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.6,
            roughness: 0.35,
            emissive: 0x222222,
        });
        this.textMesh = new Mesh(textGeo, textMat);
        this.add(this.textMesh);

        // Icon

        const tex = FileUtils.loadSprite(iconFile);

        const iconMat = new SpriteMaterial({ map: tex, transparent: true });
        const icon = new Sprite(iconMat);

        // size icon to roughly match text cap height
        const iconH = textHeight * 2;
        const iconW = iconH; // OW2 role icons are roughly square
        icon.scale.set(iconW, iconH, 1);

        // Layout: [icon]  gap  [text]
        const totalW = iconW + gap + textW;
        icon.position.set(-0.5 * totalW + 0.5 * iconW - 0.05, 0, 0);
        this.textMesh.position.set(-0.5 * totalW + iconW + gap + 0.5 * textW, -0.02, 0);
        this.add(icon);
    }
}
export {
    Text3D
}