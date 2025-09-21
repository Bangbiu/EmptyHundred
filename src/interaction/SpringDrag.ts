import * as THREE from "three";

type SpringOpts = {
  /** Max absolute yaw deviation from default rotation (radians). */
  maxAngle: number;           // default: Math.PI / 5  (≈36°)
  /** Drag sensitivity -> how quickly horizontal drag maps to desired angle. */
  dragGain: number;           // default: 3.0
  /** Spring stiffness (larger = snappier). */
  stiffness: number;          // default: 20
  /** Damping (0 = no damping, 1 = critical-ish for this discretization). */
  damping: number;            // default: 0.85
  /** Optional: pixels to radians pre-scale (before tanh + maxAngle). */
  pixelScale: number;         // default: 1 / 300
};

export class SpringDrag {
    private obj?: THREE.Object3D;
    private canvas: HTMLElement;

    private baseY = 0;          // record default yaw (in radians)
    private theta = 0;          // current offset from base
    private omega = 0;          // angular velocity
    private thetaTarget = 0;    // spring target (changes while dragging)

    private dragging = false;
    private startX = 0;

    private opts: Required<SpringOpts>;

    constructor(canvas: HTMLElement, opts: Partial<SpringOpts> = {}) {
        this.canvas = canvas;

        this.opts = {
            maxAngle: Math.PI / 5,
            dragGain: 3.0,
            stiffness: 20,
            damping: 0.85,
            pixelScale: 1 / 300,
            ...opts,
        };

        // Bind events
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        canvas.addEventListener("pointerdown", this.onPointerDown);
        window.addEventListener("pointerup", this.onPointerUp);
        window.addEventListener("pointercancel", this.onPointerUp);
    }

    public setTarget(obj: THREE.Object3D) {
        this.obj = obj;
        this.baseY = obj.rotation.y;
    }

    /** Call this each frame with delta time in seconds. */
    update(dt: number) {
        if (!this.obj) return;
        // Damped spring to thetaTarget
        // theta'' = -k*(theta - thetaTarget) - c*theta'
        const k = this.opts.stiffness;
        const c = 2 * Math.sqrt(k) * this.opts.damping; // approx. normalized damping

        const accel = -k * (this.theta - this.thetaTarget) - c * this.omega;
        this.omega += accel * dt;
        this.theta += this.omega * dt;

        // Apply to object
        this.obj.rotation.y = this.baseY + this.theta;
    }

    dispose() {
        this.canvas.removeEventListener("pointerdown", this.onPointerDown);
        window.removeEventListener("pointerup", this.onPointerUp);
        window.removeEventListener("pointercancel", this.onPointerUp);
        this.canvas.removeEventListener("pointermove", this.onPointerMove);
    }

    // ——— Event handlers ———
    private onPointerDown(ev: PointerEvent) {
        this.dragging = true;
        this.startX = ev.clientX;
        (ev.target as Element)?.setPointerCapture?.(ev.pointerId);
        this.canvas.addEventListener("pointermove", this.onPointerMove);
    }

    private onPointerMove(ev: PointerEvent) {
        if (!this.dragging) return;

        // Horizontal drag in pixels
        const dx = ev.clientX - this.startX;

        // Map drag -> target angle with soft saturation:
        // angle_raw grows with dx, then tanh slowly saturates as |dx| increases,
        // finally scaled to +/- maxAngle for that "harder to rotate" feel.
        const x = this.opts.dragGain * dx * this.opts.pixelScale;
        const soft = Math.tanh(x); // -1..+1
        this.thetaTarget = soft * this.opts.maxAngle;
    }

    private onPointerUp = (_ev: PointerEvent) => {
        if (!this.dragging) return;
        this.dragging = false;

        // Release: snap target back to 0; spring will pull and bounce back.
        this.thetaTarget = 0;

        this.canvas.removeEventListener("pointermove", this.onPointerMove);
    };
}
