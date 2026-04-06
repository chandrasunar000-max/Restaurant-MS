import MenuItem from "../models/MenuItem.js";

// ✅ Create new menu item
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, image, sizes, category, type, spiceLevel, serveTime } = req.body;

    if (!name || !sizes || typeof sizes !== "object") {
      return res.status(400).json({ message: "Invalid menu data" });
    }

    // Enforce plan-based limits: Free plan allows up to 10 items
    const plan = req.restaurant?.plan || "free";
    if (plan === "free") {
      const count = await MenuItem.countDocuments({ restaurant: req.restaurant._id });
      if (count >= 10) {
        return res.status(403).json({ message: "Free plan limit reached (10 items). Upgrade to add more items." });
      }
    }

    const item = await MenuItem.create({
      restaurant: req.restaurant._id,
      name,
      description,
      image,
      sizes,
      category,
      type,
      spiceLevel,
      serveTime: Math.max(1, Number(serveTime) || 15),
    });

    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating menu item:", error);
    res.status(500).json({ message: "Failed to create menu item. Please try again." });
  }
};

// ✅ Get all menu items for the logged-in restaurant (sorted by popularity)
export const getMenuItems = async (req, res) => {
  try {
    const restaurantId = req.restaurant?._id;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant not found" });
    }


    // Build the base query
    const baseQuery = { restaurant: restaurantId };

    let items = await MenuItem.find(baseQuery)
        .sort({ orderCount: -1, createdAt: -1 })
        .lean();


    const transformedItems = items.map(item => ({
      ...item,
      sizes: item.sizes ? (item.sizes instanceof Map ? Object.fromEntries(item.sizes) : item.sizes) : {}
    }));

    res.json(transformedItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({ message: "Failed to fetch menu items. Please try again." });
  }
};



// Toggle loved status for a menu item
