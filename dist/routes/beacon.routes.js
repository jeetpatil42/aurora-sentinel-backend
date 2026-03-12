"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const beaconAuth_1 = require("../middlewares/beaconAuth");
const beacon_controller_1 = require("../controllers/beacon.controller");
const router = (0, express_1.Router)();
router.post('/sos', beaconAuth_1.authenticateBeacon, beacon_controller_1.createBeaconSOS);
exports.default = router;
//# sourceMappingURL=beacon.routes.js.map