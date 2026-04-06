import express from "express";
import { uploadMenuImage } from "../middleware/upload.js";
import { processImage } from "../utils/imageProcessor.js";
import { handleDeleteImage } from "../controllers/imageController.js";
import { protect } from "../middleware/authMiddleware.js";
import Restaurant from "../models/Restaurant.js";

const router = express.Router();

router.post(
  "/restaurants/:restaurantId/menu/upload",
  protect,
  uploadMenuImage.single("image"),
  async (req, res) => {
    try {
      const { restaurantId } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      // Ensure we use the username for the folder structure
      // We can get it from req.restaurant since 'protect' middleware is used
      let restaurantUsername = req.restaurant.username;

      // Fallback if username is not in req.restaurant (though it should be)
      if (!restaurantUsername) {
          const restaurant = await Restaurant.findById(restaurantId);
          restaurantUsername = restaurant.username || restaurantId;
      }

      const imageUrl = await processImage(
        req.file.buffer,
        restaurantUsername,
        req.file.originalname
      );

      res.status(201).json({
        message: "Image uploaded successfully",
        imageUrl,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete('/restaurant/:restaurantId/menu/upload', protect, handleDeleteImage)

export default router;
