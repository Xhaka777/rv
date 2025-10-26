import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Image,
    Dimensions
} from 'react-native';
import { DayScheduleRow } from './DayScheduleRow';
import { Images, Metrix, Utills } from '../../config';
import { X } from 'lucide-react-native';

interface ScheduleTime {
    startTime: string;
    endTime: string;
    enabled: boolean;
}

interface WeekSchedule {
    [key: string]: ScheduleTime;
}

interface ProtectionScheduleModalProps {
    visible: boolean;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

export function ProtectionScheduleModal({ visible, onClose }: ProtectionScheduleModalProps) {
    const [schedule, setSchedule] = useState<WeekSchedule>({
        Mon: { startTime: '10:00 PM', endTime: '7:00 AM', enabled: true },
        Tue: { startTime: '10:00 PM', endTime: '7:00 AM', enabled: true },
        Wed: { startTime: '10:00 PM', endTime: '7:00 AM', enabled: true },
        Thu: { startTime: '10:00 PM', endTime: '7:00 AM', enabled: true },
        Fri: { startTime: '10:00 PM', endTime: '7:00 AM', enabled: true },
        Sat: { startTime: '10:00 PM', endTime: '7:00 AM', enabled: true },
        Sun: { startTime: '10:00 PM', endTime: '7:00 AM', enabled: true },
    });

    // Add internal visible state to handle animation properly
    const [internalVisible, setInternalVisible] = useState(visible);

    // Calculate responsive modal dimensions
    const modalWidth = Math.min(width * 0.9, 400); // Maximum 400px, 90% of screen width
    const modalPadding = width * 0.04; // 4% padding

    // Sync internal state with prop and handle closing animation
    useEffect(() => {
        if (visible) {
            setInternalVisible(true);
        } else {
            // Add a small delay to let the closing animation complete
            const timer = setTimeout(() => {
                setInternalVisible(false);
            }, 300); // Adjust timing based on your modal animation duration

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const updateSchedule = (day: string, field: keyof ScheduleTime, value: string | boolean) => {
        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value,
            },
        }));
    };

    const handleSafeZones = () => {
        Alert.alert(
            'Safe Zones',
            'Configure locations where auto detection are inactive.',
            [{ text: 'OK' }]
        );
    };

    const handleClose = () => {
        // Set visible to false immediately to start closing animation
        onClose();
    };

    // Don't render the modal at all if it's not supposed to be visible
    if (!internalVisible) {
        return null;
    }

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { width: modalWidth }]}>
                    <View style={[styles.header]}>
                        <View style={styles.titleContainer}>
                            <Image
                                source={Images.Premium}
                                style={[styles.premiumIcon]}
                            />
                            <Text style={styles.title}>Protection schedule</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleClose}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={24} color='#666' />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.descriptionContainer}>
                        <Text style={[styles.description, {
                            paddingHorizontal: modalPadding,
                            paddingBottom: modalPadding * 0.5,
                        }]}>
                            Schedule <Text style={styles.emphasizedText}>auto monitoring</Text> only during key times to save battery.
                        </Text>
                    </View>


                    <ScrollView
                        style={[styles.scheduleContainer, { paddingHorizontal: modalPadding * 0.5 }]}
                        showsVerticalScrollIndicator={false}
                    >
                        {Object.entries(schedule).map(([day, daySchedule]) => (
                            <DayScheduleRow
                                key={day}
                                day={day}
                                schedule={daySchedule}
                                onUpdateSchedule={updateSchedule}
                            />
                        ))}
                    </ScrollView>

                    <View style={[styles.footer, { padding: modalPadding }]}>
                        <TouchableOpacity
                            style={styles.safeZonesButton}
                            onPress={handleSafeZones}
                        >
                            <Text style={styles.safeZonesText}>
                                * Locations where auto detection are inactive can be set in <Text style={styles.safeZonesLink}>Safe Zones</Text>.
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        margin: 20,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        borderBottomColor: '#E5E5EA',
        marginBottom: -15,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Changed from default to space-between
        marginLeft: 10,
        marginRight: 10, // Added right margin for close button
        marginBottom: 20,
        marginTop: 10,
    },
    premiumIcon: {
        tintColor: '#666', // Black color
        resizeMode: 'contain',
        width: Metrix.HorizontalSize(28),
        height: Metrix.VerticalSize(28),
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#666',
        textAlign: 'left',
        flex: 1, // Take remaining space
        marginLeft: 8, // Add some space after the icon
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        // backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 20,
        fontWeight: '300',
        color: '#8E8E93',
        lineHeight: 20,
    },
    descriptionContainer: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginLeft: 10, // Match titleContainer's left margin
        marginRight: 10,
        // marginBottom: 20,
        marginTop: 10,
        paddingLeft: 0,
        paddingRight: 0,
    },
    description: {
        fontSize: Math.min(width * 0.05, 16),
        color: '#000',
        lineHeight: 18,
        textAlign: 'left',
        marginLeft: 0,
        paddingLeft: 0,
    },
    emphasizedText: {
        fontWeight: '700', // Bolder than the regular text
        color: '#000000', // Darker black
    },
    scheduleContainer: {
        maxHeight: 390,
        marginLeft: 3,
    },
    // Footer Styles
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    safeZonesButton: {
        paddingHorizontal: 10,
    },
    safeZonesText: {
        fontSize: Math.min(width * 0.035, 14), // Responsive font size
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 16,
        fontStyle: 'italic',
    },
    safeZonesLink: {
        color: '#000',
        fontWeight: '500',
    },
});