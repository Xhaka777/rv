import React, { useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Share, Download } from 'lucide-react-native';


interface DownloadBottomSheetProps {
    onSharePress: () => void;
    onSaveLocallyPress: () => void;
}

const DownloadBottomSheet = forwardRef<BottomSheet, DownloadBottomSheetProps>(
    ({ onSharePress, onSaveLocallyPress }, ref) => {
        const snapPoints = useMemo(() => ['35%'], []);

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backgroundStyle={styles.bottomSheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
            >
                <BottomSheetView>
                    <View style={styles.optionsContainer}>
                        <TouchableOpacity
                            style={styles.option}
                            onPress={onSharePress}
                        >
                            <View style={styles.iconContainer}>
                                <Share size={32} color="#ffffff" strokeWidth={2} />
                            </View>
                            <Text style={styles.optionLabel}>Share to</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.option}
                            onPress={onSaveLocallyPress}
                        >
                            <View style={styles.iconContainer}>
                                <Download size={32} color="#ffffff" strokeWidth={2} />
                            </View>
                            <Text style={styles.optionLabel}>Save locally</Text>
                        </TouchableOpacity>
                    </View>
                </BottomSheetView>
            </BottomSheet>
        )

    }
)

const styles = StyleSheet.create({
    bottomSheetBackground: {
        backgroundColor: '#2a2a2a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    handleIndicator: {
        backgroundColor: '#555555',
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 24,
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    option: {
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#3a3a3a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
        textAlign: 'center',
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
});

export default DownloadBottomSheet;