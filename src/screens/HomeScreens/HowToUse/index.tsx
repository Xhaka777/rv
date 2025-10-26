import React from 'react';
import { ScrollView, View, StyleSheet, Dimensions, ImageBackground, Text, TouchableOpacity, Image } from 'react-native';
import { HowToUseProps } from '../../propTypes';
import { BackHeader, CustomText, MainContainer, PrimaryButton, RoundImageContainer } from '../../../components';
import { Images, Metrix, Utills } from '../../../config';

import ExpandableSection from '../../../components/HowToUseSection/ExpandableSection';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const scenarios = [
  {
    title: 'Personal Body Cam',
    content: 'Lanyard Mode: Your Personal Body Cam\nWorn around your neck, Rove functions as a live body cam—streaming from the perfect angle when you\'re on the move or in tense situations. It can activate automatically, respond to your safe word, or be triggered manually if needed. Rove alerts your Responders with your live location and captures everything in real time so they can act when you\'re unable to. With Premium, pre-incident audio is also saved, so nothing slips through the cracks.'
  },
  {
    title: 'Public Harassment',
    content: 'In moments of street harassment or public threats, Rove activates discreetly through movement or voice cues, or with your safe word. Your Responders are instantly notified. Premium ensures the moments leading up to the incident are preserved, giving investigators critical context. Even with audio-only streaming, voice identification adds another layer of evidence.'
  },
  {
    title: 'Stay Safe Without Your Phone',
    content: 'Don\'t want to carry your phone while out running or walking alone? With Premium, Rove\'s smartwatch protection has you covered. Whether you\'re jogging in the park, out for a walk, or taking a short trip phone-free, Rove stays connected and ready. It can stream directly from the device, alert your Responders, and record incidents, all without needing your phone nearby. You stay lighter, but still looked after.'
  },
  {
    title: 'Safer Routes & Travel',
    content: 'Rove helps you navigate the world with more confidence by showing you where danger has been reported, so you can avoid trouble before it finds you. Whether you\'re walking home, visiting a new city, or commuting daily, Rove\'s map highlights areas flagged for harassment, assaults, or suspicious activity, based on real-time reports from users like you.'
  },
  {
    title: 'Late-Night Rides',
    content: 'Alone in a rideshare or taxi at night? Rove keeps silent watch. If an incident occurs, it starts streaming automatically or you can activate it with your safe word, so you are never truly alone.'
  },
  {
    title: 'Visible Responders for De-escalation',
    content: 'During a manual livestream, Rove displays who\'s currently watching or listening, right on your screen. Showing this to a potential attacker can act as a powerful deterrent, making it clear you\'re not alone and being monitored in real time. In many cases, this visibility helps can deescalate the situation before it turns worse.'
  },
  {
    title: 'Police Stops',
    content: 'During a police stop, Rove helps you livestream the interaction without escalating tension. If you\'re wearing your phone around your neck, or have it mounted in the car, a safe word can silently trigger live video.'
  },
  {
    title: 'ICE Encounters',
    content: 'During an ICE raid or stop, Rove reacts instantly. Just say your safe word to start recording while your location is shared and your legal contact is notified. Premium users benefit from buffered capture, preserving everything leading up to the moment. Crucially, nothing on your device indicates that recording is in progress, keeping you safer under pressure.'
  },
  {
    title: 'Border Crossings',
    content: 'Rove lets you discreetly document tense or aggressive encounters at borders. Start audio recording with your safe word or a subtle gesture, no visible signs will alert officials that recording is happening. Premium users benefit from buffered capture, ensuring the lead-up is saved and securely uploaded, even if your phone is taken.'
  },
  {
    title: 'Workplace Harassment',
    content: 'For ongoing abuse or repeated harassment, Rove offers discreet manual audio recording. You capture what\'s said without drawing attention and with Premium, even the moments before you press record are saved. Always check your local laws regarding recording.'
  }
];

export const HowToUse: React.FC<HowToUseProps> = ({ }) => {
  const handleReplayWalkthrough = () => {
    // Add your walkthrough replay logic here
    console.log('Replay walkthrough pressed');
  };

  return (
    <View style={styles.container}>
      {/* Background Image - Top 30% only */}
      <View style={styles.backgroundContainer}>
        <ImageBackground
          source={Images.HowTo}
          style={styles.backgroundImage}
          resizeMode="contain"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
            locations={[0, 0.5, 0.9, 1]}
            style={styles.backgroundGradient}
          />

        </ImageBackground>
      </View>

      {/* Black background for the rest */}
      <View style={styles.blackBackground} />

      {/* Content overlay */}
      <SafeAreaView style={styles.safeArea}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              {/* <View style={styles.logoIcon} /> */}
              <Image
                source={Images.Premium}
                style={styles.premiumIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.headerTitle}>How to use</Text>
          </View>
        </View>

        {/* Replay Quick Tour Button */}
        <TouchableOpacity style={styles.replayButton}>
          <Text style={styles.replayButtonText}>Replay Quick tour</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Real-World Scenarios Section */}
          <View style={styles.scenariosSection}>
            <Text style={styles.sectionTitle}>Real-World Scenarios</Text>
            <View style={styles.divider} />

            {scenarios.map((scenario, index) => (
              <ExpandableSection
                key={index}
                title={scenario.title}
                content={scenario.content}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.3, // 30% of screen height
    zIndex: 0,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  backgroundGradient: {
    flex: 1,
  },
  blackBackground: {
    position: 'absolute',
    top: height * 0.3,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
    marginTop: 80,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(35),
    height: Metrix.VerticalSize(35),
    marginRight: Metrix.HorizontalSize(5),
    tintColor: Utills.selectedThemeColors().PrimaryTextColor,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
  },
  replayButton: {
    backgroundColor: '#666666',
    borderRadius: 9,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginHorizontal: 20,
    marginBottom: 40,
    alignSelf: 'flex-start',
  },
  replayButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  scenariosSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 20,
  },
});