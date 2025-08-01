"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_controller_1 = require("./user.controller");
const user_validation_1 = __importDefault(require("./user.validation"));
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)();
router.use((0, auth_1.default)(client_1.Role.SUPER_ADMIN, client_1.Role.COUNSELOR));
router.patch('/profile', (0, validateRequest_1.default)(user_validation_1.default.updateProfileSchema), user_controller_1.UserController.UpdateProfile);
router.patch('/profile/picture', upload.single('image'), user_controller_1.UserController.UpdateProfilePicture);
exports.UserRoutes = router;
