"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['admin']));
router.get('/security-users', admin_controller_1.listSecurityUsers);
router.patch('/security-users/:id/approve', admin_controller_1.approveSecurityUser);
router.delete('/security-users/:id', admin_controller_1.deleteSecurityUser);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map