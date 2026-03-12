"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const risk_zones_controller_1 = require("../controllers/risk-zones.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/', risk_zones_controller_1.getRiskZones);
exports.default = router;
//# sourceMappingURL=risk-zones.routes.js.map