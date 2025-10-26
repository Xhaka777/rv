import { combineReducers } from "redux";
import user from "./user";
import home from "./home";

const rootReducer = combineReducers({
  user,
  home,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
