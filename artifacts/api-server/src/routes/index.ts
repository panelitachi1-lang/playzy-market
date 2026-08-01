import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import listingsRouter from "./listings";
import messagesRouter from "./messages";
import statsRouter from "./stats";
import adminRouter from "./admin";
import balanceRouter from "./balance";
import reviewsRouter from "./reviews";
import pinsRouter from "./pins";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(listingsRouter);
router.use(messagesRouter);
router.use(statsRouter);
router.use(adminRouter);
router.use(balanceRouter);
router.use(reviewsRouter);
router.use(pinsRouter);

export default router;
