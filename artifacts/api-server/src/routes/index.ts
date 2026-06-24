import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import clientsRouter from "./clients";
import accountsRouter from "./accounts";
import postsRouter from "./posts";
import shareLinksRouter from "./shareLinks";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(accountsRouter);
router.use(postsRouter);
router.use(shareLinksRouter);
router.use(dashboardRouter);
router.use("/storage", storageRouter);

export default router;
