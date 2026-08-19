/**
 * Known-bad dummy customElement wrapping a static preview.
 * Registers a tag if a registry exists, but paths never change under state=run.
 * G-live must reject this for static-run — not because customElements.get is missing.
 */
export const BODY_D0 = "M10 10C20 10 20 20 10 20Z";
export const EYE_D0 = "M3 3C5 3 5 5 3 5Z";
export const CUSTOM_ELEMENT = "dummy-blob";

const Base = typeof HTMLElement === "undefined" ? class {} : HTMLElement;

export class DummyBlob extends Base {
  constructor() {
    super();
    this.state = "idle";
    this.bodyD = BODY_D0;
    this.eyeD = EYE_D0;
    this.previewTransform = "rotate(-8)";
  }

  setState(state) {
    this.state = state;
  }

  springStep() {
    /* no-op — wrapper theater */
  }
}

export function mountDummy() {
  return new DummyBlob();
}

if (typeof customElements !== "undefined" && !customElements.get(CUSTOM_ELEMENT)) {
  customElements.define(CUSTOM_ELEMENT, DummyBlob);
}
