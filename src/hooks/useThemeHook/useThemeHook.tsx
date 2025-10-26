import {useSelector, useDispatch} from 'react-redux';
import {RootState} from '../../redux/reducers';
import {HomeActions} from '../../redux/actions';
import {Colors as DefaultColors, DarkModColors} from '../../config';

const useThemeHook = () => {
  const isDarkMode = useSelector((state: RootState) => state?.home?.darkMode);

  const dispatch = useDispatch();

  const toggle = () => {
    dispatch(HomeActions.setDarkMode()); // Dispatch the toggleTheme action
  };

  const Colors = isDarkMode ? DarkModColors : DefaultColors;

  return {
    isDarkMode,
    toggle,
    Colors,
    DarkModColors,
  };
};

export default useThemeHook;

// export let selectedTheme = (isDark?: boolean) =>
//   isDark ? DarkModColors : DefaultColors;
