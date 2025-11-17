import { ActionSheetIOS, StyleSheet, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import {
  BackHeader,
  CustomInput,
  CustomText,
  Loader,
  MainContainer,
  PrimaryButton,
  ProfileHeader,
  ScrollableContainer,
} from '../../../components';
import { Fonts, Metrix, Utills } from '../../../config';
import { EditProfileProps } from '../../propTypes';
import ImagePicker from 'react-native-image-crop-picker';
import _ from 'lodash';
import { RootState } from '../../../redux/reducers';
import { useDispatch, useSelector } from 'react-redux';
import { HomeActions } from '../../../redux/actions';
import { HomeAPIS } from '../../../services/home';

// Validation functions
const validateName = (name: string): { isValid: boolean; error: string } => {
  const trimmedName = name?.trim() || '';

  if (!trimmedName) {
    return { isValid: false, error: 'Name is required' };
  }

  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }

  if (trimmedName.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }

  // Check for numbers or special characters (allow spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  // Check for excessive spaces
  if (trimmedName.includes('  ')) {
    return { isValid: false, error: 'Name cannot contain multiple consecutive spaces' };
  }

  return { isValid: true, error: '' };
};

const validateGender = (gender: string): { isValid: boolean; error: string } => {
  const validGenders = ['Male', 'Female', 'Prefer not to say', 'Other'];

  if (!gender || gender.trim() === '') {
    return { isValid: false, error: 'Please select a gender' };
  }

  if (!validGenders.includes(gender)) {
    return { isValid: false, error: 'Please select a valid gender option' };
  }

  return { isValid: true, error: '' };
};

// Gender conversion functions
const convertGenderToBackendFormat = (displayGender: string): string => {
  const genderMapping: { [key: string]: string } = {
    'Male': 'male',
    'Female': 'female',
    'Prefer not to say': 'prefer not to say',
    'Other': 'other'
  };

  return genderMapping[displayGender] || displayGender.toLowerCase();
};

const convertGenderToDisplayFormat = (backendGender: string): string => {
  const genderMapping: { [key: string]: string } = {
    'male': 'Male',
    'female': 'Female',
    'prefer not to say': 'Prefer not to say',
    'other': 'Other'
  };

  return genderMapping[backendGender] || backendGender;
};

export const EditProfile: React.FC<EditProfileProps> = ({ }) => {
  const dispatch = useDispatch();

  const userData = useSelector((state: RootState) => state.home.userDetails);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({});
  const [name, setName] = useState({
    first_name: userData?.user?.first_name || '',
    last_name: userData?.user?.last_name || '',
  });
  const [gender, setGender] = useState(
    convertGenderToDisplayFormat(userData?.user?.gender || '')
  );
  const [selectedImage, setSelectedImage] = useState('');
  const [iconVisible, setIconVisible] = useState(false);

  // Validation errors state
  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    general: '',
  });

  const isSocial = userData?.isSocialLogin;

  // Clear specific error when user starts typing
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '', general: '' }));
    }
  };

  // Validate all form fields
  const validateForm = (): boolean => {
    const firstNameValidation = validateName(name.first_name);
    const lastNameValidation = validateName(name.last_name);
    const genderValidation = validateGender(gender);

    const newErrors = {
      first_name: firstNameValidation.error,
      last_name: lastNameValidation.error,
      gender: genderValidation.error,
      general: '',
    };

    setErrors(newErrors);

    return firstNameValidation.isValid && lastNameValidation.isValid && genderValidation.isValid;
  };

  const imagePicker = async () => {
    try {
      const image = await ImagePicker?.openPicker({
        mediaType: 'photo',
        cropping: true,
        width: 300,
        height: 300,
        cropperCircleOverlay: true, // Circular crop for profile pictures
        compressImageMaxWidth: 300,
        compressImageMaxHeight: 300,
        compressImageQuality: 0.8,
      });

      if (_.isEmpty(image?.path)) {
        Utills.showToast('Failed to select image. Please try again.');
        return;
      } else {
        setSelectedImage(image?.path);
        setIconVisible(true);
        clearError('general');
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('Error uploading image', error);
        Utills.showToast('Failed to select image. Please try again.');
      }
    }
  };

  const getUser = () => {
    HomeAPIS.getUserData()
      .then(res => {
        dispatch(
          HomeActions.setUserDetails({
            token: userData?.token,
            user: res?.data,
            isSocialLogin: userData?.isSocialLogin ? true : false,
          }),
        );
        setUser(res?.data);
        // Update form with fresh data
        setName({
          first_name: res?.data?.first_name || '',
          last_name: res?.data?.last_name || '',
        });
        setGender(convertGenderToDisplayFormat(res?.data?.gender || ''));
      })
      .catch(err => {
        console.log('Error getting user data', err?.response?.data);
        Utills.showToast(err?.response?.data?.errors?.[0]?.message || 'Failed to load user data');
      });
  };

  const updateUser = () => {
    // Validate form before submission
    if (!validateForm()) {
      Utills.showToast('Please fix the errors before saving');
      return;
    }

    setLoading(true);
    const form = new FormData();

    // Add image if selected
    if (selectedImage && selectedImage.trim() !== '') {
      form.append('avatar', {
        uri: selectedImage,
        name: 'profile_image.jpg',
        type: 'image/jpeg',
      } as any);
    }

    // Add form data with trimmed values
    form.append('first_name', name.first_name.trim());
    form.append('last_name', name.last_name.trim());
    form.append('gender', convertGenderToBackendFormat(gender));

    console.log('Updating user with data:', {
      first_name: name.first_name.trim(),
      last_name: name.last_name.trim(),
      gender: convertGenderToBackendFormat(gender),
      hasImage: !!selectedImage,
    });

    HomeAPIS.updateUser(form)
      .then(res => {
        setLoading(false);
        Utills.showToast('Profile updated successfully');
        dispatch(
          HomeActions.setUserDetails({
            token: userData?.token,
            user: res?.data,
            isSocialLogin: userData?.isSocialLogin ? true : false,
          }),
        );
        setSelectedImage('');
        setIconVisible(false);
        // Clear any errors after successful update
        setErrors({
          first_name: '',
          last_name: '',
          gender: '',
          general: '',
        });
      })
      .catch(err => {
        setLoading(false);
        console.log('Error updating user', err?.response?.data);
        const errorMessage = err?.response?.data?.errors?.[0]?.message ||
          err?.response?.data?.message ||
          'Failed to update profile. Please try again.';

        setErrors(prev => ({ ...prev, general: errorMessage }));
        Utills.showToast(errorMessage);
      });
  };

  useEffect(() => {
    getUser();
  }, []);

  const onCancel = () => {
    setSelectedImage('');
    setIconVisible(false);
  };

  const onSelect = () => {
    setIconVisible(false);
  };

  const genderSelection = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Male', 'Female', 'Prefer not to say', 'Other', 'Cancel'],
        destructiveButtonIndex: 4,
        cancelButtonIndex: 4,
        title: 'Select Gender',
        userInterfaceStyle: 'dark',
      },
      buttonIndex => {
        if (buttonIndex === 0) {
          setGender('Male');
          clearError('gender');
        } else if (buttonIndex === 1) {
          setGender('Female');
          clearError('gender');
        } else if (buttonIndex === 2) {
          setGender('Prefer not to say');
          clearError('gender');
        } else if (buttonIndex === 3) {
          setGender('Other');
          clearError('gender');
        }
        // Note: We don't clear gender for Cancel (buttonIndex === 4)
      },
    );

  // Helper function to get the current profile image source
  const getProfileImageSource = () => {
    if (selectedImage && selectedImage.trim() !== '') {
      return { uri: selectedImage };
    }

    if (isSocial && userData?.user?.image_url) {
      return { uri: userData?.user?.image_url };
    } else if (!isSocial && userData?.user?.avatar) {
      return { uri: userData?.user?.avatar };
    }

    return null;
  };

  // Check if form has any changes
  const hasFormChanged = () => {
    const currentGenderBackend = convertGenderToBackendFormat(gender);
    const originalGenderBackend = userData?.user?.gender || '';

    return (
      name.first_name.trim() !== (userData?.user?.first_name || '') ||
      name.last_name.trim() !== (userData?.user?.last_name || '') ||
      currentGenderBackend !== originalGenderBackend ||
      selectedImage !== ''
    );
  };

  return (
    <MainContainer>
      <BackHeader heading="Edit Profile" isBoldHeading />
      <ScrollableContainer customeStyle={{ paddingHorizontal: 0 }}>
        <View style={{ flex: 1, paddingBottom: Metrix.VerticalSize(50) }}>
          <ProfileHeader
            source={getProfileImageSource()}
            btnText={getProfileImageSource() ? "Change Photo" : "Add Photo"}
            onTextPress={imagePicker}
            onImagePress={imagePicker}
            customMainContainerStyle={{ marginBottom: Metrix.VerticalSize(40) }}
            uploadPhotoIcons={iconVisible}
            onPressCancel={onCancel}
            onPressCheck={onSelect}
            showPlaceholder={true}
          />

          {/* General error message */}
          {errors.general ? (
            <CustomText.RegularText
              customStyle={[styles.errorText, { marginBottom: Metrix.VerticalSize(15) }]}>
              {errors.general}
            </CustomText.RegularText>
          ) : null}

          <CustomInput
            placeholder="Enter your first name"
            value={name.first_name}
            heading="First Name"
            onChangeText={(val) => {
              setName({ ...name, first_name: val });
              clearError('first_name');
            }}
            customStyle={errors.first_name ? styles.inputError : {}}
          />
          {errors.first_name ? (
            <CustomText.RegularText customStyle={styles.errorText}>
              {errors.first_name}
            </CustomText.RegularText>
          ) : null}

          <CustomInput
            placeholder="Enter your last name"
            value={name.last_name}
            heading="Last Name"
            onChangeText={(val) => {
              setName({ ...name, last_name: val });
              clearError('last_name');
            }}
            customStyle={errors.last_name ? styles.inputError : {}}
          />
          {errors.last_name ? (
            <CustomText.RegularText customStyle={styles.errorText}>
              {errors.last_name}
            </CustomText.RegularText>
          ) : null}

          <CustomInput
            heading="Email"
            value={userData?.user?.email || ''}
            editable={false}
            customStyle={{
              backgroundColor: Utills.selectedThemeColors().WhiteOpacity('0.1'),
              width: '100%',
            }}
          />

          {userData?.user?.phone_number && (
            <CustomInput
              heading="Phone Number"
              value={userData?.user?.phone_number || ''}
              editable={false}
              customStyle={{
                backgroundColor: Utills.selectedThemeColors().WhiteOpacity('0.1'),
                width: '100%',
              }}
            />
          )}

          <CustomText.RegularText
            customStyle={{ fontSize: Metrix.customFontSize(15) }}>
            Gender
          </CustomText.RegularText>

          <TouchableOpacity
            onPress={genderSelection}
            activeOpacity={0.9}
            style={[
              styles.genderContainer,
              errors.gender ? styles.genderError : {}
            ]}>
            <CustomText.MediumText customStyle={[
              styles.genderTxt,
              { color: gender === '' ? Utills.selectedThemeColors().TertiaryTextColor : Utills.selectedThemeColors().PrimaryTextColor }
            ]}>
              {gender === '' ? 'Select Gender' : gender}
            </CustomText.MediumText>
          </TouchableOpacity>

          {errors.gender ? (
            <CustomText.RegularText customStyle={styles.errorText}>
              {errors.gender}
            </CustomText.RegularText>
          ) : null}

          <PrimaryButton
            title="Save Changes"
            onPress={updateUser}
            disabled={loading || !hasFormChanged()}
            customStyle={
              loading || !hasFormChanged()
                ? { backgroundColor: Utills.selectedThemeColors().WhiteOpacity('0.3') }
                : {}
            }
          />
        </View>
      </ScrollableContainer>
      <Loader isLoading={loading} />
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  genderContainer: {
    borderWidth: 2,
    borderColor: Utills.selectedThemeColors().TextInputBorderColor,
    borderRadius: Metrix.HorizontalSize(10),
    marginVertical: Metrix.VerticalSize(10),
    height: Metrix.VerticalSize(48),
    paddingHorizontal: Metrix.VerticalSize(20),
    justifyContent: 'center',
  },
  genderTxt: {
    fontSize: Metrix.customFontSize(16),
    fontFamily: Fonts['Regular'],
  },
  errorText: {
    color: '#FF6B6B', // Red color for errors
    fontSize: Metrix.customFontSize(12),
    marginTop: Metrix.VerticalSize(5),
    marginBottom: Metrix.VerticalSize(10),
    paddingHorizontal: Metrix.HorizontalSize(5),
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  genderError: {
    borderColor: '#FF6B6B',
  },
});