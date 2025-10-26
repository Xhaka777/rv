import {
  Image,
  ImageProps,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import React from 'react';
import {Images, Metrix} from '../../config';

type EmptyStateProps = {
  src?: ImageProps['source'];
  customStyle?: ViewStyle;
};

export const EmptyState: React.FC<EmptyStateProps> = ({src, customStyle}) => {
  return (
    <View style={[styles.emptyState, customStyle]}>
      <View style={styles.containerStyle}>
        <Image
          source={src ? src : Images.EmptyState}
          style={{width: '100%', height: '100%'}}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

interface EmptyStateStyles {
  containerStyle: ViewStyle;
  emptyState: ViewStyle;
}
const styles = StyleSheet.create<EmptyStateStyles>({
  containerStyle: {
    // borderWidth: 1,
    // borderColor: 'red',
    width: Metrix.HorizontalSize(200),
    height: Metrix.VerticalSize(200),
    // alignSelf: 'center',
  },
  emptyState: {
    // borderWidth: 2,
    // borderColor: 'green',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: Metrix.VerticalSize(50),
  },
});
