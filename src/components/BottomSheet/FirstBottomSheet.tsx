import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Images } from '../../config';

interface FirstBottomSheetProps {
    onYes: () => void;
    onNo: () => void;
    onThreatSelect: (threatData: { id: number, icon: any, label: string }) => void; // New prop
    onChange: (index: number) => void;
}

const FirstBottomSheet = forwardRef<BottomSheet, FirstBottomSheetProps>(
    ({ onYes, onNo, onThreatSelect, onChange }, ref) => {
        const snapPoints = useMemo(() => ['10%', '40%'], []); // First point shows only header, second shows full content

        const iconActions = [
            { id: 1, icon: Images.Harasment, label: 'Harassment' },
            { id: 2, icon: Images.Followed, label: 'Followed' },
            { id: 3, icon: Images.Fight, label: 'Fight' },
            { id: 4, icon: Images.Stabing, label: 'Stabbing' },
            { id: 5, icon: Images.Shooter, label: 'Shooting' },
            { id: 6, icon: Images.Danger, label: 'Mass event' },
        ];

        // Handle icon selection
        const handleIconPress = (iconData: { id: number, icon: any, label: string }) => {
            // Call the threat selection callback
            onThreatSelect(iconData);
        };

        const renderIconGrid = () => (
            <View style={styles.iconGrid}>
                {iconActions.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.iconButton}
                        onPress={() => handleIconPress(item)} // Updated to handle selection
                        activeOpacity={0.7}
                    >
                        <View style={styles.iconContainer}>
                            <Image
                                source={item.icon}
                                style={styles.iconImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.iconLabel}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );

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
                <BottomSheetView style={styles.bottomSheetContent}>
                    <View style={styles.bottomSheetHeader}>
                        <Text style={styles.bottomSheetTitle}>What did you notice?</Text>
                    </View>
                    <View style={{ flex: 1 }}>{renderIconGrid()}</View>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

FirstBottomSheet.displayName = 'FirstBottomSheet';

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: 'rgba(60, 60, 60, 0.95)',
        borderRadius: 20,
    },
    bottomSheetContent: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    bottomSheetHeader: {
        // backgroundColor: 'rgba(45, 45, 45, 0.98)',
        paddingTop: 10,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    bottomSheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    bottomSheetSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '400',
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
        padding: 20,
        backgroundColor: 'rgba(223, 223, 223, 0.07)',
    },
    handleIndicator: {
        backgroundColor: '#d1d5db',
        width: 40,
        height: 4,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        // backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    buttonContainer: {
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(60, 60, 60, 0.95)',
    },
    noButton: {
        backgroundColor: '#f3f4f6',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    noButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
    },
    iconButton: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconImage: {
        width: 45,
        height: 45,
    },
    iconLabel: {
        fontSize: 14,
        color: '#FFFFFF',
        textAlign: 'center',
        fontWeight: '500',
        marginTop: 2,
    },
});

export default FirstBottomSheet;