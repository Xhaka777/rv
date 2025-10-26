import { StyleSheet, View, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { EntryWordProps, SafeWordProps } from '../../propTypes';
import {
    BackHeader,
    CustomText,
    MainContainer,
    PrimaryButton,
} from '../../../components';
import { Images, Metrix, Utills, NavigationService } from '../../../config';
import { Image } from 'react-native';
import { normalizeFont } from '../../../config/metrix';

export const EntryWord: React.FC<EntryWordProps> = ({ }) => {
    const [safeWord, setSafeWord] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleUpdateSafeWord = () => {
        // NavigationService.navigate
    }

    const togglePasswordVisibility = () => {
        setIsPasswordVisible(!isPasswordVisible);
    }

    const renderSafeWordDots = () => {
        // Assuming safe word has been set and we show dots for security
        const dotCount = 11; // Based on the UI showing 11 dots
        return (
            <View style={styles.safeWordContainer}>
                <View style={styles.dotsContainer}>
                    {Array.from({ length: dotCount }).map((_, index) => (
                        <View key={index} style={styles.dot} />
                    ))}
                </View>
                <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={togglePasswordVisibility}
                >
                    <Image
                        source={isPasswordVisible ? Images.Eye : Images.EyeAbleIcon}
                        style={styles.eyeIcon}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <MainContainer>
            <View style={styles.container}>
                <View style={styles.cardContainer}>
                    <View style={styles.titleContainer}>
                        <Image
                            source={Images.SafeWord} // Assuming you have a SafeWord icon
                            style={styles.safeWordIcon}
                            resizeMode="contain"
                        />
                        <CustomText.RegularText customStyle={styles.textHeading}>
                            Safe Word
                        </CustomText.RegularText>
                    </View>

                    <View style={styles.divider} />

                    <CustomText.RegularText customStyle={styles.sectionTitle}>
                        Voice profile trained and safe word set to:
                    </CustomText.RegularText>

                    {renderSafeWordDots()}

                    <CustomText.RegularText customStyle={styles.description}>
                        This phrase will activate Rove even if your phone is locked. Say it during an emergency to start livestreaming and alert your responders.
                    </CustomText.RegularText>

                    <View style={styles.proTipContainer}>
                        <CustomText.RegularText customStyle={styles.proTipEmoji}>
                            👉
                        </CustomText.RegularText>
                        <CustomText.RegularText customStyle={styles.proTipText}>
                            <CustomText.RegularText customStyle={styles.proTipBold}>
                                Pro tip:
                            </CustomText.RegularText>
                            {' '}You can also try it in a safe setting to see how it responds.
                        </CustomText.RegularText>
                    </View>

                    <PrimaryButton
                        title="Update safe word"
                        onPress={handleUpdateSafeWord}
                        customStyles={styles.updateButton}
                        customTextStyle={styles.buttonText}
                    />
                </View>
            </View>
        </MainContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: Metrix.HorizontalSize(2),
        paddingTop: Metrix.VerticalSize(40),
        backgroundColor: 'transparent',
    },
    cardContainer: {
        backgroundColor: '#333333',
        borderRadius: Metrix.HorizontalSize(20),
        paddingHorizontal: Metrix.HorizontalSize(20),
        paddingVertical: Metrix.VerticalSize(30),
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Metrix.VerticalSize(10),
    },
    safeWordIcon: {
        width: Metrix.HorizontalSize(35),
        height: Metrix.VerticalSize(35),
        marginRight: Metrix.HorizontalSize(10),
        tintColor: '#4A9EFF', // Blue color for the safe word icon
    },
    textHeading: {
        fontSize: normalizeFont(24),
        letterSpacing: 0.7,
        fontWeight: '600',
        lineHeight: 28,
        color: Utills.selectedThemeColors().PrimaryTextColor,
    },
    divider: {
        height: 1,
        backgroundColor: '#555555',
        marginBottom: Metrix.VerticalSize(20),
    },
    sectionTitle: {
        fontSize: normalizeFont(16),
        letterSpacing: 0.7,
        fontWeight: '400',
        marginBottom: Metrix.VerticalSize(15),
        lineHeight: 22,
        color: Utills.selectedThemeColors().PrimaryTextColor,
    },
    safeWordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4A4A4A',
        borderRadius: Metrix.HorizontalSize(12),
        paddingHorizontal: Metrix.HorizontalSize(15),
        paddingVertical: Metrix.VerticalSize(15),
        marginBottom: Metrix.VerticalSize(20),
    },
    dotsContainer: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
    },
    dot: {
        width: Metrix.HorizontalSize(8),
        height: Metrix.VerticalSize(8),
        borderRadius: Metrix.HorizontalSize(4),
        backgroundColor: '#FFFFFF',
        marginRight: Metrix.HorizontalSize(8),
    },
    eyeButton: {
        padding: Metrix.HorizontalSize(5),
    },
    eyeIcon: {
        width: Metrix.HorizontalSize(24),
        height: Metrix.VerticalSize(24),
        tintColor: '#CCCCCC',
    },
    description: {
        fontSize: normalizeFont(15),
        letterSpacing: 0.7,
        fontWeight: '400',
        marginBottom: Metrix.VerticalSize(20),
        lineHeight: 22,
        color: Utills.selectedThemeColors().PrimaryTextColor,
    },
    proTipContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: Metrix.VerticalSize(30),
    },
    proTipEmoji: {
        fontSize: normalizeFont(16),
        marginRight: Metrix.HorizontalSize(8),
        marginTop: Metrix.VerticalSize(2),
    },
    proTipText: {
        fontSize: normalizeFont(15),
        letterSpacing: 0.7,
        fontWeight: '400',
        lineHeight: 22,
        color: Utills.selectedThemeColors().PrimaryTextColor,
        flex: 1,
    },
    proTipBold: {
        fontWeight: '600',
    },
    updateButton: {
        width: '100%',
        alignSelf: 'center',
        backgroundColor: '#60636c',
        borderRadius: Metrix.HorizontalSize(12),
        paddingVertical: Metrix.VerticalSize(15),
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: normalizeFont(16),
    },
});