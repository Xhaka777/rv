import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Image,
    TouchableOpacity,
    Alert,
    Switch,
    ScrollView,
    Linking,
    NativeModules,
} from 'react-native';
import {
    BackHeader,
    CustomText,
    MainContainer,
    RoundImageContainer,
} from '../../../components';
import { Images, Metrix, NavigationService, Utills } from '../../../config';
import { BodyCamProps } from '../../propTypes';
import { Mic } from 'lucide-react-native';
import { Microphone } from '@fortawesome/react-native-fontawesome'
import { useFocusEffect } from '@react-navigation/native';
import { HomeActions } from '../../../redux/actions';
import { useDispatch, useSelector } from 'react-redux';
import { normalizeFont } from '../../../config/metrix';
import { SiriShortcutsService } from '../../../services/siriShortcuts';
import { RootState } from '../../../redux/reducers';

export const BodyCam: React.FC<BodyCamProps> = ({ navigation }) => {
    const dispatch = useDispatch();

    const activeTimer = useSelector((state: RootState) => state.home.activeTimer || '30m');

    const handleTimerSelection = (timer: string) => {
        dispatch(HomeActions.setActiveTimer(timer));

        Alert.alert('Timer Set', `Active timer set to ${timer}`);
    }

    // const [selectedTimer, setSelectedTimer] = useState('30m');
    const [timeoutAlerts, setTimeoutAlerts] = useState(true);
    const [interruptionAlerts, setInterruptionAlerts] = useState(true);

    const [showSiriModal, setShowSiriModal] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            dispatch(HomeActions.setCameraMode('AUDIO'));
        }, [dispatch])
    );

    const timerOptions = ['15m', '30m', '45m', '60m'];

    useEffect(() => {
        console.log('SiriShortcutManager available?', !!NativeModules.SiriShortcutManager);
        if (NativeModules.SiriShortcutManager) {
            console.log('SiriShortcutManager methods:', Object.keys(NativeModules.SiriShortcutManager));
        }
    }, []);

    const handleTrainSiri = () => {
        NavigationService.navigate('SiriSetupScreen');
    };

    return (
        <MainContainer
            customeStyle={{
                paddingVertical: 0,
                flex: 1,
            }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}>

                {/* Standardized Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerContent}>
                        <Image
                            source={Images.Premium}
                            style={styles.headsUpIcon}
                            resizeMode="contain"
                        />
                        <CustomText.LargeBoldText customStyle={styles.headerTitle}>
                            Bodycam Mode
                        </CustomText.LargeBoldText>
                    </View>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.exitButton}>
                        <Image
                            source={Images.Exit}
                            style={{ width: 20, height: 20, tintColor: '#ffffff' }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>


                {/* BodyCam Mode Section */}
                <View style={styles.section}>
                    <CustomText.RegularText
                        customStyle={{
                            marginTop: Metrix.VerticalSize(15),
                            lineHeight: 20,
                            fontSize: normalizeFont(15)
                        }}>
                        Turn your phone into an assault-monitoring bodycam that streams to your Responders if a threat is detected. Records from both sides and auto-adjusts if flipped.
                    </CustomText.RegularText>

                    <View style={styles.imageContainer}>
                        <Image source={Images.OnBoard4} style={styles.bodycamImage} resizeMode="cover" />
                    </View>
                </View>

                {/* Arming the Bodycam Section */}
                <View style={styles.section}>
                    <CustomText.LargeBoldText customStyle={styles.sectionTitle}>
                        Arming the Bodycam
                    </CustomText.LargeBoldText>
                    <View style={styles.armingInstructions}>
                        <CustomText.RegularText
                            customStyle={{
                                marginTop: Metrix.VerticalSize(15),
                                lineHeight: 20,
                                fontSize: normalizeFont(15)
                            }}>
                            Tap the Arm button{' '}
                            <CustomText.RegularText customStyle={styles.pointingFinger}>👉</CustomText.RegularText>
                            {' '}
                            <View style={styles.inlineIcon}>
                                <Image source={Images.PremiumArm} style={styles.armIcon} resizeMode="contain" />
                            </View>
                            {' '}to prepare the bodycam. Once armed, your screen goes dark, but Rove is ready to launch a stream{' '}
                            <CustomText.RegularText customStyle={styles.italicText}>instantly</CustomText.RegularText>.
                        </CustomText.RegularText>
                    </View>

                    <View style={styles.armingInstructions}>
                        <CustomText.RegularText
                            customStyle={{
                                marginTop: Metrix.VerticalSize(15),
                                lineHeight: 20,
                                fontSize: normalizeFont(15)
                            }}>
                            ⚠️ If you switch to another app while armed, only audio protection will remain active until you re-arm.
                        </CustomText.RegularText>
                    </View>

                </View>

                {/* Siri Shortcut Section */}
                <View style={styles.section}>
                    <CustomText.LargeBoldText customStyle={styles.sectionTitle}>
                        Siri Shortcut
                    </CustomText.LargeBoldText>
                    <CustomText.RegularText
                        customStyle={{
                            marginTop: Metrix.VerticalSize(15),
                            lineHeight: 20,
                            fontSize: normalizeFont(15),
                            marginBottom: 10,
                        }}>
                        Set your Siri arming sentence to quickly arm Bodycam ( (e.g. "Siri, arm Body Cam") to prepare the bodycam's detection feature.
                    </CustomText.RegularText>

                    <TouchableOpacity style={styles.trainSiriButton} onPress={handleTrainSiri}>
                        <CustomText.MediumText customStyle={styles.trainSiriText}>
                            Train Siri
                        </CustomText.MediumText>
                    </TouchableOpacity>

                    <View style={styles.siriImageContainer}>
                        <Image source={Images.BodyCamPerson} style={styles.siriImage} resizeMode="cover" />
                        <View style={styles.siriOverlay}>
                            <CustomText.RegularText customStyle={styles.siriText}>
                                Hey Siri, Arm Body Cam...
                            </CustomText.RegularText>
                        </View>
                    </View>

                    <View style={styles.armingInstructions}>
                        <CustomText.RegularText
                            customStyle={{
                                marginTop: Metrix.VerticalSize(15),
                                lineHeight: 20,
                                fontSize: normalizeFont(15)
                            }}>
                            ⚠️ Password or Face ID is required to arm the bodycam with Siri.
                        </CustomText.RegularText>
                    </View>

                    {/* Set Active Timer */}
                    <View style={styles.timerSection}>
                        <CustomText.LargeBoldText customStyle={styles.sectionTitle}>
                            Set 'Active' Timer
                        </CustomText.LargeBoldText>
                        <CustomText.RegularText
                            customStyle={{
                                marginTop: Metrix.VerticalSize(15),
                                lineHeight: 20,
                                fontSize: normalizeFont(15)
                            }}>
                            Choose how long the threat detection stays active after arming. Longer time equals slightly faster battery drain.
                        </CustomText.RegularText>

                        <View style={styles.timerButtons}>
                            {timerOptions.map((timer) => (
                                <TouchableOpacity
                                    key={timer}
                                    style={[
                                        styles.timerButton,
                                        activeTimer === timer && styles.selectedTimerButton
                                    ]}
                                    onPress={() => handleTimerSelection(timer)}
                                >
                                    <CustomText.MediumText customStyle={[
                                        styles.timerButtonText,
                                        activeTimer === timer && styles.selectedTimerText
                                    ]}>
                                        {timer}
                                    </CustomText.MediumText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Notifications Section */}
                    <View style={styles.notificationsSection}>
                        <CustomText.LargeBoldText customStyle={styles.sectionTitle}>
                            Notifications
                        </CustomText.LargeBoldText>

                        <View style={styles.notificationRow}>
                            <CustomText.RegularText customStyle={styles.notificationLabel}>
                                Bodycam timeout alerts
                            </CustomText.RegularText>
                            <Switch
                                value={timeoutAlerts}
                                onValueChange={setTimeoutAlerts}
                                trackColor={{ false: '#767577', true: '#34C759' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View style={styles.notificationRow}>
                            <CustomText.RegularText customStyle={styles.notificationLabel}>
                                Interruption alerts
                            </CustomText.RegularText>
                            <Switch
                                value={interruptionAlerts}
                                onValueChange={setInterruptionAlerts}
                                trackColor={{ false: '#767577', true: '#34C759' }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </MainContainer>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        backgroundColor: Utills.selectedThemeColors().Base,
        paddingVertical: 0, // Changed from 20 to 0
        flex: 1,
    },
    scrollContent: {
        paddingBottom: Metrix.VerticalSize(30),
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Metrix.VerticalSize(8),
        borderBottomWidth: 1,
        borderBottomColor: Utills.selectedThemeColors().TextInputBorderColor,
        marginBottom: Metrix.VerticalSize(20),
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headsUpIcon: {
        width: Metrix.HorizontalSize(28),
        height: Metrix.VerticalSize(28),
        tintColor: Utills.selectedThemeColors().PrimaryTextColor,
        marginRight: Metrix.HorizontalSize(5),
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
    section: {
        marginBottom: Metrix.VerticalSize(20),
    },
    sectionTitle: {
        fontSize: Metrix.customFontSize(20),
        fontWeight: '800',
        color: Utills.selectedThemeColors().PrimaryTextColor,
        marginBottom: Metrix.VerticalSize(6),
        marginTop: Metrix.VerticalSize(6)
    },
    sectionDescription: {
        fontSize: Metrix.customFontSize(16),
        color: Utills.selectedThemeColors().PrimaryTextColor,
        lineHeight: Metrix.VerticalSize(22),
        marginBottom: Metrix.VerticalSize(20),
        fontWeight: '600'
    },
    italicText: {
        fontStyle: 'italic',
    },
    pointingFinger: {
        fontSize: Metrix.customFontSize(16),
    },
    inlineIcon: {
        width: Metrix.HorizontalSize(20),
        height: Metrix.VerticalSize(15),
        backgroundColor: 'transparent',
        borderRadius: Metrix.HorizontalSize(10),
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Metrix.HorizontalSize(4),
    },
    armIcon: {
        width: Metrix.HorizontalSize(30),
        height: Metrix.VerticalSize(30),
        tintColor: Utills.selectedThemeColors().PrimaryTextColor,
        marginTop: 10,
    },
    imageContainer: {
        overflow: 'hidden',
        marginTop: Metrix.VerticalSize(10),
        alignItems: 'center',
        width: '100%',
    },
    bodycamImage: {
        width: '100%',
        height: Metrix.VerticalSize(300),
    },
    armingInstructions: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        padding: Metrix.HorizontalSize(16),
        borderRadius: Metrix.HorizontalSize(12),
        marginTop: Metrix.VerticalSize(20),
    },
    warningTriangle: {
        fontSize: Metrix.customFontSize(20),
        marginRight: Metrix.HorizontalSize(12),
    },
    warningText: {
        fontSize: Metrix.customFontSize(16),
        color: Utills.selectedThemeColors().PrimaryTextColor,
        lineHeight: Metrix.VerticalSize(20),
        flex: 1,
        fontWeight: '700',
        marginTop: 10
    },
    trainSiriButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#60636c',
        paddingVertical: Metrix.VerticalSize(16),
        paddingHorizontal: Metrix.HorizontalSize(24),
        borderRadius: Metrix.HorizontalSize(10),
        marginBottom: Metrix.VerticalSize(20),
    },
    micEmoji: {
        fontSize: Metrix.customFontSize(20),
        marginRight: Metrix.HorizontalSize(8),
    },
    trainSiriText: {
        fontSize: Metrix.customFontSize(16),
        color: '#fff',
        fontWeight: '700',
    },
    siriImageContainer: {
        position: 'relative',
        overflow: 'hidden',
        marginBottom: Metrix.VerticalSize(20),
        alignItems: 'center',
    },
    siriImage: {
        width: '100%',
        height: Metrix.VerticalSize(200),
    },
    siriOverlay: {
        position: 'absolute',
        bottom: Metrix.VerticalSize(60),
        right: Metrix.HorizontalSize(20),
        paddingVertical: Metrix.VerticalSize(8),
        paddingHorizontal: Metrix.HorizontalSize(16),
        borderRadius: Metrix.HorizontalSize(20),
    },
    siriText: {
        color: '#FFFFFF',
        fontSize: Metrix.customFontSize(16),
        fontStyle: 'italic',
        fontWeight: '700'
    },
    timerSection: {
        marginTop: Metrix.VerticalSize(30),
    },
    timerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Metrix.VerticalSize(16),
    },
    timerButton: {
        backgroundColor: '#60636c',
        paddingVertical: Metrix.VerticalSize(12),
        paddingHorizontal: Metrix.HorizontalSize(20),
        borderRadius: Metrix.HorizontalSize(8),
        minWidth: Metrix.HorizontalSize(70),
        alignItems: 'center',
    },
    selectedTimerButton: {
        borderColor: '#007AFF',
        borderWidth: 1,
    },
    timerButtonText: {
        color: '#FFFFFF',
        fontSize: Metrix.customFontSize(16),
        fontWeight: '600',
    },
    selectedTimerText: {
        color: '#FFFFFF',
    },
    notificationsSection: {
        marginTop: Metrix.VerticalSize(30),
    },
    notificationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Metrix.VerticalSize(16),
    },
    notificationLabel: {
        fontSize: Metrix.customFontSize(16),
        color: Utills.selectedThemeColors().PrimaryTextColor,
        flex: 1,
        fontWeight: '600'
    },
});