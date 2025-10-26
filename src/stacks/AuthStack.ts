import {RouteNames} from '../config';
import {
  ForgotPassword,
  LoginScreen,
  OnBoarding,
  ReadBeforeUse,
  OtpScreen,
  RegisterScreen,
  Preferences,
} from '../screens';

type AuthScreenStacksTypes = {
  name: string;
  component: any;
  key: string;
}[];

export const AuthStack: AuthScreenStacksTypes = [
  {
    name: RouteNames.AuthRoutes.OnBoardingScreen,
    component: OnBoarding,
    key: RouteNames.AuthRoutes.OnBoardingScreen,
  },
  {
    name: RouteNames.AuthRoutes.ReadBeforeUse,
    component: ReadBeforeUse,
    key: RouteNames.AuthRoutes.ReadBeforeUse,

  },
  {
    name: RouteNames.AuthRoutes.LoginScreen,
    component: LoginScreen,
    key: RouteNames.AuthRoutes.LoginScreen,
  },
  {
    name: RouteNames.AuthRoutes.ForgotPasswordScreen,
    component: ForgotPassword,
    key: RouteNames.AuthRoutes.ForgotPasswordScreen,
  },
  {
    name: RouteNames.AuthRoutes.OtpScreen,
    component: OtpScreen,
    key: RouteNames.AuthRoutes.OtpScreen,
  },
  {
    name: RouteNames.AuthRoutes.RegisterScreen,
    component: RegisterScreen,
    key: RouteNames.AuthRoutes.RegisterScreen,
  },
];
