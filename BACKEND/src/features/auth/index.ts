export { register } from "./registrationController";
export { forgotPassword, resetPassword } from "./passwordController";
export { login, logout, getCurrentUser } from "./sessionController";
export { verifyOTP, resendOTP } from "./verificationController";
export { updateProfile, deleteAccount } from "./profileController";
export { updateProfilePhoto, deleteProfilePhoto } from "./profilePhotoController";
export { googleAuthCallback } from "./googleAuthController";
