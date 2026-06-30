import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import kaneRouter from "./kane";
import transactionsRouter from "./transactions";
import loansRouter from "./loans";
import partnersRouter from "./partners";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/kane", kaneRouter);
router.use("/transactions", transactionsRouter);
router.use("/loans", loansRouter);
router.use("/partners", partnersRouter);
router.use("/admin", adminRouter);

export default router;
