import { Role } from '@prisma/client';
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import AuthController from './auth.controller';
import AuthValidation from './auth.validation';
import { upload } from '../../utils/handelFile';

const router = express.Router();

router.post(
  '/register',
  validateRequest(AuthValidation.RegisterSchema),
  AuthController.Register,
);

router.post(
  '/login',
  validateRequest(AuthValidation.LoginSchema),
  AuthController.Login,
);

router.post(
  '/forgot-password',
  validateRequest(AuthValidation.ForgotPasswordSchema),
  AuthController.ForgotPassword,
);

router.post(
  '/reset-password',
  validateRequest(AuthValidation.ResetPasswordSchema),
  AuthController.ResetPassword,
);

router.patch(
  '/change-password',
  auth(Role.SUPER_ADMIN, Role.COUNSELOR),
  validateRequest(AuthValidation.ChangePasswordSchema),
  AuthController.ChangePassword,
);

router.get(
  '/me',
  auth(Role.SUPER_ADMIN, Role.COUNSELOR),
  AuthController.GetMyProfile,
);

router.patch(
  '/profile',
  auth(Role.SUPER_ADMIN, Role.COUNSELOR),
  upload.single('profile_picture'),
  validateRequest(AuthValidation.UpdateProfileSchema),
  AuthController.UpdateProfile,
);

router.delete(
  '/profile-picture',
  auth(Role.SUPER_ADMIN, Role.COUNSELOR),
  AuthController.DeleteProfilePicture,
);

export const AuthRoutes = router;
