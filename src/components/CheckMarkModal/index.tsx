import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Animated,
    Dimensions,
    Easing,
    Image,
} from 'react-native';
import { CustomText } from '../index';
import { Utills, Metrix, Images } from '../../config';
import { normalizeFont } from '../../config/metrix';
import { Check } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CheckmarkModalProps {
    visible: boolean;
    title?: string;
    subtitle?: string;
    duration?: number;
    onComplete?: () => void;
}

export const CheckmarkModal: React.FC<CheckmarkModalProps> = ({
    visible,
    title = 'Success!',
    subtitle = 'Your passcode has been set successfully',
    duration = 2000,
    onComplete,
}) => {
    // Animation values
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const checkmarkAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const textOpacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset all animations
            scaleAnim.setValue(0);
            checkmarkAnim.setValue(0);
            opacityAnim.setValue(0);
            textOpacityAnim.setValue(0);

            // Start animation sequence
            Animated.sequence([
                // 1. Fade in background
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                // 2. Scale in circle
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 400,
                    easing: Easing.elastic(1.2),
                    useNativeDriver: true,
                }),
                // 3. Draw checkmark
                Animated.timing(checkmarkAnim, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false, // Using strokeDashoffset
                }),
                // 4. Fade in text
                Animated.timing(textOpacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Auto-hide after duration
                setTimeout(() => {
                    if (onComplete) {
                        onComplete();
                    }
                }, duration);
            });
        }
    }, [visible]);

    const checkmarkStrokeDashoffset = checkmarkAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0],
    });

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
        >
            <Animated.View
                style={[
                    styles.overlay,
                    { opacity: opacityAnim }
                ]}
            >
                <View style={styles.container}>
                    {/* Success Circle with Checkmark */}
                    <Animated.View
                        style={[
                            styles.successCircle,
                            {
                                transform: [{ scale: scaleAnim }],
                            },
                        ]}
                    >
                        <Check size={34} color={'#fff'} />
                    </Animated.View>
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Metrix.HorizontalSize(40),
    },
    successCircle: {
        width: Metrix.HorizontalSize(80),
        height: Metrix.VerticalSize(80),
        borderRadius: Metrix.HorizontalSize(40),
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Metrix.VerticalSize(20),
        shadowColor: '#4CAF50',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    checkmarkContainer: {
        width: Metrix.HorizontalSize(50),
        height: Metrix.VerticalSize(50),
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmark: {
        width: Metrix.HorizontalSize(32),
        height: Metrix.VerticalSize(22),
        position: 'relative',
    },
    checkmarkStem: {
        position: 'absolute',
        width: Metrix.HorizontalSize(4),
        height: Metrix.VerticalSize(12),
        backgroundColor: '#FFFFFF',
        left: Metrix.HorizontalSize(12),
        top: Metrix.VerticalSize(6),
        transform: [{ rotate: '45deg' }],
        borderRadius: Metrix.HorizontalSize(1.5),
    },
    checkmarkKick: {
        position: 'absolute',
        width: Metrix.HorizontalSize(4),
        height: Metrix.VerticalSize(6),
        backgroundColor: '#FFFFFF',
        left: Metrix.HorizontalSize(6),
        top: Metrix.VerticalSize(12),
        transform: [{ rotate: '-45deg' }],
        borderRadius: Metrix.HorizontalSize(1.5),
    },
    textContainer: {
        alignItems: 'center',
        paddingHorizontal: Metrix.HorizontalSize(20),
    },
    title: {
        fontSize: normalizeFont(24),
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: Metrix.VerticalSize(8),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: normalizeFont(16),
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: normalizeFont(22),
        maxWidth: screenWidth * 0.8,
    },
});