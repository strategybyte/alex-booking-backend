import express from 'express';
import { Role } from '@prisma/client';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import UserValidation from './user.validation';
import multer from 'multer';

const router = express.Router();
const upload = multer();

// Routes that require SUPER_ADMIN access only
router.post(
  '/create-counselor',
  auth(Role.SUPER_ADMIN),
  validateRequest(UserValidation.createCounselorSchema),
  UserController.CreateCounselor,
);

router.get('/counselors', auth(Role.SUPER_ADMIN), UserController.GetCounselors);

router.get('/all-users', auth(Role.SUPER_ADMIN), UserController.GetAllUsers);

router.get(
  '/counselors/:counselorId',
  auth(Role.SUPER_ADMIN),
  UserController.GetCounselorById,
);

router.patch(
  '/counselors/:counselorId/settings',
  auth(Role.SUPER_ADMIN),
  validateRequest(UserValidation.updateCounselorSettingsSchema),
  UserController.UpdateCounselorSettings,
);

router.patch(
  '/counselors/:counselorId',
  auth(Role.SUPER_ADMIN),
  validateRequest(UserValidation.updateCounselorSchema),
  UserController.UpdateCounselor,
);

// Routes that require SUPER_ADMIN or COUNSELOR access
router.use(auth(Role.SUPER_ADMIN, Role.COUNSELOR));

router.patch(
  '/profile',
  validateRequest(UserValidation.updateProfileSchema),
  UserController.UpdateProfile,
);

router.patch(
  '/profile/picture',
  upload.single('image'),
  UserController.UpdateProfilePicture,
);

export const UserRoutes = router;
