"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const CreateToken = (jwtPayload, secret, expiresIn) => {
    // @ts-expect-error - jwt.sign is not typed
    return jsonwebtoken_1.default.sign(jwtPayload, secret, {
        expiresIn,
    });
};
const VerifyToken = (token, secret) => {
    return jsonwebtoken_1.default.verify(token, secret);
};
const AuthUtils = { CreateToken, VerifyToken };
exports.default = AuthUtils;
