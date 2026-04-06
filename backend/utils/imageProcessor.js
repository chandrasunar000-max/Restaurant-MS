import sharp from "sharp";
import {
  saveBufferToLocal,
  getRestaurantMenuPath,
} from "./storage.js";

export const processImage = async (
  buffer,
  restaurantUsername,
  originalName
) => {
  // 🏷️ clean filename
  const filename = `menu_${Date.now()}.webp`;
  const key = `${getRestaurantMenuPath(restaurantUsername)}${filename}`;

  const processedBuffer = await sharp(buffer)
    .resize(400)               // menu size
    .webp({ quality: 70 })     // compression
    .toBuffer();

  const imageUrl = await saveBufferToLocal(processedBuffer, key);

  return imageUrl;
};
