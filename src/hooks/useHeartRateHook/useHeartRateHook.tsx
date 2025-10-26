import {useEffect, useState, useCallback} from 'react';
import AppleHealthKit, {HealthValue} from 'react-native-health';
import {HealthPermissions} from '../../permissonsServices';

const useHeartRateHook = () => {
  const [heartRate, setHearRateData] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const getHeartRate = useCallback(() => {
    setLoading(true);

    AppleHealthKit.initHealthKit(HealthPermissions, (initError: string) => {
      if (initError) {
        console.log('[ERROR] Cannot grant permissions!', initError);
        setError('Permission error');
        setLoading(false);
        return;
      }

      const options = {
        startDate: new Date(2020, 1, 1).toISOString(),
      };

      AppleHealthKit.getHeartRateSamples(
        options,
        (callbackError: string, results: HealthValue[]) => {
          if (callbackError) {
            console.log('[ERROR] Cannot read heart rate samples!');
          }
          console.log('Heart Rate Samples: ', results);
          const latestHeartRate = results.length > 0 ? results[0].value : null;
          setHearRateData(latestHeartRate);
        },
      );
    });
  }, []);

  useEffect(() => {
    getHeartRate();
  }, [getHeartRate]);

  return {
    heartRate: heartRate,
    loading,
    error,
    refresh: getHeartRate, // Expose this to refetch manually
  };
};

export default useHeartRateHook;
