"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeBgApiKey = void 0;
const params_1 = require("firebase-functions/params");
exports.removeBgApiKey = (0, params_1.defineSecret)('REMOVE_BG_API_KEY');
