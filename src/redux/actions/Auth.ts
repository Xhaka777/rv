export default class Action {
  //Constants
  static EMPTY_STATE_SUCCESS = 'EMPTY_STATE_SUCCESS';
  static LOGIN_SUCCESS = 'LOGIN_SUCCESS';
  static CHANGE_ROUTE_ON_LANG = 'CHANGE_ROUTE_ON_LANG';
  static FIRST_TIME = 'FIRST_TIME';

  //Actions
  static loginSuccess(payload: any) {
    return {
      type: Action.LOGIN_SUCCESS,
      payload,
    };
  }

  static emptyState() {
    return {
      type: Action.EMPTY_STATE_SUCCESS,
    };
  }

  static changeRouteOnLang(payload: any) {
    return {
      type: Action.CHANGE_ROUTE_ON_LANG,
      payload,
    };
  }

  static setFirstTime(payload: any) {
    return {
      type: Action.FIRST_TIME,
      payload,
    };
  }
}
