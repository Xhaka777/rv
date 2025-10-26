import {NativeModules} from 'react-native';

class DataHandler {
  store: any;
  recentlyLoggedIn: boolean = false;
  appLozic: any = NativeModules.ApplozicChat;

  setStore(store: any) {
    this.store = store;
  }

  setRecentlyLoggedIn(recentlyLoggedIn: boolean) {
    this.recentlyLoggedIn = recentlyLoggedIn;
  }

  getStore() {
    return this.store;
  }


  getRecentlyLoggedIn() {
    return this.recentlyLoggedIn;
  }

  loginOnApplozic({
    name,
    id,
    details,
  }: {
    name: string;
    id: string;
    details: {phone: string};
  }) {
    const alUser = {
      userId: id.toString(),
      password: '123456',
      authenticationTypeId: 1,
      applicationId: '28c72ffb2e78f227949b0c77107646138',
      deviceApnsType: 0,
      displayName: name,
      contactNumber: details.phone,
    };

    this.appLozic.login(alUser, (error: any, response: any) => {
      if (error) {
        // authentication failed callback
        // console.log(error);
      } else {
        // console.log(response);
      }
    });
  }

  getAppLozic() {
    return this.appLozic;
  }
}

export default new DataHandler();
