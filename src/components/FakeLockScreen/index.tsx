import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { CustomText } from '../CustomText';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/reducers';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FakeLockScreenProps {
    visible: boolean;
    onUnlock: () => void;
}

const FakeLockScreen: React.FC<FakeLockScreenProps> = ({ visible, onUnlock }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isFirstRender, setIsFirstRender] = useState(true);

    // Get active timer from Redux
    const activeTimer = useSelector((state: RootState) => state.home.activeTimer || '30m');
    
    // Countdown state
    const [remainingTime, setRemainingTime] = useState(0);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Convert timer string to seconds
    const timerToSeconds = (timer: string): number => {
        const minutes = parseInt(timer.replace('m', ''));
        return minutes * 60;
    };

    // Format seconds to MM:SS
    const formatCountdownTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (visible) {
            // Initialize countdown time based on active timer
            const initialSeconds = timerToSeconds(activeTimer);
            setRemainingTime(initialSeconds);

            // Update regular time every second
            const timeInterval = setInterval(() => {
                setCurrentTime(new Date());
            }, 1000);

            // Start countdown
            countdownIntervalRef.current = setInterval(() => {
                setRemainingTime(prevTime => {
                    if (prevTime <= 1) {
                        // Timer expired - auto unlock
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                        }
                        onUnlock(); // This will trigger the automatic disarm
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);

            // Animation handling
            if (isFirstRender) {
                fadeAnim.setValue(1);
                setIsFirstRender(false);
            } else {
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            }

            return () => {
                clearInterval(timeInterval);
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                }
            };
        } else {
            // Reset for next time
            setIsFirstRender(true);
            // Clear countdown interval
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
            }
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, activeTimer, onUnlock]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString([], { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric' 
        });
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <StatusBar hidden={true} />
            
            {/* Main content area - Touchable to unlock */}
            <TouchableOpacity 
                style={styles.contentContainer}
                onPress={onUnlock}
                activeOpacity={1}
            >
                {/* Time display - Centered */}
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                        {formatTime(currentTime)}
                    </Text>
                    <Text style={styles.dateText}>
                        {formatDate(currentTime)}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Countdown Timer - Fixed at bottom */}
            <View style={styles.countdownContainer}>
                <Text style={styles.countdownTime}>
                    {formatCountdownTime(remainingTime)}
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: screenWidth,
        height: screenHeight,
        backgroundColor: '#000000',
        zIndex: 999999,
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    timeContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    timeText: {
        color: '#FFFFFF',
        fontSize: 72,
        fontWeight: '100',
        fontFamily: 'SF Pro Display',
        letterSpacing: -2,
    },
    dateText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '400',
        marginTop: 8,
        opacity: 0.8,
    },
    countdownContainer: {
        position: 'absolute',
        bottom: 0, // Position from bottom - adjust this value as needed
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingBottom: 20,
    },
    countdownTime: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '100',
        fontFamily: 'SF Pro Display',
        letterSpacing: 1,
        textAlign: 'center',
    },
});

export default FakeLockScreen;