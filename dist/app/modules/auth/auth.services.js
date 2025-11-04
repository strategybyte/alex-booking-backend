"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = __importDefault(require("../../config"));
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const prisma_1 = __importDefault(require("../../utils/prisma"));
const auth_utils_1 = __importDefault(require("./auth.utils"));
const handelFile_1 = require("../../utils/handelFile");
const Register = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, name } = payload;
    const existingUser = yield prisma_1.default.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'User already exists');
    }
    const hashedPassword = yield bcrypt_1.default.hash(password, Number(config_1.default.bcrypt_salt_rounds));
    const result = yield prisma_1.default.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
        },
    });
    const jwtPayload = {
        id: result.id,
        email: result.email,
        role: result.role,
    };
    const access_token = auth_utils_1.default.CreateToken(jwtPayload, config_1.default.jwt_access_token_secret, config_1.default.jwt_access_token_expires_in);
    return { access_token };
});
const Login = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.default.user.findFirst({
        where: { email: payload.email },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'No user found with this email');
    }
    const isPasswordMatched = yield bcrypt_1.default.compare(payload.password, user.password);
    if (!isPasswordMatched) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, 'Invalid email or password');
    }
    const jwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
    };
    const access_token = auth_utils_1.default.CreateToken(jwtPayload, config_1.default.jwt_access_token_secret, config_1.default.jwt_access_token_expires_in);
    return { access_token };
});
const ChangePassword = (payload, user) => __awaiter(void 0, void 0, void 0, function* () {
    const isUserValid = yield prisma_1.default.user.findFirst({
        where: { id: user.id },
    });
    if (!isUserValid) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'No user found');
    }
    const isPasswordMatched = yield bcrypt_1.default.compare(payload.old_password, isUserValid.password);
    if (!isPasswordMatched) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, 'Invalid password');
    }
    const hashedPassword = yield bcrypt_1.default.hash(payload.new_password, Number(config_1.default.bcrypt_salt_rounds));
    yield prisma_1.default.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
    });
});
const GetMyProfile = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const userProfile = yield prisma_1.default.user.findUnique({
        where: { id: user.id, email: user.email },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            profile_picture: true,
            specialization: true,
            created_at: true,
        },
    });
    if (!userProfile) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    }
    if (userProfile.role === 'COUNSELOR') {
        const counselorSettings = yield prisma_1.default.counselorSettings.findUnique({
            where: { counselor_id: user.id },
            select: {
                minimum_slots_per_day: true,
            },
        });
        return Object.assign(Object.assign({}, userProfile), { minimum_slots_per_day: (counselorSettings === null || counselorSettings === void 0 ? void 0 : counselorSettings.minimum_slots_per_day) || 6 });
    }
    return userProfile;
});
const UpdateProfile = (payload, profilePicture, user) => __awaiter(void 0, void 0, void 0, function* () {
    const userExists = yield prisma_1.default.user.findUnique({
        where: { id: user.id },
    });
    if (!userExists) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    }
    const updateData = {};
    if (payload.name !== undefined) {
        updateData.name = payload.name;
    }
    if (payload.specialization !== undefined) {
        updateData.specialization = payload.specialization;
    }
    if (profilePicture !== undefined) {
        updateData.profile_picture = profilePicture;
    }
    const updatedUser = yield prisma_1.default.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            profile_picture: true,
            specialization: true,
            created_at: true,
        },
    });
    if (updatedUser.role === 'COUNSELOR') {
        const counselorSettings = yield prisma_1.default.counselorSettings.findUnique({
            where: { counselor_id: user.id },
            select: {
                minimum_slots_per_day: true,
            },
        });
        return Object.assign(Object.assign({}, updatedUser), { minimum_slots_per_day: (counselorSettings === null || counselorSettings === void 0 ? void 0 : counselorSettings.minimum_slots_per_day) || 6 });
    }
    return updatedUser;
});
const DeleteProfilePicture = (user) => __awaiter(void 0, void 0, void 0, function* () {
    const userExists = yield prisma_1.default.user.findUnique({
        where: { id: user.id },
    });
    if (!userExists) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    }
    if (!userExists.profile_picture) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'No profile picture to delete');
    }
    const key = (0, handelFile_1.extractKeyFromUrl)(userExists.profile_picture);
    if (key) {
        try {
            yield (0, handelFile_1.deleteFromSpaces)(key);
        }
        catch (error) {
            console.error('Failed to delete profile picture from storage:', error);
        }
    }
    const updatedUser = yield prisma_1.default.user.update({
        where: { id: user.id },
        data: { profile_picture: null },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            profile_picture: true,
            specialization: true,
            created_at: true,
        },
    });
    if (updatedUser.role === 'COUNSELOR') {
        const counselorSettings = yield prisma_1.default.counselorSettings.findUnique({
            where: { counselor_id: user.id },
            select: {
                minimum_slots_per_day: true,
            },
        });
        return Object.assign(Object.assign({}, updatedUser), { minimum_slots_per_day: (counselorSettings === null || counselorSettings === void 0 ? void 0 : counselorSettings.minimum_slots_per_day) || 6 });
    }
    return updatedUser;
});
const AuthService = {
    Register,
    Login,
    ChangePassword,
    GetMyProfile,
    UpdateProfile,
    DeleteProfilePicture,
};
exports.default = AuthService;
