"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = __importDefault(require("vue"));
const __1 = require("..");
function reset(propOffset) {
    const offset = !propOffset ? "all" : propOffset;
    return {
        ["RESET" /* reset */](state, mod) {
            if (offset && Array.isArray(state[offset])) {
                vue_1.default.set(state, offset, []);
            }
            else {
                // TODO: make this reset to "default state" not empty state
                return Object.keys(state).forEach(p => vue_1.default.set(state, p, __1.initialState[mod][p]));
            }
        }
    };
}
exports.reset = reset;
//# sourceMappingURL=reset.js.map