import type maplibregl from 'maplibre-gl';

const FOOT_PATH_D =
  'M9.271,5.611c-0.418,0.08-0.854-0.347-0.975-0.953c-0.12-0.608,0.121-1.163,0.54-1.24' +
  'C9.255,3.336,9.69,3.764,9.811,4.37C9.933,4.977,9.688,5.53,9.271,5.611z M8.421,5.938c0.011-0.502-0.26-0.916-0.606-0.924' +
  'C7.468,5.007,7.179,5.405,7.168,5.909c-0.012,0.5,0.258,0.914,0.605,0.921C8.117,6.839,8.408,6.44,8.421,5.938z M11.846,3.457' +
  'c-0.001-0.777-0.425-1.407-0.948-1.406c-0.524-0.001-0.95,0.63-0.95,1.407c0,0.775,0.424,1.406,0.949,1.407' +
  'C11.42,4.864,11.846,4.233,11.846,3.457z M6.987,11.449c-0.153,4.592,2.956,6.001,2.956,10.707c0,1.729,1.154,3.643,3.156,3.643' +
  'c2.938,0,3.645-1.597,3.705-3.408c0.113-3.37-3.08-3.753-3.08-6.722c0-3.715,4.094-3.688,4.094-7.062' +
  'c0-2.329-2.031-2.595-3.11-2.595C12.691,6.013,7.141,6.858,6.987,11.449z M18.774,2.668c0.206-1.324-0.347-2.514-1.235-2.654' +
  's-1.775,0.82-1.982,2.145c-0.205,1.323,0.347,2.513,1.236,2.653C17.682,4.953,18.567,3.993,18.774,2.668z M14.778,2.883' +
  'c0.089-0.935-0.357-1.742-1.003-1.805s-1.243,0.645-1.334,1.581c-0.092,0.936,0.356,1.742,1.002,1.805' +
  'C14.088,4.525,14.685,3.818,14.778,2.883z';

const FOOT_VIEWBOX = 25.799;
const ICON_PX = 64;

interface FootStyle {
  fill: string;
  outline: string;
  glow: string;
  glowBlur: number;
}

function rasterizeFoot(mirror: boolean, style: FootStyle): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_PX;
  canvas.height = ICON_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.save();
  if (mirror) {
    ctx.translate(ICON_PX, 0);
    ctx.scale(-1, 1);
  }
  const pad = ICON_PX * 0.16;
  const scale = (ICON_PX - pad * 2) / FOOT_VIEWBOX;
  ctx.translate(pad, pad);
  ctx.scale(scale, scale);

  const path = new Path2D(FOOT_PATH_D);

  ctx.shadowColor = style.glow;
  ctx.shadowBlur = style.glowBlur;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 1.4;
  ctx.lineJoin = 'round';
  ctx.stroke(path);
  ctx.stroke(path);

  ctx.shadowBlur = 0;
  ctx.fillStyle = style.fill;
  ctx.fill(path);

  ctx.strokeStyle = style.outline;
  ctx.lineWidth = 0.7;
  ctx.stroke(path);

  ctx.restore();

  return ctx.getImageData(0, 0, ICON_PX, ICON_PX);
}

export function registerFootprintImages(map: maplibregl.Map): void {
  const styles: Array<[string, boolean, FootStyle]> = [
    ['foot-left-dim', false, { fill: '#0a0a0a', outline: 'rgba(255, 255, 255, 0.8)', glow: 'rgba(255, 255, 255, 0.7)', glowBlur: 4 }],
    ['foot-right-dim', true, { fill: '#0a0a0a', outline: 'rgba(255, 255, 255, 0.8)', glow: 'rgba(255, 255, 255, 0.7)', glowBlur: 4 }],
    ['foot-left-lit', false, { fill: '#000000', outline: '#ffd54a', glow: 'rgba(255, 213, 74, 0.95)', glowBlur: 9 }],
    ['foot-right-lit', true, { fill: '#000000', outline: '#ffd54a', glow: 'rgba(255, 213, 74, 0.95)', glowBlur: 9 }],
  ];

  for (const [name, mirror, style] of styles) {
    if (map.hasImage(name)) continue;
    const img = rasterizeFoot(mirror, style);
    if (img) map.addImage(name, img);
  }
}
