import axios, {AxiosRequestConfig} from 'axios';
import util from '../config/utills/utils.helper';
import {V1_BASE_URL, BASE_URL, BASE_PATH, API_TIMEOUT} from './config';

const customAxios = (contentType: string = 'application/json') => {
  const instance = axios.create({
    baseURL: BASE_URL,
    headers: {'Content-Type': contentType},
    timeout: API_TIMEOUT,
  });

  instance.interceptors.request.use(async (config: any) => {
    var token = util.getCurrentUserAccessToken();

    console.log('TOKEN---', token);
    console.log('Base Urll =====', BASE_URL);
    console.log('urlllll=====', config?.url);

    if (token) {
      config.headers = {
        ...config.headers,
        authorization: `Bearer ${token}`,
      };
    }

    return config;
  });

  return instance;
};

export default customAxios;
