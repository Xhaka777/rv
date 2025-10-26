import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';

interface SecondBottomSheetProps {
    onYes: () => void;
    onNo: () => void;
    onChange: (index: number) => void;
}

const SecondBottomSheet = forwardRef<BottomSheet, SecondBottomSheetProps>(
    ({ onYes, onNo, onChange }, ref) => {
        const snapPoints = useMemo(() => ['15%'], []);

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
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.cancelButton]}
                            onPress={onNo}>
                            <X size={24} color='#666' />
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.confirmButton]}
                            onPress={onYes}>
                            <Check size={24} color='#fff' />
                            <Text style={styles.confirmButtonText}>Report</Text>
                        </TouchableOpacity>
                    </View>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

SecondBottomSheet.displayName = 'SecondBottomSheet';

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: 'transparent',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    handleIndicator: {
        width: 40,
        height: 4,
        backgroundColor: 'transparent'
    },
    contentContainer: {
        flex: 1,
        padding: 24,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    confirmButton: {
        backgroundColor: '#4ade80',
    },
    cancelButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#666',
    },
    confirmButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-SemiBold',
        color: '#fff',
    },
});

export default SecondBottomSheet;