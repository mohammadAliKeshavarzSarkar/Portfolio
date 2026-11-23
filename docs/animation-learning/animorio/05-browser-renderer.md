# Lesson 5 browser exercise — optional GPU decoration

**23 November 2026 · Asia/Tehran.** This independently written exercise follows [the rendering lesson](05-rendering-and-fallbacks.md). It renders one decorative triangle to learn resource ownership and failure behavior before adding textures or fluid passes. The plain heading and link remain the content in every mode.

```html
<section class="gpu-study">
  <h2>Evidence before effects</h2>
  <p>A readable heading and ordinary link remain available.</p>
  <a href="#notes">Read the notes</a>
  <canvas width="240" height="120" aria-hidden="true" hidden></canvas>
</section>
<section id="notes"><h2>Notes</h2></section>
```

```css
.gpu-study canvas {
  display: block;
  max-width: 100%;
  pointer-events: none;
}
.gpu-study canvas[hidden] {
  display: none;
}
```

```js
function mountGpuStudy(root, options = {}) {
  const canvas = root.querySelector("canvas");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const originalHidden = canvas.hidden;
  let gl = null,
    program = null,
    buffer = null;
  let shaders = [],
    disposed = false,
    lost = false;
  const counts = { draws: 0, builds: 0, releases: 0 };

  function release() {
    if (gl && !lost) {
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
    buffer = null;
    program = null;
    shaders = [];
    counts.releases++;
    canvas.hidden = true;
  }
  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Shader allocation failed");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error("Shader compilation failed");
    return shader;
  }
  function build() {
    if (disposed || lost || motion.matches) return;
    release();
    try {
      gl = options.getContext
        ? options.getContext(canvas)
        : canvas.getContext("webgl", { alpha: true, antialias: false });
      if (!gl) throw new Error("WebGL unavailable");
      program = gl.createProgram();
      if (!program) throw new Error("Program allocation failed");
      gl.attachShader(
        program,
        compile(
          gl.VERTEX_SHADER,
          "attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}",
        ),
      );
      gl.attachShader(
        program,
        compile(
          gl.FRAGMENT_SHADER,
          "precision mediump float; void main(){gl_FragColor=vec4(0.12,0.45,0.58,1.0);}",
        ),
      );
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Program linking failed");
      buffer = gl.createBuffer();
      if (!buffer) throw new Error("Buffer allocation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-0.8, -0.8, 0.8, -0.8, 0, 0.8]),
        gl.STATIC_DRAW,
      );
      gl.useProgram(program);
      const location = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Drawing failed");
      counts.draws++;
      counts.builds++;
      canvas.hidden = false;
    } catch (error) {
      release();
    }
  }
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      lost = true;
      release();
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      lost = false;
      build();
    },
    { signal: events.signal },
  );
  motion.addEventListener(
    "change",
    () => {
      if (motion.matches) release();
      else build();
    },
    { signal: events.signal },
  );
  build();
  return {
    get counts() {
      return { ...counts };
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      events.abort();
      release();
      canvas.hidden = originalHidden;
    },
  };
}
```

Call `mountGpuStudy(section)` after the markup exists. The optional `getContext` seam is used only to test unavailable/failed initialization. The canvas starts hidden in baseline HTML; failure leaves ordinary text and links available. There is no asynchronous loading or content gate.

This uses WebGL 1 for a minimal shader exercise; the reference fluid simulation requires WebGL2 and floating-point render targets. Passing this exercise does not establish support for those formats. The fixed-size canvas has no responsive drawing-buffer policy: CSS may shrink its visible size, and a later renderer must separately choose DPR and resize behavior.

The renderer owns its canvas context, program, shaders and buffer. Compilation or linking failure releases partially allocated resources. On context loss, handles are discarded without attempting to use the lost context. Restoration creates all resources again. Destroy detaches listeners and releases owned objects; it does not forcibly lose a context that another owner might use.

Reduced motion hides the decoration and releases its resources. Restoring normal motion rebuilds once. This intentionally exercises mode changes even though the triangle is static. There is no RAF loop, automatic animation or offscreen activity; animation pausing belongs to a future moving-renderer exercise.

## Browser verification

Run `node docs/animation-learning/animorio/verify-gpu-browser.cjs`. Tests extract the code above, verify visible/readable DOM fallback when context creation or shader compilation fails, check a real rendered pixel, exercise live reduced-motion changes, simulate context loss/restoration using `WEBGL_lose_context`, and verify disposal prevents later rebuilds.

Chromium in this environment uses software WebGL for these checks. This establishes functional behavior, not hardware GPU speed, mobile compatibility or texture-format support. Phase 5 still needs a real-device quality experiment before any performance claim, and a moving renderer before hidden/offscreen pause behavior can be verified. The fluid solver remains a separate advanced exercise.
