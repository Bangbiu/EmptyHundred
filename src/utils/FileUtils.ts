import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { Group, LoadingManager, Mesh, SRGBColorSpace, TextureLoader } from "three";
import { FontLoader, type Font } from "three/examples/jsm/Addons.js";

const BASE = import.meta.env.BASE_URL; // e.g. "/<REPO_NAME>/" on GH Pages, "/" locally

class FileUtils {
    public static async loadObj(fileName: string) {
        if (FileUtils.MeshPool.has(fileName)) {
            return FileUtils.MeshPool.get(fileName)!.clone(false);
        }

        const path = `${BASE}assets/models/${fileName}/`;
        const mtlFile = `${fileName}.mtl`;
        const modelFile = `${fileName}.obj`;
        // Optional: a simple loading manager to see progress
        const manager = new LoadingManager();
        manager.onProgress = (url, loaded, total) => console.log(`Loading ${loaded}/${total}: ${url}`);
        manager.onError = (url) => console.error(`Failed to load: ${url}`);

        const mtlLoader = new MTLLoader(manager);
        
        mtlLoader.setResourcePath(path);   // where textures live (prefix for paths in .mtl)
        mtlLoader.setPath(path);           // base path for .mtl itself

        const materials: MTLLoader.MaterialCreator = await new Promise((resolve, reject) => {
            mtlLoader.load(mtlFile, resolve, undefined, reject);
        });
        
        // Important so OBJLoader can reuse the materials (with textures bound)
        materials.preload();
        // Optional: ensure color space is correct for base color maps
        Object.values(materials.materials).forEach((mat: any) => {
            if (mat.map) mat.map.colorSpace = SRGBColorSpace;
            if (mat.emissiveMap) mat.emissiveMap.colorSpace = SRGBColorSpace;
        });

        const objLoader = new OBJLoader(manager);
        objLoader.setMaterials(materials);
        objLoader.setPath(path);

        const object = await new Promise<Group>((resolve, reject) => {
            objLoader.load(modelFile, 
                resolve, 
                (xhr) => console.log(`OBJ ${(xhr.loaded / xhr.total) * 100}%`),
                (err) => {
                    console.error("OBJ load error:", err);
                    reject(err);
                }
            );
        });

        for (const child of object.children) {
            const mesh = child as any;
            if (mesh.isMesh) {
                if (mesh.material && mesh.material.map) {
                    mesh.material.map.colorSpace = SRGBColorSpace;
                }
                FileUtils.MeshPool.set(fileName, child as Mesh);
                return child as Mesh;
            }
        }
        throw new Error("No Mesh in the File"); // rejects
    }

    public static async loadFont(fileName: string) {
        return await new Promise<Font>((resolve, reject) => {
            FileUtils.FontLoader.load(
                `${BASE}fonts/${fileName}.json`,
                resolve,
                undefined,
                reject
            );
        });
    }

    public static loadSprite(file: string) {
        const url = `${BASE}assets/icon/${file}`
        const sprite = FileUtils.TexLoader.load(url);
        sprite.colorSpace = SRGBColorSpace;
        return sprite;
    }

    public static readonly TexLoader = new TextureLoader();
    public static readonly FontLoader = new FontLoader();
    public static readonly MeshPool: Map<string, Mesh> = new Map();
}



await FileUtils.loadObj("MasterEmblem");
await FileUtils.loadObj("TOP500Emblem");

export {
    FileUtils
}