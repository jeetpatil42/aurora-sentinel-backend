"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/register', auth_controller_1.register);
router.post('/verify', auth_controller_1.verify);
router.post('/login', auth_controller_1.login);
router.post('/create-local-user', auth_controller_1.createLocalUser);
router.get('/me', auth_1.authenticateToken, auth_controller_1.me);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map