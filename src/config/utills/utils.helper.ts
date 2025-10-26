import {Platform, Alert, Linking, PermissionsAndroid} from 'react-native';
import moment from 'moment';
import DataHandler from '../../services/dataHandler.service';
import {IMAGE_BASE_URL} from '../../services/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TIME1 = 'HH:mm';

class Util {
  getCurrentUserAccessToken(): string | undefined {
    return DataHandler?.getStore()?.getState()?.home.userDetails?.token;
  }

  getCurrentUserUUID(): string | undefined {
    return DataHandler.getStore().getState().user?.userDetail?.uuid;
  }

  updateCurrentUserAccessToken(token: string, refresh_token: string): void {
    let store = DataHandler.getStore();
    let user = store.getState().user || {};
    // store.dispatch(
    //   userSigninSuccess(user.userDetail.uuid, token, refresh_token),
    // );
  }

  userIsServiceProvider(): boolean {
    return (
      DataHandler.getStore().getState().user.data.user_type ===
      'service provider'
    );
  }

  getCurrentDate(): string {
    var currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth());
    var formatDate = `${currentDate.getFullYear()}-${
      currentDate.getMonth() + 1 < 10
        ? `0${currentDate.getMonth() + 1}`
        : currentDate.getMonth() + 1
    }-${('0' + currentDate.getDate()).slice(-2)}`;
    return formatDate;
  }

  getErrorText(error: string | string[]): string {
    if (error instanceof Array) {
      if (error.length > 0) return error[0];
    } else {
      return error;
    }
    return '';
  }

  isNumber(val: string): boolean {
    return /^\d+$/.test(val);
  }

  openLinkInBrowser(url: string): void {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
      }
    });
  }

  generateGetParameter(obj: {[key: string]: string}): string {
    let final = '?';
    for (const key in obj) {
      final = `${final}${key}=${obj[key]}&`;
    }
    final = final.slice(0, -1);
    return final;
  }

  isEmailValid(email: string): boolean {
    const re =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }
}

export const getTokenFromStorage = async (): Promise<any> => {
  try {
    const value = await AsyncStorage.getItem('userAuth');
    if (value !== null) {
      return Promise.resolve(JSON.parse(value));
    }
  } catch (error) {
    // Error retrieving data
  }
};

export const getObjectByKeys = <T extends {[key: string]: any}>(
  arr: T[],
  key: string = 'id',
  deleteKey: string | null = null,
): {[key: string]: T} => {
  let obj: {[key: string]: T} = {};
  arr.forEach(val => {
    obj[val[key]] = val;
    if (deleteKey) {
      delete obj[val[key]][deleteKey];
    }
  });
  return obj;
};

export const setTokenInStorage = (payload: any): void => {
  AsyncStorage.setItem('userAuth', JSON.stringify(payload), (err: any) => {
    if (err) {
      throw err;
    }
  }).catch((err: any) => {
    console.log(err);
  });
};

export const getIdsFromData = <T extends {[key: string]: any}>(
  data: T[],
  key: string = 'id',
): any[] => {
  return data?.map(item => item[key]);
};

export const getMediaPreview = (mediaPath: string): {uri: string} => {
  return {uri: `${IMAGE_BASE_URL}${mediaPath}`};
};

export const getConvertedTime = (date: Date): string => {
  return moment.utc(date).local().format('YYYY-MM-DD HH:mm:ss');
};

export default new Util();
