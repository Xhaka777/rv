import {CommonActions, StackActions} from '@react-navigation/native';

let _navigator: {dispatch: (arg0: any) => void};

function setTopLevelNavigator(navigatorRef: any) {
  _navigator = navigatorRef;
}

function navigate(routeName: any, params?: any) {
  _navigator.dispatch(
    CommonActions.navigate({
      name: routeName,
      params,
    }),
  );
}

function goBack() {
  _navigator.dispatch(CommonActions.goBack());
}

function reset_0(routeName: any, params?: any) {
  _navigator.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [{name: routeName, params}],
    }),
  );
}

function push(routeName: any, params?: any) {
  _navigator.dispatch(StackActions.push(routeName, params));
}

function replace(routeName: any, params?: any) {
  _navigator.dispatch(StackActions?.replace(routeName, params));
}

export default {
  setTopLevelNavigator,
  navigate,
  replace,
  goBack,
  reset_0,
  push,
};
