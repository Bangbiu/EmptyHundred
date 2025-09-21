import { 
    ACESFilmicToneMapping, 
    Clock, 
    PCFSoftShadowMap, 
    PerspectiveCamera, 
    Scene, 
    SRGBColorSpace, 
    WebGLRenderer, 
} from "three";

class SceneBuilder {
    public readonly canvas: HTMLCanvasElement;
    public readonly scene: Scene;
    public readonly camera: PerspectiveCamera;
    public readonly renderer: WebGLRenderer;

    public readonly clock = new Clock();

    public raf: number = -1;
    public timestamp = 0.0;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.scene = new Scene();
        this.camera =  new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.scene.add(this.camera);
        const renderer = new WebGLRenderer({ 
            canvas, 
            antialias: true, 
            alpha: true 
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = SRGBColorSpace;
        renderer.toneMapping = ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = PCFSoftShadowMap; // soft filtering
        this.renderer = renderer;
        window.addEventListener("resize", this.onResize.bind(this));
        this.bindObserver();
    }

    public startAnimation() {
        requestAnimationFrame(this.animate.bind(this));
    }

    public animate(_now: number) {
        this.renderer.render(this.scene, this.camera);
        this.raf = requestAnimationFrame(this.animate.bind(this));
    }

    public onResize() {
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
    }

    public bindObserver() {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries[0]?.isIntersecting;
                if (visible) {
                    this.onResize();
                    cancelAnimationFrame(this.raf);
                    this.startAnimation();
                } else {
                    cancelAnimationFrame(this.raf);
                }
            },
            { root: null, threshold: 0.1 }
        );
        observer.observe(this.canvas);
    }
}

export {
    SceneBuilder
}