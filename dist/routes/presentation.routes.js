"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const presentation_controller_1 = require("../controllers/presentation.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/', presentation_controller_1.getPresentationModeStatus);
router.post('/toggle', presentation_controller_1.togglePresentationMode);
exports.default = router;
//# sourceMappingURL=presentation.routes.js.map