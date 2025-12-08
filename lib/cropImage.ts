import { createCanvas, loadImage } from "canvas";

export async function cropImageToAvatar(imageUrl: string, crop: any, zoom: number, rotation: number) {
  const image = await loadImage(imageUrl);

  const canvas = createCanvas(crop.width, crop.height);
  const ctx = canvas.getContext("2d");

  const scale = zoom;

  const centerX = image.width / 2;
  const centerY = image.height / 2;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(
    image,
    -centerX,
    -centerY,
    image.width,
    image.height
  );

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  return canvas.toBuffer("image/jpeg");
}
