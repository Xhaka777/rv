import Immutable, {ImmutableObject} from 'seamless-immutable';
import _ from 'lodash';

import Action from '../actions/Auth';

interface AppState {
  authorize: boolean;
  langChange: boolean;
  isFirstTime: boolean;
}

const initialState: ImmutableObject<AppState> = Immutable<AppState>({
  authorize: false,
  langChange: false,
  isFirstTime: false,
});

export default (state = initialState, action: {type: any; payload: any}) => {
  switch (action.type) {
    case Action.LOGIN_SUCCESS: {
      return Immutable(state).merge({
        authorize: action.payload,
      });
    }

    case Action.EMPTY_STATE_SUCCESS:
      return Immutable(initialState);

    case Action.CHANGE_ROUTE_ON_LANG: {
      return Immutable(state).merge({
        langChange: action.payload,
      });
    }

    case Action.FIRST_TIME: {
      return Immutable(state).merge({
        isFirstTime: action.payload,
      });
    }

    default:
      return state;
  }
};
