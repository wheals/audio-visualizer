import { Canvas, CanvasRenderingContext2D, createCanvas } from 'canvas';

interface Size {
  width: number;
  height: number;
}

const drawBackground = (ctx: CanvasRenderingContext2D, size: Size) => {
  const step = (size.width - 20) / 25;
  const height = Math.trunc(size.height / 6);

  const gradient = ctx.createRadialGradient(size.width / 2, size.height / 2, 0, size.width / 2, size.height / 2, size.width / 2);
  gradient.addColorStop(0, "#7C2492");
  gradient.addColorStop(1, "#333B60");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.fillStyle = "#639CB9";
  ctx.font = Math.trunc(height / 2) + "px sans-serif";
  ctx.fillText("Song name", step, Math.trunc(height * 2 / 3));
  ctx.fillStyle = '#736DA9';
  ctx.beginPath();
  for (let x = 10; x < size.width; x += step) {
    for (let y = height; y < size.height - height; y += step) {
      ctx.moveTo(x, y);
      ctx.arc(x, y, 2, 0, Math.PI*2);
    }
  }
  ctx.fill();
};

const drawSpectrum = (ctx: CanvasRenderingContext2D, spectrum: number[], size: Size) => {
  // Smooth out the spectrum to avoid the huge peak at the bass
  spectrum = [0, ...spectrum];
  spectrum = spectrum.map(x => Math.trunc(size.height * x/3));
  const busWidth = size.width / spectrum.length;
  const halfWidth = Math.trunc(size.width / spectrum.length / 2);
  const center = Math.trunc(size.height / 2);

  const rainbow = ctx.createLinearGradient(0, 0, size.width, 0);
  rainbow.addColorStop(0, "#7FEFFD");
  //rainbow.addColorStop(0.5, "#00FF00");
  rainbow.addColorStop(1, "#EA59F7");
  ctx.fillStyle = rainbow;

  ctx.beginPath();
  ctx.moveTo(0, center);
  let prevy = center;
  let newx = halfWidth;
  for (let spectrumX = 0; spectrumX < spectrum.length; spectrumX++) {
    const newy = center - spectrum[spectrumX];
    ctx.bezierCurveTo(newx - halfWidth, prevy, newx - halfWidth, newy, newx, newy);
    prevy = newy;
    newx += busWidth;
  }
  ctx.bezierCurveTo(newx - halfWidth, prevy, newx - halfWidth, center, newx, center);
  prevy = center;
  for (let spectrumX = spectrum.length - 1; spectrumX >= 0; spectrumX--) {
    newx -= busWidth;
    const newy = center + spectrum[spectrumX];
    ctx.bezierCurveTo(newx + halfWidth, prevy, newx + halfWidth, newy, newx, newy);
    prevy = newy;
  }
  ctx.bezierCurveTo(0, prevy, 0, center, 0, center);
  ctx.fill();
  const darker = ctx.createLinearGradient(0, 0, 0, size.height);
  darker.addColorStop(0.2, "rgba(0, 0, 0, 0.7)");
  darker.addColorStop(.47, "rgba(0, 0, 0, 0)");
  darker.addColorStop(.53, "rgba(0, 0, 0, 0)");
  darker.addColorStop(.8, "rgba(0, 0, 0, 0.7)");
  ctx.fillStyle = darker;
  ctx.fill();
};

export const createVisualizerFrame = (spectrum: number[], size: Size) => {
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d');
  ctx.patternQuality = 'fast';
  ctx.quality = 'fast';
  //ctx.drawImage(img, 0, 0);
  drawBackground(ctx, size);
  drawSpectrum(ctx, spectrum, size);
  return canvas.toBuffer("raw");
};
