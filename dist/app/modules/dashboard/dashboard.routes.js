"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardRoutes = void 0;
const express_1 = __importDefault(require("express"));
const dashboard_controller_1 = __importDefault(require("./dashboard.controller"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const dashboard_validation_1 = __importDefault(require("./dashboard.validation"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.use((0, auth_1.default)(client_1.Role.SUPER_ADMIN, client_1.Role.COUNSELOR));
router.post('/', (0, validateRequest_1.default)(dashboard_validation_1.default.getDashboardSchema), dashboard_controller_1.default.GetDashboard);
exports.DashboardRoutes = router;
