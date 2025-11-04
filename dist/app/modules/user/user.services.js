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
exports.UserService = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const path_1 = __importDefault(require("path"));
const handelFile_1 = require("../../utils/handelFile");
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = __importDefault(require("../../config"));
const user_utils_1 = __importDefault(require("./user.utils"));
const mailer_1 = __importDefault(require("../../utils/mailer"));
const pagination_1 = __importDefault(require("../../utils/pagination"));
const user_constant_1 = require("./user.constant");
const UpdateProfilePicture = (id, file) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.default.user.findUnique({
        where: { id, is_deleted: false },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    }
    let profilePicture = user.profile_picture || null;
    try {
        if (user.profile_picture) {
            const key = (0, handelFile_1.extractKeyFromUrl)(user.profile_picture);
            if (key) {
                yield (0, handelFile_1.deleteFromSpaces)(key);
            }
        }
        const uploadResult = yield (0, handelFile_1.uploadToSpaces)(file, {
            folder: 'profile-pictures',
            filename: `profile_picture_${Date.now()}${path_1.default.extname(file.originalname)}`,
        });
        profilePicture = (uploadResult === null || uploadResult === void 0 ? void 0 : uploadResult.url) || null;
    }
    catch (error) {
        console.log('Error from DigitalOcean Spaces while uploading profile picture', error);
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'Failed to upload profile picture');
    }
    const result = yield prisma_1.default.user.update({
        where: { id },
        data: { profile_picture: profilePicture },
        select: {
            id: true,
            name: true,
            email: true,
            specialization: true,
            profile_picture: true,
            role: true,
            created_at: true,
            updated_at: true,
        },
    });
    return result;
});
const UpdateUserProfile = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.default.user.findUnique({
        where: { id, is_deleted: false },
    });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    }
    const result = yield prisma_1.default.user.update({
        where: { id },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            specialization: true,
            profile_picture: true,
            role: true,
            created_at: true,
            updated_at: true,
        },
    });
    return result;
});
const CreateCounselor = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, specialization } = payload;
    const existingUser = yield prisma_1.default.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new AppError_1.default(http_status_1.default.CONFLICT, 'User with this email already exists');
    }
    const randomPassword = user_utils_1.default.generateRandomPassword();
    const hashedPassword = yield bcrypt_1.default.hash(randomPassword, Number(config_1.default.bcrypt_salt_rounds));
    const newCounselor = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const counselor = yield tx.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: client_1.Role.COUNSELOR,
                specialization: specialization || null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                specialization: true,
                role: true,
                created_at: true,
                updated_at: true,
            },
        });
        yield tx.counselorSettings.create({
            data: {
                counselor_id: counselor.id,
                minimum_slots_per_day: 6,
            },
        });
        return counselor;
    }));
    Promise.resolve().then(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const emailTemplate = user_utils_1.default.createCounselorEmailTemplate(name, email, randomPassword);
            yield (0, mailer_1.default)(email, 'Welcome to Alexander Rodriguez Counseling - Your Account Credentials', emailTemplate);
            console.log(`Welcome email sent successfully to ${email}`);
        }
        catch (error) {
            console.error(`Failed to send welcome email to ${email}:`, error);
        }
    }));
    return newCounselor;
});
const GetCounselors = (filters, paginationOptions) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sort_by, sort_order } = (0, pagination_1.default)(paginationOptions);
    const { search } = filters;
    const whereConditions = {
        role: client_1.Role.COUNSELOR,
        is_deleted: false,
    };
    if (search) {
        whereConditions.OR = user_constant_1.counselorSearchableFields.map((field) => ({
            [field]: {
                contains: search,
                mode: 'insensitive',
            },
        }));
    }
    const orderBy = {};
    if (sort_by === 'name') {
        orderBy.name = sort_order;
    }
    else if (sort_by === 'email') {
        orderBy.email = sort_order;
    }
    else {
        orderBy.created_at = sort_order;
    }
    const total = yield prisma_1.default.user.count({
        where: whereConditions,
    });
    const counselors = yield prisma_1.default.user.findMany({
        where: whereConditions,
        select: {
            id: true,
            name: true,
            email: true,
            specialization: true,
            role: true,
            created_at: true,
            updated_at: true,
        },
        orderBy,
        skip,
        take: limit,
    });
    return {
        data: counselors,
        meta: {
            total,
            page,
            limit,
        },
    };
});
const UpdateCounselorSettings = (counselorId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const counselor = yield prisma_1.default.user.findUnique({
        where: { id: counselorId },
    });
    if (!counselor) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, 'Counselor not found');
    }
    if (counselor.role !== client_1.Role.COUNSELOR) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, 'User is not a counselor');
    }
    const updatedSettings = yield prisma_1.default.counselorSettings.upsert({
        where: { counselor_id: counselorId },
        update: {
            minimum_slots_per_day: payload.minimum_slots_per_day,
        },
        create: {
            counselor_id: counselorId,
            minimum_slots_per_day: payload.minimum_slots_per_day,
        },
    });
    return updatedSettings;
});
exports.UserService = {
    UpdateProfilePicture,
    UpdateUserProfile,
    CreateCounselor,
    GetCounselors,
    UpdateCounselorSettings,
};
