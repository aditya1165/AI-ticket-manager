import express from "express";
import { authenticate } from "../middlewares/auth.js";
import { createRequest, listRequests, decideRequest,getMyRequest} from "../controllers/moderatorRequest.js";

const router = express.Router();

router.post("/", authenticate, createRequest);
router.get("/", authenticate, listRequests);
router.get("/me", authenticate, getMyRequest);
router.post("/:id/decide", authenticate, decideRequest);

export default router;
