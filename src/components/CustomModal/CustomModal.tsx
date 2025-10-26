import React, {ReactNode} from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Text,
  Image,
  SafeAreaView,
  Platform,
  ViewStyle,
} from 'react-native';
import {Colors, Images, Metrix, Utills} from '../../config';
import {useThemeHook} from '../../hooks';
import {CustomText} from '..';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  childrenViewStyle?: ViewStyle;
  smallModal?: boolean;
  smallContainerStyles?: ViewStyle;
  title?: string;
  modalContainer?: ViewStyle;
  safeAreaStyle?: any;
  crossBtn?: any;
};

export const CustomModal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  childrenViewStyle,
  smallModal,
  smallContainerStyles,
  modalContainer,
  safeAreaStyle,
  crossBtn = true,
  title,
}) => {
  // const {Colors} = useThemeHook();

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType={Platform.OS == 'ios' ? 'fade' : 'fade'}>
      <SafeAreaView
        style={[
          styles.modalContainer,
          safeAreaStyle,
          smallModal && {
            backgroundColor: Utills.selectedThemeColors().BaseOpacity('0.7'),
            // borderWidth:1,
            // borderColor:'red'
          },
        ]}>
        <TouchableOpacity
          style={[
            styles.modalContainer,
            smallModal && {
              alignItems: 'center',
              justifyContent: 'center',
              // borderWidth:1,
              // borderColor:'red'
            },
          ]}
          activeOpacity={1}
          // onPress={onClose}
        >
          {smallModal ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.smallModalBackdrop}
              onPress={onClose}>
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.smallModalContent, smallContainerStyles]}>
                {children}
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <View style={[styles.modalContent, modalContainer]}>
              {crossBtn && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.6}
                  onPress={onClose}>
                  <Image
                    source={Images.Cross}
                    resizeMode="contain"
                    style={{
                      width: Metrix.HorizontalSize(35),
                      height: Metrix.VerticalSize(35),
                    }}
                  />
                  {title && (
                    <>
                      <CustomText.LargeSemiBoldText>
                        {title}
                      </CustomText.LargeSemiBoldText>
                      <View></View>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <View style={[styles.childrenView, childrenViewStyle]}>
                {children}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    // backgroundColor: Utills.selectedThemeColors().BaseOpacity(),
  },
  modalContent: {
    flex: 1,
    width: '100%',
    maxHeight: '100%',
    paddingTop: Metrix.VerticalSize(20),
    paddingHorizontal: Metrix.HorizontalSize(20),
    backgroundColor: Utills.selectedThemeColors().Base,
  },
  childrenView: {
    // borderWidth: 1,
    // borderColor: 'yellow',
    flex: 1,
    marginTop: Metrix.VerticalSize(20),
  },
  smallModalContent: {
    height: '30%',
    width: '80%',
    backgroundColor: Utills.selectedThemeColors().Base,
    borderRadius: Metrix.VerticalSize(20),
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Utills.selectedThemeColors().TextInputBorderColor,
    padding: Metrix.VerticalSize(20),
  },
  smallModalBackdrop: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
