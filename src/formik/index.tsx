import * as Yup from 'yup';

const phoneRegex =
  /^(\+?\d{1,4}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}$/;
const emailRegex =
  /^[A-Za-z0-9._%+-]*[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const fullNameRegex = /^[A-Za-z\s]+$/;

const SignupSchema = Yup.object().shape({
  firstName: Yup.string()
    .min(3, 'Too Short!')
    .max(50, 'Too Long!')
    .matches(fullNameRegex, 'Invalid name')
    .required('Please enter your full name.'),

  lastName: Yup.string()
    .min(3, 'Too Short!')
    .max(50, 'Too Long!')
    .matches(fullNameRegex, 'Invalid name')
    .required('Please enter your full name.'),
  email: Yup.string()
    .matches(emailRegex, 'Invalid email')
    .required('Please enter your email address.'),

  phoneNumber: Yup.string()
    .matches(phoneRegex, 'Invalid phone number')
    .required('Please enter your phone number.'),

  password: Yup.string()
    .min(8)
    .required('Please enter your password.')
    .matches(
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,
      'Please enter a valid password that contains at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character (e.g., Password@123).',
    ),
});

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .matches(emailRegex, 'Invalid email')
    .required('Please enter your email address.'),
  password: Yup.string().required('Please enter your password.'),
});

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .matches(emailRegex, 'Invalid email')
    .required('Please enter your email address.'),
});

const ResetPasswordSchema = Yup.object().shape({
  password: Yup.string()
    .min(8)
    .required('Please enter your password.')
    .matches(
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,
      'Please enter a valid password that contains at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character (e.g., Password@123).',
    ),
  confirmPassword: Yup.string()
    .min(8, 'Confirm Password must be atleast 8 characters long.')
    .required('Please enter your confirm password.')
    .oneOf([Yup.ref('password')], 'Please enter same password.'),
});

const GoogleSignUpSchema = Yup.object().shape({
  name: Yup.string().required('Please enter your email address.'),
  email: Yup.string()
    .matches(emailRegex, 'Invalid email')
    .required('Please enter your email address.'),
  // password: Yup.string().required('Please enter your password.'),
});

const ChangePasswordSchema = Yup.object().shape({
  oldPassword: Yup.string()
    // .min(8, 'Old Password must be atleast 8 characters long.')
    .required('Please enter your old password.'),
  password: Yup.string()
    .min(8)
    .required('Please enter your password.')
    .matches(
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/,
      'Please enter a valid password that contains at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character (e.g., Password@123).',
    ),
  confirmPassword: Yup.string()
    .min(8, 'Confirm Password must be atleast 8 characters long.')
    .required('Please enter your confirm password.')
    .oneOf([Yup.ref('password')], 'Please enter same password.'),
});

export default {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ChangePasswordSchema,
  ResetPasswordSchema,
  GoogleSignUpSchema,
};
