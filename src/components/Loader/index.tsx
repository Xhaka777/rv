import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import React from 'react';
import {Colors, Metrix, Utills} from '../../config';
import {ActivityIndicatorProps} from 'react-native-paper';
import {useSelector} from 'react-redux';
import {RootState} from '../../redux/reducers';
import {CustomText, LottieAnimatedComponent} from '..';
import {useThemeHook} from '../../hooks';

type LoaderProps = ActivityIndicatorProps & {isLoading: any};

export const Loader: React.FC<LoaderProps> = ({
  size = 'large',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Modal visible={isLoading} transparent={true} animationType={'fade'}>
        <View style={styles.mainContaienr}>
          {/* <CustomText.MediumText>
            {`Auth : ${checkingAuthActionLoader}`}
            {`Home : ${checkingHomeActionLoader}`}
          </CustomText.MediumText> */}
          <ActivityIndicator size={size} color={Utills.selectedThemeColors().PrimaryTextColor} />
          {/* <LottieAnimatedComponent speed={1.5} /> */}
        </View>
      </Modal>
    );
  } else {
    return null;
  }
};

interface LoaderStyles {
  mainContaienr: ViewStyle;
}
const styles = StyleSheet.create<LoaderStyles>({
  mainContaienr: {
    flex: 1,
    backgroundColor: Utills.selectedThemeColors().BlackOpacity('0.5'),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
