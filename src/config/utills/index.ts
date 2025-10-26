import Toast from 'react-native-toast-message';
import moment from 'moment';
import {Platform} from 'react-native';
import {AuthActions} from '../../redux/actions';
import DataHandler from '../../services/dataHandler.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DarkModColors, DefaultColors} from '..';
const passwordRegex =
  /^.*(?=.{3,})(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[\d\x])(?=.*[@!$#&*%^]).*$/;
// const passwordRegex = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])([^\s]){8,16}$/;
const emailRegex = /^\w+([\.-]?\w+)*@{1}\w+([\.-]?\w+)*(\.[a-zA-Z]{2,3})+$/;

const fullNameRegex =
  /^([a-zA-Z]+|[a-zA-Z]+\s{1}[a-zA-Z]{1,}|[a-zA-Z]+\s{1}[a-zA-Z]{3,}\s{1}[a-zA-Z]{1,})$/;

const phoneNoRegex =
  /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

function validatePassword(password: string): boolean {
  return passwordRegex.test(password);
}

function validatePhoneNumber(phone: string): boolean {
  return phoneNoRegex.test(phone);
}

function validateEmail(email: string): boolean {
  return emailRegex.test(email);
}

function validateAlpha(name: string): boolean {
  return fullNameRegex.test(name);
}

function showToast(
  message?: string,
  error?: {msg: string} | null,
  status?: 'info' | 'success' | 'error' | 'warning',
  visibilityTime?: number,
) {
  let err = error?.msg;
  // console.log('inshowtoast-----', err, message);
  if (err === 'timeout of 10000ms exceeded') {
    Toast.show({
      text1: 'Connectivity Issue',
      bottomOffset: Platform.OS === 'android' ? 10 : 30,
      type: status || 'info',
      visibilityTime: visibilityTime || 2000,
      position: 'top',
    });
  } else if (err === 'Network Error') {
    Toast.show({
      text1: 'You have lost internet connection',
      type: status || 'info',
      bottomOffset: Platform.OS === 'android' ? 10 : 30,
      visibilityTime: visibilityTime || 2000,
      position: 'top',
    });
  } else if (message === 'Login to access') {
    const clear = async () => {
      await DataHandler.getStore().dispatch(AuthActions.emptyState());
      await AsyncStorage.setItem('userData', '');
      await AsyncStorage.removeItem('userData');
      await DataHandler.getStore().dispatch(AuthActions.loginSuccess(false));
    };
    clear();
    Toast.show({
      text1: 'User does not exist',
      type: status || 'info',
      bottomOffset: Platform.OS === 'android' ? 10 : 30,
      visibilityTime: visibilityTime || 2000,
      position: 'top',
    });
  } else {
    Toast.show({
      text1: message || 'Something Went Wrong',
      bottomOffset: Platform.OS === 'android' ? 10 : 30,
      type: status || 'info',
      visibilityTime: visibilityTime || 3000,
      position: 'top',
    });
  }
}

const timeHumanize = (time: string): string => {
  let current_time: any = moment().format('x');
  // let local_time = moment.utc(time).toDate();
  let to_local = moment(time).format('YYYY-MM-DD HH:mm:ss');
  let that_time: any = moment(to_local).format('x');
  let diff = current_time - that_time;

  var final_time = Math.floor(diff / 1000 / 60);
  if (final_time < 1) {
    return 'just now';
  } else if (final_time >= 1 && final_time < 60) {
    if (final_time < 2) {
      return `${final_time} min ago`;
    } else {
      return `${final_time} min ago`;
    }
  } else if (final_time >= 60 && final_time < 1440) {
    let new_hour = Math.floor(final_time / 60);
    if (new_hour <= 1) {
      return `${new_hour} hour ago`;
    } else {
      return `${new_hour} hours ago`;
    }
  } else {
    return moment(time).calendar(null, {
      lastDay: `[yesterday ${moment(time).format('hh:mm A')}]`,
      lastWeek: `[${moment(time).format('DD, MMM YYYY  hh:mm A')}]`,
      sameElse: `[${moment(time).format('DD, MMM YYYY  hh:mm A')}]`,
    });
  }
};

const currentThemeColors = () =>
  DataHandler?.getStore()?.getState()?.home?.darkMode;

let selectedThemeColors = () =>
  currentThemeColors() ? DarkModColors : DefaultColors;

export default {
  validatePassword,
  validateAlpha,
  validateEmail,
  validatePhoneNumber,
  showToast,
  timeHumanize,
  // currentThemeColors,
  selectedThemeColors,
};
