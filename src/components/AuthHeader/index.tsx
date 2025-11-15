import React, { ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { BackHeader } from '../BackHeader';
import { CustomText, MainContainer, PrimaryButton, SecondaryButton } from '..';
import { Colors, Images, Metrix, Utills } from '../../config';
import { I18nManager } from 'react-native';
import { PrimaryButtonProps } from '../PrimaryButton';
import { useThemeHook } from '../../hooks';
import { t } from 'i18next';
import { normalizeFont } from '../../config/metrix';

const TouchableText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <Pressable
      style={{ justifyContent: 'flex-end' }}
      onPress={() => { }}>
      <CustomText.MediumText
        customStyle={{
          color: Utills.selectedThemeColors().PrimaryTextColor,
        }}>
        {text}
      </CustomText.MediumText>
    </Pressable>
  );
};

type AuthHeaderProps = PrimaryButtonProps & {
  heading: string;
  paragraph?: string;
  showBackHeader?: boolean;
  onBottomTextPress?: () => void;
  isbottomText?: string;
  isBtn?: boolean;
  isLogo?: boolean;
  isSecondaryBtn?: boolean;
  isAppleBtn?: boolean;
  isupperText?: boolean;
  children: ReactNode;
  title?: string;
  childrenView?: any;
  onSecPress?: () => void;
  onApplePress?: () => void;
};

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  heading,
  paragraph,
  showBackHeader = true,
  children,
  disabled,
  title,
  onPress,
  onSecPress,
  onApplePress,
  onBottomTextPress,
  isbottomText,
  isBtn,
  isLogo = true,
  customStyles,
  isSecondaryBtn,
  isAppleBtn = false,
  isupperText,
  childrenView,
}) => {

  return (
    <MainContainer
      customeStyle={{
        paddingVertical: Metrix.VerticalSize(10),
      }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {showBackHeader && <BackHeader />}
        <View style={styles.topContainer}>
          {isLogo && (
            <Image
              source={Images.Logo}
              style={{
                width: Metrix.HorizontalSize(150),
                height: Metrix.VerticalSize(70),
              }}
              resizeMode="cover"
            />
          )}
          <CustomText.ExtraLargeBoldText
            customStyle={{ fontSize: normalizeFont(28) }}>
            {heading}
          </CustomText.ExtraLargeBoldText>
        </View>

        <View style={[styles.childrenView, childrenView]}>
          <View>
            {children}
          </View>
          <View
            style={[
              styles.bottomContainer,
              !isBtn && { justifyContent: 'flex-end' },
            ]}>
            {isupperText && (
              <View>
                <CustomText.MediumText
                  customStyle={{
                    textAlign: 'center',
                  }}
                  isSecondaryColor>
                  {t('text')} <TouchableText text={t('terms')} /> {t('and')}{' '}
                  <TouchableText text={t('conditions')} />
                </CustomText.MediumText>
              </View>
            )}
            {isBtn && (
              <PrimaryButton
                title={title}
                customStyles={customStyles}
                disabled={disabled}
                onPress={onPress}
              />
            )}
            {isSecondaryBtn && (
              <View style={{ marginBottom: Metrix.VerticalSize(50) }}>
                <CustomText.RegularText
                  customStyle={{
                    color: Utills.selectedThemeColors().LightGreyText,
                    textAlign: 'center',
                    lineHeight: 30,
                  }}>
                  {t('or')}
                </CustomText.RegularText>

                {/* Google Sign-In Button */}
                <SecondaryButton
                  onPress={() => {
                    console.log('🟢 Google button pressed');
                    onSecPress && onSecPress();
                  }}
                  title={t('Continue with Google')}
                  source={Images.GoogleLogo}
                  isIcon
                />

                {/* Apple Sign-In Button - Only show on iOS when supported */}
                {isAppleBtn && Platform.OS === 'ios' && (
                  <SecondaryButton
                    onPress={() => {
                      if (onApplePress) {
                        onApplePress();
                      } else {
                      }
                    }}
                    title={t('Continue with Apple')}
                    source={Images.Apple}
                    isIcon
                    textColor={'#FFFFFF'}
                  />
                )}
              </View>
            )}
            {isbottomText && (
              <View style={styles.bottomText}>
                <CustomText.MediumText isSecondaryColor>
                  New to Rove?{' '}
                </CustomText.MediumText>
                <TouchableOpacity
                  style={styles.bottomTouchable}
                  onPress={onBottomTextPress}>
                  <CustomText.MediumText>
                    {isbottomText}
                  </CustomText.MediumText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  container: {},
  bottomText: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomTouchable: {
    justifyContent: 'center',
  },
  bottomContainer: { justifyContent: 'space-between' },
  childrenView: {
    marginVertical: Metrix.VerticalSize(20),
    flex: 4,
    justifyContent: 'space-between',
  },
  topContainer: {
    flex: 1.0,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});