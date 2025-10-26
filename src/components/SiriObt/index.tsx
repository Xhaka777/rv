import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { Images } from '../../config';

interface SiriOrbProps {
    isListening?: boolean;
    step?: number;
}

export default function SiriOrb({ isListening = false, step = 1 }: SiriOrbProps) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
        // Breathing animation
        scale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );

        // Subtle rotation
        rotation.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }),
            -1,
            false
        );

        // Pulsing opacity for listening state
        if (isListening) {
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.7, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1,
                true
            );
        } else {
            opacity.value = withTiming(1, { duration: 500 });
        }
    }, [isListening, step]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: scale.value },
                { rotate: `${rotation.value}deg` }
            ],
            opacity: opacity.value,
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.orbContainer, animatedStyle]}>
                <Image source={Images.LogoGray} style={styles.logo} resizeMode="contain" />

            </Animated.View>

            {/* Outer glow rings */}
            <Animated.View style={[styles.glowRing, styles.glowRing1, animatedStyle]} />
            <Animated.View style={[styles.glowRing, styles.glowRing2, animatedStyle]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orbContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    orb: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 100,
        height: 100,
    },
    innerOrb: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    highlight: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        position: 'absolute',
        top: 15,
        left: 25,
    },
    glowRing: {
        position: 'absolute',
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(69, 183, 209, 0.3)',
    },
    glowRing1: {
        width: 140,
        height: 140,
    },
    glowRing2: {
        width: 160,
        height: 160,
        borderColor: 'rgba(69, 183, 209, 0.15)',
    },
});
