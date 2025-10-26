import React from 'react';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { AuthStack } from './AuthStack';
import { HomeStack } from './HomeStack';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/reducers';
import { RouteNames } from '../config';

export const MainStack = () => {
  const MainStack = createStackNavigator();
  const authorize = useSelector((state: RootState) => state?.user?.authorize);


  const AuthScreens = AuthStack?.map(stack => (
    <MainStack.Screen
      key={stack.key}
      name={stack.name}
      component={stack.component}
    />
  ));
  const HomeScreens = HomeStack?.map(stack => (
    <MainStack.Screen
      key={stack.key}
      name={stack.name}
      component={stack.component}
      options={stack.option}
    />
  ));

  return (
    <>
      <MainStack.Navigator
        initialRouteName={RouteNames.HomeRoutes.TabStack}
        screenOptions={{
          headerShown: false,
          ...TransitionPresets.DefaultTransition,
        }}>
        {authorize ? HomeScreens : AuthScreens}
        {/* {HomeScreens} */}
      </MainStack.Navigator>
    </>
  );
};
