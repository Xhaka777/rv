import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions, Vibration } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CountdownUIProps {
    visible: boolean;
    onComplete: () => void;
    onCancel: () => void;
    initialCount?: number;
}

const CountdownArming: React.FC<CountdownUIProps> = ({
    visible,
    onComplete,
    onCancel,
    initialCount = 3
}) => {
    const [countdown, setCountdown] = useState(initialCount);
    const [showCheckmark, setShowCheckmark] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const checkmarkAnim = useRef(new Animated.Value(0)).current;
    const countdownInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (visible) {
            setCountdown(initialCount);
            setShowCheckmark(false);
            startAnimation();
            startCountdown();
        } else {
            cleanup();
        }

        return cleanup;
    }, [visible]);

    const startAnimation = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const startCheckmarkAnimation = () => {
        // Haptic feedback when showing checkmark
        Vibration.vibrate([0, 100, 50, 100]); // Custom vibration pattern

        setShowCheckmark(true);

        Animated.spring(checkmarkAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
        }).start(() => {
            // Auto-hide after 2 seconds and complete
            setTimeout(() => {
                onComplete();
            }, 2000);
        });
    };

    const startCountdown = () => {
        countdownInterval.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Only clear interval, don’t reset animations yet
                    if (countdownInterval.current) {
                        clearInterval(countdownInterval.current);
                        countdownInterval.current = null;
                    }
                    startCheckmarkAnimation();
                    return 0;
                }
                return prev - 1;
            });
        }, 800);
    };

    const cleanup = () => {
        if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
        }
    };


    const handleCancel = () => {
        cleanup();
        onCancel();
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.overlay,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                }
            ]}
        >
            <View style={styles.container}>
                {!showCheckmark ? (
                    <>
                        {/* Header Text - Static text that shows for all numbers */}
                        <Text style={styles.headerText}>
                            Threat detection activating in
                        </Text>

                        {/* Main Countdown Number */}
                        <View style={styles.countdownContainer}>
                            <Text style={styles.countdownNumber}>
                                {countdown}
                            </Text>
                        </View>

                        {/* Cancel Button - Gray button with white text */}
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                            activeOpacity={0.7}
                        >
                            <View style={styles.cancelButtonContainer}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </View>
                        </TouchableOpacity>
                    </>
                ) : (
                    /* Checkmark and completion message */
                    <Animated.View
                        style={[
                            styles.checkmarkContainer,
                            {
                                opacity: checkmarkAnim,
                                transform: [{ scale: checkmarkAnim }]
                            }
                        ]}
                    >
                        {/* Checkmark */}
                        <View style={styles.checkmarkCircle}>
                            <Text style={styles.checkmarkIcon}>✓</Text>
                        </View>

                        {/* Completion text */}
                        <Text style={styles.completionText}>
                            * Unlocking your phone will deactivate!
                        </Text>
                    </Animated.View>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    container: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    headerText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontFamily: 'Montserrat',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    countdownContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    countdownNumber: {
        color: '#FFFFFF',
        fontSize: 48,
        fontFamily: 'Montserrat',
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 10,
    },
    cancelButtonContainer: {
        backgroundColor: '#60636c', // Gray background
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 5,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        color: '#FFFFFF', // White text
        fontSize: 16,
        fontFamily: 'Montserrat',
        fontWeight: '500',
    },
    checkmarkContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkCircle: {
        width: 80,
        height: 80,
        // borderRadius: 40,
        backgroundColor: 'transparent',
        // borderWidth: 2,
        // borderColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    checkmarkIcon: {
        color: '#FFFFFF',
        fontSize: 36,
        fontWeight: 'bold',
    },
    completionText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: 'Montserrat',
        fontWeight: '400',
        textAlign: 'center',
    },
});

export default CountdownArming;