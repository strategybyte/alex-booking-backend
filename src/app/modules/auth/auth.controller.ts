import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AuthService from './auth.services';
import {
  uploadToSpaces,
  extractKeyFromUrl,
  deleteFromSpaces,
} from '../../utils/handelFile';

const Register = catchAsync(async (req, res) => {
  const result = await AuthService.Register(req.body);

  const { access_token } = result;

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Account created successfully',
    data: {
      access_token,
    },
  });
});

const Login = catchAsync(async (req, res) => {
  const result = await AuthService.Login(req.body);

  const { access_token } = result;

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Login successful',
    data: {
      access_token,
    },
  });
});

const ChangePassword = catchAsync(async (req, res) => {
  await AuthService.ChangePassword(req.body, req.user);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
  });
});

const GetMyProfile = catchAsync(async (req, res) => {
  const result = await AuthService.GetMyProfile(req.user);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'User profile retrieved successfully',
    data: result,
  });
});

const UpdateProfile = catchAsync(async (req, res) => {
  let profilePictureUrl: string | undefined;

  // Handle profile picture upload if provided
  if (req.file) {
    // Get current user to check if they have an existing profile picture
    const currentUser = await AuthService.GetMyProfile(req.user);

    // Delete old profile picture if it exists
    if (currentUser.profile_picture) {
      const oldKey = extractKeyFromUrl(currentUser.profile_picture);
      if (oldKey) {
        try {
          await deleteFromSpaces(oldKey);
        } catch (error) {
          console.error('Failed to delete old profile picture:', error);
        }
      }
    }

    // Upload new profile picture
    const uploadResult = await uploadToSpaces(req.file, {
      folder: 'profile-pictures',
    });
    profilePictureUrl = uploadResult.url;
  }

  const result = await AuthService.UpdateProfile(
    req.body,
    profilePictureUrl,
    req.user,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

const DeleteProfilePicture = catchAsync(async (req, res) => {
  const result = await AuthService.DeleteProfilePicture(req.user);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Profile picture deleted successfully',
    data: result,
  });
});

const ForgotPassword = catchAsync(async (req, res) => {
  const result = await AuthService.ForgotPassword(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
  });
});

const ResetPassword = catchAsync(async (req, res) => {
  const result = await AuthService.ResetPassword(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
  });
});

const AuthController = {
  Login,
  ChangePassword,
  GetMyProfile,
  UpdateProfile,
  DeleteProfilePicture,
  Register,
  ForgotPassword,
  ResetPassword,
};

export default AuthController;
