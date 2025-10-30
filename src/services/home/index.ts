import httpService from '../https.service';

// New Endpoints for ROVE
const getUserData = () => {
  return httpService().get(`accounts/profile/`);
};
const updateUser = (body: any) => {
  return httpService('multipart/form-data').put(`accounts/profile/`, body);
};

const getTrustedContacts = () => {
  return httpService().get('accounts/trusted-contacts/');
};

const editTrustedContact = (id: any, body: any) => {
  return httpService().put(`accounts/trusted-contacts/${id}/`, body);
};

const deleteTrustedContact = (id: any) => {
  return httpService().delete(`accounts/trusted-contacts/${id}/`);
};

const addTrustedContact = (body: any) => {
  return httpService().post('accounts/trusted-contacts/', body);
};

const getAgoraToken = (body: any) => {
  return httpService().post('accounts/fetch-rtc-token/', body);
};

const postMsg = (body: any) => {
  return httpService().post('accounts/stream/send-msg/', body);
};

const createSafeZones = (body: any) => {
  return httpService().post('accounts/safezones/', body);
};

const getSafeZones = () => {
  return httpService().get('accounts/safezones/');
};

const updateSafeZone = (id: any) => {
  return httpService().put(`accounts/safezones/${id}/`);
}

const deleteSafeZone = (id: any) => {
  return httpService().delete(`accounts/safezones/${id}/`);
};

const postIncidents = (body: any) => {
  console.log('🌐 [API DEBUG] postIncidents called with:', JSON.stringify(body, null, 2));
  return httpService().post('incidents/incidents/', body)
    .then(response => {
      console.log('🌐 [API DEBUG] postIncidents response:', JSON.stringify(response.data, null, 2));
      return response;
    })
    .catch(error => {
      console.error('🌐 [API DEBUG] postIncidents error:', error.response?.data || error);
      throw error;
    });
};


const startRecording = (body: any) => {
  console.log('🌐 [API DEBUG] startRecording called with:', JSON.stringify(body, null, 2));
  return httpService().post('incidents/start-recording/', body)
    .then(response => {
      console.log('🌐 [API DEBUG] startRecording response:', JSON.stringify(response.data, null, 2));
      return response;
    })
    .catch(error => {
      console.error('🌐 [API DEBUG] startRecording error:', error.response?.data || error);
      throw error;
    });
};

const stopRecording = (body: any) => {
  console.log('🌐 [API DEBUG] stopRecording called with:', JSON.stringify(body, null, 2));
  return httpService().post('incidents/stop-recording/', body)
    .then(response => {
      console.log('🌐 [API DEBUG] stopRecording Full Response:', JSON.stringify(response.data, null, 2));
      
      // Log specific Agora fields
      if (response.data?.incident_updated) {
        console.log('🌐 [API DEBUG] Incident Updated:');
        console.log('  - agora_video_link:', response.data.incident_updated.agora_video_link);
        console.log('  - agora_audio_link:', response.data.incident_updated.agora_audio_link);
        console.log('  - recording_type:', response.data.incident_updated.recording_type);
        console.log('  - live_link:', response.data.incident_updated.live_link);
      }
      
      return response;
    })
    .catch(error => {
      console.error('🌐 [API DEBUG] stopRecording error:', error.response?.data || error);
      throw error;
    });
};

const getIncidents = () => {
  return httpService().get('incidents/incidents/');
};

const deleteIncident = (id: any) => {
  return httpService().delete(`incidents/incidents/${id}/`);
};

const getIncidentDetail = (id: any) => {
  return httpService().get(`incidents/incidents/${id}/`);
};

const sendFeedback = (body: any) => {
  return httpService().post('incidents/feedback/', body);
};

const sendThreatReports = (body: any) => {
  const formData = new FormData();

  // Add regular fields as strings
  formData.append('user_id', body.user_id);
  formData.append('location', body.location);
  formData.append('latitude', body.latitude);
  formData.append('longitude', body.longitude);
  formData.append('timestamp', body.timestamp || new Date().toISOString()); // Add timestamp if not provided
  formData.append('description', body.description);
  formData.append('report_type', body.report_type);

  // Add automated threat specific fields
  if (body.is_automated) {
    formData.append('is_automated', 'true');
  }

  if (body.confirmed_status) {
    formData.append('confirmed_status', body.confirmed_status);
  }

  // Add image as binary data if it exists (automated threats won't have photos)
  if (body.photo) {
    formData.append('photo', {
      uri: body.photo,
      type: 'image/jpeg',
      name: `threat_image_${Date.now()}.jpg`,
    } as any);
  }

  return httpService().post('threat_reports/threat_reports/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

const getThreatReports = (latitude?: number, longitude?: number) => {
  let url = 'threat_reports/threat_reports/';

  // Add query parameters if latitude and longitude are provided
  if (latitude !== undefined && longitude !== undefined) {
    url += `?latitude=${latitude}&longitude=${longitude}`;
  }

  console.log('urlLLLLLLLLlll', url)
  return httpService().get(url);
};

const deleteThreatReport = (id: any) => {
  return httpService().delete(`threat_reports/threat_reports/${id}/`);
};

const voteThreatReport = (id: any, body: any) => {
  return httpService().post(`threat_reports/threat_reports/${id}/vote/`, body);
};

const getThreatReportPseudoId = (body: any) => {
  return httpService().post('threat_reports/threat_reports/get-pseudo-id/', body);
};

const uploadThreatReportPhoto = (formData: FormData) => {
  return httpService('multipart/form-data').post('threat_reports/threat_reports/upload-photo/', formData);
};


const getThreatReportUploadStatus = (uploadId?: string) => {
  let url = 'threat_reports/threat_reports/upload-status/';

  // Add query parameter if uploadId is provided
  if (uploadId) {
    url += `?upload_id=${uploadId}`;
  }

  return httpService().get(url);
};

const finalizeThreatReport = (body: any) => {
  return httpService().post('threat_reports/threat_reports/finalize-upload/', body);
};

const getThreatReportReputation = () => {
  return httpService().get('threat_reports/threat_reports/reputation/');
};

const registerDeviceToken = (body: any) => {
  console.log('🌐 [API DEBUG] registerDeviceToken called with:', JSON.stringify(body, null, 2));
  
  // Create axios instance with CSRF header
  return httpService().post('incidents/register_device/', body, {
    headers: {
      'X-CSRFToken': 'safe',
    },
  })
    .then(response => {
      console.log('🌐 [API DEBUG] registerDeviceToken response:', JSON.stringify(response.data, null, 2));
      return response;
    })
    .catch(error => {
      console.error('🌐 [API DEBUG] registerDeviceToken error:', error.response?.data || error);
      throw error;
    });
};

export const HomeAPIS = {
  // New Endpoints
  getTrustedContacts,
  addTrustedContact,
  getUserData,
  updateUser,
  getAgoraToken,
  postMsg,
  editTrustedContact,
  deleteTrustedContact,
  createSafeZones,
  getSafeZones,
  updateSafeZone,
  deleteSafeZone,
  postIncidents,
  getIncidents,
  deleteIncident,
  getIncidentDetail,
  startRecording,
  stopRecording,
  sendFeedback,
  sendThreatReports,
  getThreatReports,
  voteThreatReport,
  deleteThreatReport,
  //
  getThreatReportPseudoId,
  uploadThreatReportPhoto,
  finalizeThreatReport,
  getThreatReportUploadStatus,
  getThreatReportReputation,
  //
  registerDeviceToken,

};