import MenuItem from "../models/MenuItem.js";

/**
 * Reset orderCount for all menu items across all restaurants
 * This runs every 2 months to reflect seasonal changes in popularity
 */
export const resetOrderCount = async () => {
  try {
    const result = await MenuItem.updateMany(
      { orderCount: { $gt: 0 } }, // Only update items that have counts > 0
      { $set: { orderCount: 0 } }
    );

    
    // console.log(`✅ Order count reset completed. Modified ${result.modifiedCount} menu items across all restaurants.`);
    return result;
  } catch (error) {
    console.error("❌ Failed to reset order count:", error);
    throw error;
  }
};

/**
 * Schedule the reset job
 * Runs on the 1st day of every odd month at 2 AM (January, March, May, July, September, November)
 */
export const scheduleOrderCountReset = () => {
  // Check if it's time to reset (1st day of odd months)
  const checkAndReset = async () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth(); // 0-11
    const hour = now.getHours();
    
    // Reset on 1st day of odd months (Jan=0, Mar=2, May=4, Jul=6, Sep=8, Nov=10)
    // at 2 AM to avoid peak hours
    if (day === 1 && month % 2 === 0 && hour === 2) {
      console.log(`🔄 Starting scheduled order count reset for month ${month + 1}...`);
      await resetOrderCount();
    }
  };
  
  // Check every hour
  const HOUR_IN_MS = 60 * 60 * 1000;
  setInterval(checkAndReset, HOUR_IN_MS);
  
  // Also check immediately on startup
  checkAndReset();
  
  console.log("⏰ Order count reset scheduler initialized (runs every 2 months on 1st at 2 AM)");
};
