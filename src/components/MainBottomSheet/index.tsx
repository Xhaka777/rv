import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { TriangleAlert as AlertTriangle, Shield, Users, MapPin, Camera, MessageCircle } from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

interface MainBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onIconPress: () => void;
}

export default function MainBottomSheet({ isVisible, onClose, onIconPress }: MainBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSheetClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleIconPress = useCallback(() => {
    onIconPress();
  }, [onIconPress]);

  const icons = [
    { icon: AlertTriangle, label: 'Emergency', color: '#ff4444' },
    { icon: Shield, label: 'Safety', color: '#4ade80' },
    { icon: Users, label: 'Community', color: '#3b82f6' },
    { icon: MapPin, label: 'Location', color: '#f59e0b' },
    { icon: Camera, label: 'Report', color: '#8b5cf6' },
    { icon: MessageCircle, label: 'Chat', color: '#06b6d4' },
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={handleSheetClose}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      index={-1}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>What would you like to report?</Text>
        <Text style={styles.subtitle}>Choose the type of incident or information you want to share</Text>

        <View style={styles.iconsGrid}>
          {icons.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.iconButton}
              onPress={handleIconPress}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}20` }]}>
                <item.icon size={32} color={item.color} />
              </View>
              <Text style={styles.iconLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#ccc',
    width: 40,
    height: 4,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  iconButton: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    textAlign: 'center',
  },
});