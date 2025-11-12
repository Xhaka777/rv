import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import {
  CustomText,
  MainContainer,
  RoundImageContainer,
} from '../../../components';
import { Images, Metrix, Utills } from '../../../config';
import { PremiumProps } from '../../propTypes';
import { useDispatch } from 'react-redux';
import { HomeActions } from '../../../redux/actions';
import { useFocusEffect } from '@react-navigation/native';

const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    priceAmount: null,
    features: [
      '1 device',
      'Auto assault detection with instant livestream activation',
      'Safe word trigger',
      '7 day cloud storage',
      'Manual or safe word activated livestream (max 2/month)',
      '1 Fail-safe broadcast: If one channel fails (e.g no internet), Rove falls back to SMS to alert your responder with a warning and location.'
    ],
    isCurrentPlan: true,
    hasEverythingFrom: null,
  },
  {
    id: 'aura',
    name: 'Aura',
    price: '€5.99/month',
    priceAmount: '€5.99',
    features: [
      'Unlimited fail-safe broadcasts',
      'Smartwatch integration (works by itself if sim-activated)',
      'Neck-worn bodycam with automatic assault detection',
      '10 manual or safe word activated livestreams/month',
    ],
    isCurrentPlan: false,
    hasEverythingFrom: 'Basic',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    price: '€14.99/month',
    priceAmount: '€14.99',
    features: [
      'Travel coverage',
      'Smart glasses integration',
      'Buffered 10s pre-incident recording',
      '20 manual or safe word activated livestreams/month',
    ],
    isCurrentPlan: false,
    hasEverythingFrom: 'Aura',
  },
];

export const Premium: React.FC<PremiumProps> = ({ }) => {
  const dispatch = useDispatch();

  const [selectedPlan, setSelectedPlan] = useState('basic');

  // useFocusEffect(
  //   React.useCallback(() => {
  //     dispatch(HomeActions.setCameraMode('AUDIO'));
  //   }, [dispatch])
  // );

  const renderPlanCard = (plan: any) => (
    <TouchableOpacity
      key={plan.id}
      style={[
        styles.planCard,
        selectedPlan === plan.id && styles.selectedPlanCard,
      ]}
      onPress={() => setSelectedPlan(plan.id)}
      activeOpacity={0.8}>

      {/* Plan Header */}
      <View style={styles.planHeader}>
        <View style={styles.planIconContainer}>
          <Image
            source={Images.PremiumBlue}
            style={styles.premiumIcon}
            resizeMode="contain"
          />
          <CustomText.LargeBoldText customStyle={styles.yourPlanText}>
            Your plan
          </CustomText.LargeBoldText>
        </View>
      </View>

      {/* Plan Name and Price */}
      <View style={styles.planNameContainer}>
        <CustomText.LargeBoldText customStyle={styles.planName}>
          {plan.name}
        </CustomText.LargeBoldText>
        <CustomText.RegularText
          customStyle={styles.planPrice}
          isSecondaryColor>
          {plan.price}
        </CustomText.RegularText>

        {/* Horizontal line under price */}
        <View style={styles.priceUnderline} />
      </View>

      {/* Everything in [Plan] + title */}
      {plan.hasEverythingFrom && (
        <View style={styles.everythingInContainer}>
          <CustomText.RegularText customStyle={styles.everythingInText}>
            Everything in {plan.hasEverythingFrom} +
          </CustomText.RegularText>
        </View>
      )}

      {/* Features List */}
      <View style={styles.featuresContainer}>
        {plan.features.map((feature: string, index: number) => (
          <View key={index} style={styles.featureItem}>
            <CustomText.RegularText customStyle={styles.featureBullet}>
              •
            </CustomText.RegularText>
            <CustomText.RegularText customStyle={styles.featureText}>
              {feature}
            </CustomText.RegularText>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <MainContainer customeStyle={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerIcon}>
            <RoundImageContainer
              source={Images.Premium}
              circleWidth={28}
              backgroundColor="transparent"
              imageStyle={{
                tintColor: Utills.selectedThemeColors().PrimaryTextColor,
              }}
            />
          </View>
          <CustomText.LargeBoldText customStyle={styles.headerTitle}>
            Premium
          </CustomText.LargeBoldText>
        </View>

        {/* Main Heading */}
        <CustomText.ExtraLargeBoldText customStyle={styles.mainHeading}>
          Get even better protection with our premium tiers.
        </CustomText.ExtraLargeBoldText>

        {/* Available Plans Label */}
        <CustomText.LargeSemiBoldText customStyle={styles.availablePlansText}>
          Available plans
        </CustomText.LargeSemiBoldText>

        {/* Plans */}
        {subscriptionPlans.map(renderPlanCard)}

      </ScrollView>
    </MainContainer>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: Utills.selectedThemeColors().Base,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingBottom: Metrix.VerticalSize(30),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Metrix.VerticalSize(20),
    paddingTop: Metrix.VerticalSize(10),
  },
  headerIcon: {
    marginRight: Metrix.HorizontalSize(5),
  },
  headerTitle: {
    fontSize: Metrix.customFontSize(18),
    fontWeight: '600',
  },
  mainHeading: {
    fontSize: Metrix.customFontSize(28),
    lineHeight: 36,
    marginBottom: Metrix.VerticalSize(30),
    fontWeight: '700',
  },
  availablePlansText: {
    fontSize: Metrix.customFontSize(20),
    marginBottom: Metrix.VerticalSize(20),
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Metrix.HorizontalSize(12),
    padding: Metrix.HorizontalSize(16),
    marginBottom: Metrix.VerticalSize(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedPlanCard: {
    // borderColor: Utills.selectedThemeColors().PrimaryTextColor,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  planHeader: {
    marginBottom: Metrix.VerticalSize(12),
  },
  planIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIcon: {
    width: Metrix.HorizontalSize(30),
    height: Metrix.VerticalSize(30),
    // tintColor: Utills.selectedThemeColors().PrimaryTextColor,
    tintColor: '#4FC3F7',
    marginRight: Metrix.HorizontalSize(5),

  },
  yourPlanText: {
    // marginLeft: Metrix.HorizontalSize(5),
    fontSize: Metrix.customFontSize(18),
    color: '#fff',
  },
  planNameContainer: {
    marginBottom: Metrix.VerticalSize(16),
  },
  planName: {
    fontSize: Metrix.customFontSize(22),
    marginBottom: Metrix.VerticalSize(4),
    color: '#4FC3F7', // Blue color for plan names
    fontWeight: '700',
  },
  planPrice: {
    fontSize: Metrix.customFontSize(14),
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Metrix.VerticalSize(12),
  },
  priceUnderline: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '100%',
  },
  everythingInContainer: {
    marginBottom: Metrix.VerticalSize(16),
  },
  everythingInText: {
    fontSize: Metrix.customFontSize(14),
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontWeight: '500',
  },
  featuresContainer: {
    paddingTop: Metrix.VerticalSize(8),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Metrix.VerticalSize(8),
  },
  featureBullet: {
    color: Utills.selectedThemeColors().PrimaryTextColor,
    fontSize: Metrix.customFontSize(16),
    marginRight: Metrix.HorizontalSize(8),
    lineHeight: 22,
  },
  featureText: {
    flex: 1,
    fontSize: Metrix.customFontSize(14),
    lineHeight: 22,
    color: Utills.selectedThemeColors().PrimaryTextColor,
  },
});