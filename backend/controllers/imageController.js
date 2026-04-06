import { deleteFromLocal, getRestaurantMenuPath } from "../utils/storage.js";
import Restaurant from "../models/Restaurant.js";

export const handleDeleteImage = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { imageName } = req.body; // Assuming this is just the filename, not full path

    if (!imageName) {
      return res.status(400).json({
        success: false,
        message: "Image name is required",
      });
    }

    // Get restaurant username for the key
    let restaurantUsername = req.restaurant?.username;
    if (!restaurantUsername) {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: "Restaurant not found" });
        }
        restaurantUsername = restaurant.username;
    }

    // Full S3 key
    const key = `${getRestaurantMenuPath(restaurantUsername)}${imageName}`;

    await deleteFromLocal(key);

    res.status(200).json({
      success: true,
      message: "Menu image deleted successfully",
    });

  } catch (error) {
    console.error("Image delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
    });
  }
};
