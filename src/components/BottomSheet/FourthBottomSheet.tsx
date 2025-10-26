import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Skull, X, Share } from 'lucide-react-native';

interface FourthBottomSheetProps {
  onClose: () => void;
  onChange: (index: number) => void;
}

const FourthBottomSheet = forwardRef<BottomSheet, FourthBottomSheetProps>(
  ({ onClose, onChange }, ref) => {
    const snapPoints = useMemo(() => ['70%'], []);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        onChange={onChange}
        enablePanDownToClose
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          {/* Header with title, icon, and close button */}
          <View style={styles.header}>
            <View style={styles.leftSection}>
              <Text style={styles.title}>Mass event</Text>
              <Text style={styles.address}>52 Polk Street</Text>
            </View>
            
            <View style={styles.centerSection}>
              <Skull size={32} color="#ffffff" />
            </View>
            
            <View style={styles.rightSection}>
              <TouchableOpacity style={styles.shareButton}>
                <Share size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Image section */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: 'https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800'
              }}
              style={styles.eventImage}
              resizeMode="cover"
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

FourthBottomSheet.displayName = 'FourthBottomSheet';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#2d2d2d',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: '#666666',
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#2d2d2d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  centerSection: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  rightSection: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  address: {
    fontSize: 16,
    color: '#cccccc',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});

export default FourthBottomSheet;