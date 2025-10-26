import {StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {
  AuthHeader,
  BackHeader,
  CustomInput,
  MainContainer,
  PrimaryButton,
} from '../../../components';
import {Formik} from 'formik';
import Schema from '../../../formik';
import {Metrix, NavigationService, RouteNames} from '../../../config';
import {ForgotPasswordProps} from '../../propTypes';
import {useDispatch} from 'react-redux';
import {AuthActions} from '../../../redux/actions';

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({}) => {
  const dispatch = useDispatch();

  return (
    <Formik
      initialValues={{
        email: '',
      }}
      onSubmit={value => {
        // dispatch(
        //   AuthActions.setForgotPassword({
        //     email: value?.email?.toLocaleLowerCase(),
        //   }),
        // );
        // NavigationService.navigate(RouteNames.AuthRoutes.ChangePasswrod, {
        //   email: value?.email,
        // });
      }}
      validationSchema={Schema.ForgotPasswordSchema}>
      {({
        values,
        errors,
        touched,
        handleChange,
        setFieldTouched,
        isValid,
        handleSubmit,
      }) => (
        <AuthHeader
          heading="Forgot Password"
          paragraph="Enter your email address, we will send you a reset link to your email"
          showBackHeader={true}
          isBtn
          title={'Send'}
          customStyles={{marginTop: Metrix.VerticalSize(20)}}
          // disabled={!isValid}
          onPress={handleSubmit}>
          <CustomInput
            heading="Enter your email"
            placeholder="Enter Email"
            value={values?.email}
            onChangeText={handleChange('email')}
            onBlur={() => setFieldTouched('email')}
            error={errors?.email}
            touched={touched?.email}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {/* <PrimaryButton
            title={'NEXT'}
            customStyles={{marginTop: Metrix.VerticalSize(20)}}
            disabled={!isValid}
            onPress={handleSubmit}
          /> */}
        </AuthHeader>
      )}
    </Formik>
  );
};

interface ForgotPasswordStyles {}
const styles = StyleSheet.create<ForgotPasswordStyles>({});
