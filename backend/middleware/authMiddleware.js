import jwt from "jsonwebtoken";
import Restaurant from "../models/Restaurant.js";

export const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Decoded JWT id: \n jwt secret is ", decoded.id,process.env.JWT_SECRET);

    req.restaurant = await Restaurant.findById(decoded.id).select("-password");

    if (!req.restaurant) {
      // console.error("Restaurant not found for decoded id:", decoded.id);
      return res.status(401).json({ message: "Restaurant not found" });
    }

    // console.log("Authenticated restaurant:", req.restaurant.name);
    next();
  } catch (error) {
    // console.error("Auth error:", error.message);
    //   console.log("jwt secret is ",process.env.JWT_SECRET);


    res.status(401).json({ message: "Not authorized, token failed" });
  }
};
