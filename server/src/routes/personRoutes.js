import { Router } from "express";
import { listPersons, getPerson, createPerson, updatePerson, reorderPerson, deletePerson } from "../controllers/personController.js";
import { requireAdmin, attachAdminIfPresent } from "../middleware/auth.js";

const router = Router();

router.get("/", attachAdminIfPresent, listPersons);
router.get("/:id", attachAdminIfPresent, getPerson);
router.post("/", requireAdmin, createPerson);
router.put("/:id", requireAdmin, updatePerson);
router.put("/:id/reorder", requireAdmin, reorderPerson);
router.delete("/:id", requireAdmin, deletePerson);

export default router;
