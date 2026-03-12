"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/alerts/week', analytics_controller_1.getWeeklyAlerts);
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map