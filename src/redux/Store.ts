import {applyMiddleware, compose, createStore} from 'redux';
import {persistStore, persistReducer} from 'redux-persist';
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2';
import storage from '@react-native-async-storage/async-storage';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './reducers';
import * as actionCreators from './actions';

const sagaMiddleware = createSagaMiddleware();
const middlewares = [sagaMiddleware];

const persistConfig = {
  key: 'root',
  storage,
  stateReconciler: autoMergeLevel2,
  whitelist: ['user', 'home'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
let store;

export default function configureStore(preloadedState: any, window: any) {
  const composeEnhancers =
    typeof window === 'object' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({actionCreators})
      : compose;

  const enhancer = composeEnhancers(applyMiddleware(...middlewares));

  store = createStore(persistedReducer, preloadedState, enhancer);
  const persistor = persistStore(store);
  return {
    persistor,
    runSaga: sagaMiddleware.run,
    store,
  };
}

export {store};
