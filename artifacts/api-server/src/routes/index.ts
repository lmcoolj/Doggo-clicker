import { Router, type IRouter } from "express";
import healthRouter from "./health";
import goldenEventRouter from "./golden-event";

const router: IRouter = Router();

router.use(healthRouter);
router.use(goldenEventRouter);

export default router;
