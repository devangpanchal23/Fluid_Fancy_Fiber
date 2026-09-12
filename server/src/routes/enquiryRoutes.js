import { Router } from "express";
import { createEnquiry, listEnquiries } from "../controllers/enquiryController.js";
import { validateEnquiry } from "../middleware/validateEnquiry.js";

const router = Router();

router.post("/", validateEnquiry, createEnquiry);
router.get("/", listEnquiries);

export default router;
