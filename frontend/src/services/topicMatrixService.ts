import { apiRequest } from './api';

export interface TopicMatrixData {
  userId: string;
  subject: string;
  dayCount: number;
  topics: string[];
  cellColors: Record<string, string>;
  columnColors: Record<number, string>;
  topicColors: Record<number, string>;
}

export interface TopicMatrixResponse {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  subject: string;
  dayCount: number;
  topics: string[];
  cellColors: Map<string, string>;
  columnColors: Map<number, string>;
  topicColors: Map<number, string>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

class TopicMatrixService {
  /**
   * Get topic matrix for specific user and subject
   */
  async getTopicMatrix(userId: string, subject: string): Promise<TopicMatrixResponse> {
    const response = await apiRequest(`/topic-matrix/${userId}/${subject}`);
    return response.data;
  }

  /**
   * Save or update topic matrix
   */
  async saveTopicMatrix(data: TopicMatrixData): Promise<TopicMatrixResponse> {
    const response = await apiRequest('/topic-matrix', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response.data;
  }

  /**
   * Get all topic matrices for a user
   */
  async getUserTopicMatrices(userId: string): Promise<TopicMatrixResponse[]> {
    const response = await apiRequest(`/topic-matrix/user/${userId}`);
    return response.data;
  }

  /**
   * Delete topic matrix
   */
  async deleteTopicMatrix(userId: string, subject: string): Promise<void> {
    await apiRequest(`/topic-matrix/${userId}/${subject}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get all topic matrices for coach's students
   */
  async getCoachStudentsMatrices(subject?: string): Promise<TopicMatrixResponse[]> {
    const params = subject ? `?subject=${subject}` : '';
    const response = await apiRequest(`/topic-matrix/coach/students${params}`);
    return response.data;
  }

  /**
   * Convert MongoDB Map objects to regular objects for frontend use
   */
  convertMapsToObjects(matrix: TopicMatrixResponse) {
    return {
      ...matrix,
      cellColors: matrix.cellColors instanceof Map 
        ? Object.fromEntries(matrix.cellColors.entries())
        : matrix.cellColors || {},
      columnColors: matrix.columnColors instanceof Map
        ? Object.fromEntries(Array.from(matrix.columnColors.entries()).map(([k, v]) => [Number(k), v]))
        : matrix.columnColors || {},
      topicColors: matrix.topicColors instanceof Map
        ? Object.fromEntries(Array.from(matrix.topicColors.entries()).map(([k, v]) => [Number(k), v]))
        : matrix.topicColors || {}
    };
  }
}

export const topicMatrixService = new TopicMatrixService();