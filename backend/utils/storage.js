import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, "..", "uploads");

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

export const saveBufferToLocal = async (buffer, relativePath) => {
  const rel = relativePath.replace(/^\/+/, "");
  const fullPath = path.join(uploadsRoot, rel);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, buffer);
  return `/uploads/${rel.replace(/\\/g, "/")}`;
};

export const deleteFromLocal = async (relativePath) => {
  const rel = relativePath.replace(/^\/+/, "");
  const fullPath = path.join(uploadsRoot, rel);
  try {
    await fs.unlink(fullPath);
  } catch (_) {
    // ignore missing file
  }
};

export const getRestaurantMenuPath = (restaurantUsername) => {
  return `${restaurantUsername}/menu/`;
};

export const getRestaurantLogoPath = (restaurantUsername) => {
  return `${restaurantUsername}/logo/`;
};
