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

export const EditProfile: React.FC<EditProfileProps> = ({ }) => {
  const dispatch = useDispatch();

  const userData = useSelector((state: RootState) => state.home.userDetails);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({});
  const [name, setName] = useState({
    first_name: userData?.user?.first_name,
    last_name: userData?.user?.last_name,
  });
  const [gender, setGender] = useState(userData?.user?.gender);
  const [selectedImage, setSelectedImage] = useState('');
  const [iconVisible, setIconVisible] = useState(false);
  const isSocial = userData?.isSocialLogin;

  const imagePicker = async () => {
    try {
      const image = await ImagePicker?.openPicker({
        mediaType: 'photo',
        cropping: true,
      });
      if (_.isEmpty(image?.path)) {
        Utills.showToast('Upload image field required.');
        return;
      } else {
        setSelectedImage(image?.path);
        setIconVisible(true);
        // refRBSheet.current.open();
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error('erro upload image', error);
        // this.setState({loading: false});
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
      })
      .catch(err => {
        console.log('Err User', err?.response?.data);
        Utills.showToast(err?.response?.data?.errors?.[0]?.message);
      });
  };

  const updateUser = () => {
    setLoading(true);
    const form = new FormData();
    if (Object.keys(selectedImage).length != 0) {
      form.append('avatar', {
        uri: selectedImage,
        name: 'image.jpg',
        type: 'image/jpeg',
      });
    }
    form?.append('first_name', name?.first_name);
    form?.append('last_name', name?.last_name);
    form?.append('gender', gender?.toLowerCase());
    console.log('formData', form);
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
        // setUser()
      })
      .catch(err => {
        setLoading(false);
        console.log('Err User up', err?.response?.data);
        Utills.showToast(err?.response?.data?.errors?.[0]?.message);
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
        options: ['Male', 'Female', 'Other', 'Private', 'Cancel'],
        destructiveButtonIndex: 4,
        cancelButtonIndex: 4,
        title: 'Select Gender',
        userInterfaceStyle: 'dark',
      },
      buttonIndex => {
        if (buttonIndex === 0) {
          setGender('Male');
        } else if (buttonIndex === 1) {
          setGender('Female');
        } else if (buttonIndex === 2) {
          setGender('Other');
        } else if (buttonIndex === 3) {
          setGender('Private');
        } else if (buttonIndex === 4) {
          setGender('');
        }
      },
    );

  return (
    <MainContainer>
      <BackHeader heading="Edit Profile" isBoldHeading />
      <ScrollableContainer customeStyle={{ paddingHorizontal: 0 }}>
        <View style={{ flex: 1, paddingBottom: Metrix.VerticalSize(50) }}>
          <ProfileHeader
            source={
              (Object.keys(selectedImage).length != 0 && {
                uri: selectedImage,
              }) ||
              (isSocial
                ? {
                  uri: userData?.user?.image_url,
                }
                : {
                  uri: userData?.user?.avatar,
                })
            }
            btnText="Change Photo"
            onTextPress={() => imagePicker()}
            customMainContainerStyle={{ marginBottom: Metrix.VerticalSize(40) }}
            uploadPhotoIcons={iconVisible}
            onPressCancel={onCancel}
            onPressCheck={onSelect}
          />
          <CustomInput
            placeholder={name.first_name}
            value={name.first_name}
            heading="First Name"
            onChangeText={val => setName({ ...name, first_name: val })}
          />
          <CustomInput
            placeholder={name.last_name}
            value={name.last_name}
            heading="Last Name"
            onChangeText={val => setName({ ...name, last_name: val })}
          />
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
                backgroundColor:
                  Utills.selectedThemeColors().WhiteOpacity('0.1'),
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
            style={styles.genderContainer}>
            <CustomText.MediumText customStyle={styles.genderTxt}>
              {gender == '' ? 'Select Gender' : gender}
            </CustomText.MediumText>
          </TouchableOpacity>

          <PrimaryButton title="Save Changes" onPress={updateUser} />
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
});
