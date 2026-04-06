import express from "express";
const { protect } = await import("../middleware/authMiddleware.js");
// import { registerRestaurant, loginRestaurant } from "../controllers/restaurantController.js";
import { registerRestaurant, loginRestaurant, getMe, updateMe, requestRestaurantPasswordReset, resetRestaurantPassword, requestRestaurantPasswordOtp, resetRestaurantPasswordWithOtp, testSendMail, verifyRegistrationOtp, resendRegistrationOtp, sendContactEmail, checkUsername, updateMyLogo, updateMyPushToken } from "../controllers/restaurantController.js";
import { getMenuItems } from "../controllers/menuControllers.js";
import { uploadLogo } from "../middleware/upload.js";

const router = express.Router();

router.post("/signup", uploadLogo.single('image'), registerRestaurant);
router.post("/login", loginRestaurant);
router.post("/password/forgot", requestRestaurantPasswordReset);
router.post("/password/reset", resetRestaurantPassword);
router.post("/password/forgot-otp", requestRestaurantPasswordOtp);
router.post("/password/reset-otp", resetRestaurantPasswordWithOtp);
router.post('/verify-registration-otp', verifyRegistrationOtp);
router.post('/resend-registration-otp', resendRegistrationOtp);
// Dev-only route to test sending emails
router.post('/test-mail', testSendMail);
// Public contact form endpoint — forwards message to configured contact email
router.post('/contact', sendContactEmail);
router.get("/check-username/:username", checkUsername);
router.get("/me",protect,getMe);
router.put("/me", protect, updateMe);
router.post("/me/logo", protect, uploadLogo.single('logo'), updateMyLogo);
router.post("/me/push-token", protect, updateMyPushToken);
router.get("/menu", protect, getMenuItems);

export default router;
