import {FlatList, ScrollView, View, useWindowDimensions} from 'react-native';
import {HeartRateMonitorProps} from '../../propTypes';
import {
  BackHeader,
  CustomText,
  MainContainer,
  ModeSelector,
} from '../../../components';
import {useRoute} from '@react-navigation/native';
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from 'react-native-health';
import {HealthPermissions} from '../../../permissonsServices';
import moment from 'moment';
import {Metrix, Utills} from '../../../config';

import * as React from 'react';
import {TabView, SceneMap} from 'react-native-tab-view';

const renderScene = SceneMap({
  first: () => {
    return <View style={{borderWidth: 2, borderColor: 'red'}}></View>;
  },
  second: () => {
    return <View style={{borderWidth: 2, borderColor: 'green'}}></View>;
  },
});

const routes = [
  {key: 'first', title: 'First'},
  {key: 'second', title: 'Second'},
];

export const HeartRateMonitor: React.FC<HeartRateMonitorProps> = ({}) => {
  const layout = useWindowDimensions();
  const [index, setIndex] = React.useState(0);

  return <ModeSelector />;
};
