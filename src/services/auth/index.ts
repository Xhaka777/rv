// import httpService from '../https.service';
import httpService from '../https.service'

const userLogin = (body: object) => {
  return httpService().post('_allauth/app/v1/auth/login', body);
};

const getAccessToken = (body: object) => {
  return httpService().post('api/auth/token/', body);
};

const userSignup = (body: object) => {
  return httpService().post('_allauth/app/v1/auth/signup', body);
};

const googleLogin = (body: object) => {
  return httpService().post('accounts/api/google-sign-in/', body);
};

const sendOtp = (body: object) => {
  return httpService().post('accounts/otp/generate-otp/', body);
};

const verifyOtp = (body: object) => {
  return httpService().post('accounts/otp/verify-otp/', body);
};

const resendOTP = (body: object) => {
  return httpService().post('accounts/otp/resend-otp/', body);
};

// NEW: Apple Sign-In endpoint
const appleLogin = (body: object) => {
  return httpService().post('accounts/api/apple-sign-in/', body);
};



export const AuthAPIS = {
  userLogin,
  getAccessToken,
  userSignup,
  googleLogin,
  appleLogin,
  sendOtp,
  resendOTP,
  verifyOtp,
};
