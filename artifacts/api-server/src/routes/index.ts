import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import grantsRouter from "./grants";
import matchesRouter from "./matches";
import applicationsRouter from "./applications";
import anthropicRouter from "./anthropic";
import magicRouter from "./magic";
import battleRouter from "./battle";
import pitchRouter from "./pitch";
import visionRouter from "./vision";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(grantsRouter);
router.use(matchesRouter);
router.use(applicationsRouter);
router.use(anthropicRouter);
router.use(magicRouter);
router.use(battleRouter);
router.use(pitchRouter);
router.use(visionRouter);
router.use(chatRouter);

export default router;
