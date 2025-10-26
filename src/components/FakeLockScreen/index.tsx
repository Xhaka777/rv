// In src/components/FakeLockScreen/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, TouchableOpacity, Dimensions } from 'react-native';
import { CustomText } from '../CustomText';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FakeLockScreenProps {
    visible: boolean;
    onUnlock: () => void;
}

const FakeLockScreen: React.FC<FakeLockScreenProps> = ({ visible, onUnlock }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isFirstRender, setIsFirstRender] = useState(true);

    useEffect(() => {
        if (visible) {
            // Update time every second
            const timeInterval = setInterval(() => {
                setCurrentTime(new Date());
            }, 1000);

            // For first render (from countdown), show immediately
            // For subsequent renders (like returning from background), use fade
            if (isFirstRender) {
                fadeAnim.setValue(1); // Show immediately
                setIsFirstRender(false);
            } else {
                // Fade in for subsequent appearances
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            }

            return () => clearInterval(timeInterval);
        } else {
            // Reset for next time
            setIsFirstRender(true);
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

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
                {/* Time display */}
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                        {formatTime(currentTime)}
                    </Text>
                    <Text style={styles.dateText}>
                        {formatDate(currentTime)}
                    </Text>
                </View>
            </TouchableOpacity>
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
});

export default FakeLockScreen;