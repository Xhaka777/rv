import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    PanResponder,
    Dimensions,
} from 'react-native';
import {
    CustomText,
    MainContainer,
    PrimaryButton,
} from '../../../components';
import {
    Images,
    Metrix,
    NavigationService,
    Utills
} from '../../../config';
import Slider from '@react-native-community/slider';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../redux/reducers';
import { HomeActions } from '../../../redux/actions';

const { width: screenWidth } = Dimensions.get('window');

export const HeadsUpSettings: React.FC = () => {
    const dispatch = useDispatch();

    const selectedRadius = useSelector((state: RootState) => state.home.headsUpRadius || 3);

    const minRadius = 1;
    const maxRadius = 10;

    const handleRadiusChange = (value: number) => {
        const newRadius = Math.round(value);
        dispatch(HomeActions.setHeadsUpRadius(newRadius));
        // setSelectedRadius(Math.round(value));
    };

    const handleBack = () => {
        NavigationService.goBack();
    };

    const formatRadiusLabel = (value: number): string => {
        return `${value}km`;
    };

    return (
        <MainContainer
            customeStyle={{
                paddingVertical: 0,
                flex: 1,
            }}>

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Image
                        source={Images.Premium}
                        style={styles.headsUpIcon}
                        resizeMode="contain"
                    />
                    <CustomText.LargeBoldText customStyle={styles.headerTitle}>
                        Heads Up Alert Settings
                    </CustomText.LargeBoldText>
                </View>
                <TouchableOpacity onPress={handleBack} style={styles.exitButton}>
                    <Image
                        source={Images.Exit}
                        style={{ width: 20, height: 20, tintColor: '#ffffff' }}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.descriptionContainer}>
                    <CustomText.RegularText customStyle={styles.descriptionText}>
                        Set how far around you alerts should appear. This radius is always centered on your live location and updates as you move.
                    </CustomText.RegularText>

                    <View style={styles.radiusInfo}>
                        <CustomText.SmallText customStyle={styles.radiusInfoText}>
                            Large radius = more alerts
                        </CustomText.SmallText>
                        <CustomText.SmallText customStyle={styles.radiusInfoText}>
                            Small radius = fewer alerts
                        </CustomText.SmallText>
                    </View>
                </View>

                <View style={styles.radarContainer}>
                    <View style={styles.radarBar}>
                        <View style={styles.horizontalRadarContent}>
                            <Image
                                source={Images.RadarCircle}
                                resizeMode="contain"
                                style={styles.radarIcon}
                            />

                            <Slider
                                style={styles.horizontalRadarSlider}
                                minimumValue={minRadius}
                                maximumValue={maxRadius}
                                value={selectedRadius}
                                onValueChange={handleRadiusChange}
                                step={1}
                                minimumTrackTintColor="#007AFF"
                                maximumTrackTintColor="#E0E0E0"
                                thumbStyle={styles.sliderThumb}
                                thumbTintColor='#007AFF'
                            />

                            <CustomText.MediumText customStyle={styles.horizontalLabel}>
                                {formatRadiusLabel(selectedRadius)}
                            </CustomText.MediumText>
                        </View>
                    </View>
                </View>

            </View>
        </MainContainer>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Metrix.VerticalSize(8),
        borderBottomWidth: 1,
        borderBottomColor: Utills.selectedThemeColors().TextInputBorderColor,
        marginBottom: Metrix.VerticalSize(20), // Add this line
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headsUpIcon: {
        width: Metrix.HorizontalSize(28), // Changed from 32 to 28
        height: Metrix.VerticalSize(28), // Changed from 32 to 28
        tintColor: Utills.selectedThemeColors().PrimaryTextColor,
        marginRight: Metrix.HorizontalSize(5), // Changed from 10 to 5
    },
    headerTitle: {
        fontSize: Metrix.customFontSize(18),
        fontWeight: '600',
        color: Utills.selectedThemeColors().PrimaryTextColor,
    },
    exitButton: {
        padding: Metrix.HorizontalSize(8),
        marginLeft: Metrix.HorizontalSize(10),
    },
    exitIcon: {
        width: Metrix.HorizontalSize(14),
        height: Metrix.VerticalSize(14),
        tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    },
    content: {
        flex: 1,
        // paddingHorizontal: Metrix.HorizontalSize(20),
        paddingTop: Metrix.VerticalSize(30),
    },
    descriptionContainer: {
        marginBottom: Metrix.VerticalSize(40),
    },
    descriptionText: {
        fontSize: Metrix.customFontSize(16),
        lineHeight: Metrix.VerticalSize(24),
        color: Utills.selectedThemeColors().PrimaryTextColor,
        marginBottom: Metrix.VerticalSize(20),
    },
    radiusInfo: {
        gap: Metrix.VerticalSize(5),
    },
    radiusInfoText: {
        fontSize: Metrix.customFontSize(14),
        color: Utills.selectedThemeColors().PrimaryTextColor,
    },
    radarContainer: {
        marginBottom: Metrix.VerticalSize(40),
    },
    radarBar: {
        backgroundColor: Utills.selectedThemeColors().PrimaryTextColor,
        borderRadius: Metrix.HorizontalSize(10),
        paddingHorizontal: Metrix.HorizontalSize(16),
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 15,
    },
    horizontalRadarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Metrix.VerticalSize(4),
    },
    radarIcon: {
        width: 26,
        height: 26,
        tintColor: 'rgba(136, 136, 136, 0.95)'
    },
    horizontalRadarSlider: {
        flex: 1,
        height: Metrix.VerticalSize(30),
        marginHorizontal: Metrix.HorizontalSize(12),
    },
    horizontalLabel: {
        color: 'rgba(136, 136, 136, 0.95)',
        fontSize: Metrix.customFontSize(16),
        fontWeight: '600',
        minWidth: Metrix.HorizontalSize(40),
        textAlign: 'center',
        marginLeft: Metrix.HorizontalSize(8),
    },
    sliderThumb: {
        backgroundColor: '#007AFF',
        width: Metrix.HorizontalSize(20),
        height: Metrix.VerticalSize(20),
    },
    radiusDisplay: {
        alignItems: 'center',
        marginBottom: Metrix.VerticalSize(40),
    },
    radiusValue: {
        fontSize: Metrix.customFontSize(32),
        fontWeight: '700',
        color: Utills.selectedThemeColors().PrimaryTextColor,
        marginBottom: Metrix.VerticalSize(5),
    },
    radiusSubtext: {
        fontSize: Metrix.customFontSize(14),
        color: Utills.selectedThemeColors().SecondaryTextColor,
    },
    saveButtonContainer: {
        marginTop: 'auto',
        paddingBottom: Metrix.VerticalSize(30),
    },
    saveButton: {
        borderRadius: Metrix.HorizontalSize(12),
    },
});