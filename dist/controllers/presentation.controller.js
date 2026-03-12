"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePresentationMode = exports.getPresentationModeStatus = void 0;
const config_1 = require("../presentation/config");
const getPresentationModeStatus = async (req, res) => {
    try {
        const enabled = (0, config_1.getPresentationMode)();
        res.json({ enabled });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getPresentationModeStatus = getPresentationModeStatus;
const togglePresentationMode = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { enabled, password } = req.body;
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: 'enabled must be a boolean' });
            return;
        }
        if (!password) {
            res.status(400).json({ error: 'Password required' });
            return;
        }
        const success = (0, config_1.setPresentationMode)(enabled, password);
        if (!success) {
            res.status(401).json({ error: 'Invalid password' });
            return;
        }
        res.json({ enabled, message: 'Presentation mode updated successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.togglePresentationMode = togglePresentationMode;
//# sourceMappingURL=presentation.controller.js.map