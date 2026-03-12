"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const sos_controller_1 = require("../controllers/sos.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/', sos_controller_1.createSOS);
router.get('/recent/chat', sos_controller_1.getRecentSOSChat);
router.get('/', sos_controller_1.getSOS);
router.get('/:id/events', sos_controller_1.getSOSEventHistoryController); // Must be before /:id route
router.get('/:id/chat', sos_controller_1.getSOSChatById);
router.post('/:id/chat/messages', sos_controller_1.sendSOSChatMessage);
router.get('/:id', sos_controller_1.getSOSById);
router.patch('/:id/status', sos_controller_1.updateStatus);
router.delete('/history', sos_controller_1.clearHistory);
exports.default = router;
//# sourceMappingURL=sos.routes.js.map