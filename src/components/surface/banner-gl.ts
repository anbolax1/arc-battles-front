/* Вывод ткани на экран: складки светлеют и темнеют, с боков - отсвет двух прожекторов арены. */

import { BANNER_H, BANNER_W } from "@/components/surface/banner-art";
import type { Cloth } from "@/components/surface/banner-physics";

/** Поля холста вокруг полотна: туда ткань улетает на ветру. Совпадают со стилями. */
export const PAD_X = 48;
export const PAD_BOTTOM = 52;

const VERTEX = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform vec2 uSize;
uniform vec2 uCenter;
uniform float uPad;
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  float k = 900.0 / (900.0 - aPos.z);
  vec2 p = uCenter + (aPos.xy - uCenter) * k + vec2(uPad, 0.0);
  vUv = aUv;
  vNormal = aNormal;
  gl_Position = vec4(p.x / uSize.x * 2.0 - 1.0, 1.0 - p.y / uSize.y * 2.0, -aPos.z / 600.0, 1.0);
}`;

// Ровная ткань выходит ровно цветом рисунка: считается только отличие от плоскости.
const FRAGMENT = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vec4 c = texture2D(uTex, vUv);
  if (c.a < 0.02) discard;
  vec3 n = normalize(vNormal);
  vec3 light = normalize(vec3(-0.5, -0.42, 0.76));
  vec3 half_ = normalize(light + vec3(0.0, 0.0, 1.0));
  float shade = clamp(1.0 + (dot(n, light) - light.z) * 1.05, 0.42, 1.45);
  float shine = max(pow(max(dot(n, half_), 0.0), 20.0) - pow(half_.z, 20.0), 0.0);
  vec3 color = c.rgb * shade;
  color += vec3(0.50, 0.93, 0.90) * max(-n.x, 0.0) * 0.17 * c.a;
  color += vec3(0.98, 0.81, 0.04) * max(n.x, 0.0) * 0.17 * c.a;
  color += vec3(1.0, 0.95, 0.82) * shine * 0.32 * c.a;
  gl_FragColor = vec4(color, c.a);
}`;

export interface ClothView {
  draw: () => void;
  dispose: () => void;
}

/** null - трёхмерная графика недоступна, знамя показывается ровной картинкой. */
export function createClothView(canvas: HTMLCanvasElement, cloth: Cloth, texture: HTMLCanvasElement): ClothView | null {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true });
  if (!gl || gl.isContextLost()) return null;

  const program = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const attribute = (name: string, size: number, data: Float32Array, usage: number) => {
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return buffer;
  };
  const pos = attribute("aPos", 3, cloth.pos, gl.DYNAMIC_DRAW);
  const normal = attribute("aNormal", 3, cloth.normals, gl.DYNAMIC_DRAW);
  const uv = attribute("aUv", 2, cloth.uv, gl.STATIC_DRAW);
  const index = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cloth.index, gl.STATIC_DRAW);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.uniform2f(gl.getUniformLocation(program, "uSize"), BANNER_W + PAD_X * 2, BANNER_H + PAD_BOTTOM);
  gl.uniform2f(gl.getUniformLocation(program, "uCenter"), BANNER_W / 2, BANNER_H / 3);
  gl.uniform1f(gl.getUniformLocation(program, "uPad"), PAD_X);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return {
    draw() {
      cloth.updateNormals();
      gl.bindBuffer(gl.ARRAY_BUFFER, pos);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, cloth.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, normal);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, cloth.normals);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, cloth.index.length, gl.UNSIGNED_SHORT, 0);
    },
    dispose() {
      [pos, normal, uv, index].forEach((b) => gl.deleteBuffer(b));
      gl.deleteTexture(tex);
      gl.deleteProgram(program);
      // браузер держит около 16 таких холстов: ушедший со страницы освобождаем сразу
      if (!canvas.isConnected) gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
