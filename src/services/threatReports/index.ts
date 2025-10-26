import { HomeAPIS } from "../home";

export interface ThreatReportRequest {
    location: string;
    latitude: string;
    longitude: string;
    description: string;
    report_type: 'harassment' | 'followed' | 'fight' | 'stabbing' | 'shooting' | 'mass_event' | 'general';
}

export interface ThreatReportResponse {
    id: string;
    user_vote: string;
    photo_url: string;
    location: string;
    latitude: string;
    longitude: string;
    description: string;
    report_type: string;
    confirm_votes: number;
    deny_votes: number;
    photo: string;
    created_at: string;
    updated_at: string;
    user: string;
}

export interface PhotoUploadRequest {
    location: string;
    latitude: string;
    longitude: string;
    description: string;
    report_type: string;
    photo?: File | Blob;
}

export class ThreatReportsService {

    static async getPseudoId(data: ThreatReportRequest): Promise<ThreatReportRequest> {
        try {
            const response = await HomeAPIS.getThreatReportPseudoId(data);
            return response.data;
        } catch (error) {
            console.error('Error getting pseudo ID:', error);
            throw error;
        }
    }

    static async uploadPhoto(data: PhotoUploadRequest): Promise<ThreatReportResponse> {
        try {
            //
            const formData = new FormData();
            formData.append('location', data.location);
            formData.append('latitude', data.latitude);
            formData.append('longitude', data.longitude);
            formData.append('description', data.description);
            formData.append('report_type', data.report_type);

            if (data.photo) {
                formData.append('photo', data.photo);
            }

            const response = await HomeAPIS.uploadThreatReportPhoto(formData);
            return response.data;
        } catch (error) {
            console.error('Error uploading photo:', error);
            throw error;
        }
    }

    static async getUploadStatus(): Promise<ThreatReportResponse> {
        try {
            const reponse = await HomeAPIS.getThreatReportUploadStatus();
            return reponse.data;
        } catch (error) {
            console.error('Error getting upload status:', error);
            throw error;
        }
    }

    static async finalizeReport(data: ThreatReportRequest): Promise<ThreatReportResponse> {
        try {
            const response = await HomeAPIS.finalizeThreatReport(data);
            return response.data;
        } catch (error) {
            console.error('Error finalizing report:', error);
            throw error;
        }
    };

    static async getReputation(): Promise<ThreatReportResponse> {
        try {
            const response = await HomeAPIS.getThreatReportReputation();
            return response.data;
        } catch (error) {
            console.error('Error getting reputation:', error);
            throw error;
        }
    }
}
