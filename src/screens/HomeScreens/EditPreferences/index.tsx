import {StyleSheet, TouchableOpacity, View} from 'react-native';
import React from 'react';
import {EditPreferencesProps} from '../../propTypes';
import {
  BackHeader,
  CustomText,
  MainContainer,
  PrimaryButton,
} from '../../../components';
import {Metrix, Utills} from '../../../config';
import {useDispatch, useSelector} from 'react-redux';
import {AuthActions, HomeActions} from '../../../redux/actions';
import {RootState} from '../../../redux/reducers';

export const EditPreferences: React.FC<EditPreferencesProps> = ({}) => {
  const isSafeWord = useSelector(
    (state: RootState) => state?.home?.safeWord?.isSafeWord,
  );
  const safeWord = useSelector(
    (state: RootState) => state?.home?.safeWord?.safeWord,
  );
  const dispatch = useDispatch();

  return (
    <MainContainer isFlatList>
      <BackHeader heading="Preferences" isBoldHeading />
      <View style={{flex: 1}}>
        <CustomText.MediumText customStyle={styles.heading}>
          Please select your preferred level of protection
        </CustomText.MediumText>
        <CustomText.MediumText customStyle={styles.recommendHeading}>
          (Recommended)
        </CustomText.MediumText>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.optionContainer,
            {
              borderWidth: isSafeWord ? 2 : StyleSheet.hairlineWidth,
              borderColor: isSafeWord
                ? Utills.selectedThemeColors().PrimaryTextColor
                : Utills.selectedThemeColors().SecondaryTextColor,
            },
          ]}
          onPress={() => {
            dispatch(
              HomeActions.setSafeWord({
                isSafeWord: true,
                safeWord: safeWord,
              }),
            );
          }}>
          <CustomText.MediumText
            customStyle={{
              textAlign: 'center',
              fontWeight: '700',
              textDecorationLine: 'underline',
            }}>
            Active + manual
          </CustomText.MediumText>

          <CustomText.RegularText
            customStyle={{
              textAlign: 'center',
              marginTop: Metrix.VerticalSize(20),
            }}>
            Rove will use your mic to monitor your surroundings when you are
            moving and start audio streaming if an assault is detected.
          </CustomText.RegularText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[
            styles.optionContainer,
            {
              marginTop: Metrix.VerticalSize(30),
              borderWidth: !isSafeWord ? 2 : StyleSheet.hairlineWidth,
              borderColor: !isSafeWord
                ? Utills.selectedThemeColors().PrimaryTextColor
                : Utills.selectedThemeColors().SecondaryTextColor,
            },
          ]}
          onPress={() => {
            dispatch(
              HomeActions.setSafeWord({
                isSafeWord: false,
                safeWord: safeWord,
              }),
            );
          }}>
          <CustomText.MediumText
            customStyle={{
              textAlign: 'center',
              fontWeight: '700',
              textDecorationLine: 'underline',
            }}>
            Manual Only
          </CustomText.MediumText>

          <CustomText.RegularText
            customStyle={{
              textAlign: 'center',
              marginTop: Metrix.VerticalSize(20),
            }}>
            Rove will only start audio streaming when you will say your custom
            defined safe word to start streaming.
          </CustomText.RegularText>
        </TouchableOpacity>
      </View>
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  heading: {
    textAlign: 'center',
    marginTop: Metrix.VerticalSize(10),
  },
  optionContainer: {
    borderWidth: 1,
    borderColor: Utills.selectedThemeColors().PrimaryTextColor,
    width: '85%',
    alignSelf: 'center',
    borderRadius: Metrix.HorizontalSize(10),
    paddingHorizontal: Metrix.HorizontalSize(10),
    paddingVertical: Metrix.HorizontalSize(20),
    marginTop: Metrix.VerticalSize(20),
  },
  recommendHeading: {
    textAlign: 'center',
    marginTop: Metrix.VerticalSize(30),
  },
});
