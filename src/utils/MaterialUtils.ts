import { 
    Group, 
    Material, 
    Mesh, 
    MeshPhysicalMaterial, 
    Texture, 
} from "three";

class MaterialUtils {
    public static createTexturedMat(mat: MeshPhysicalMaterial, texture: Texture) {
        const newMat = mat.clone();
        newMat.map = texture;
        newMat.emissiveMap = texture;
        return newMat;
    }

    public static replaceAllMat(group: Group, mat: Material) {
        group.traverse((child: any) => {
            if (child.isMesh) (child as Mesh).material = mat;
        });
    }

    public static readonly gold = new MeshPhysicalMaterial({
        color: 0xD4AF37, // rich gold
        metalness: 1.0,
        roughness: 0.25,
        clearcoat: 1.0,
        clearcoatRoughness: 0.15,
        emissiveIntensity: 0.8,
        emissive: 0xD4AF37
    });
}

export {
    MaterialUtils
}