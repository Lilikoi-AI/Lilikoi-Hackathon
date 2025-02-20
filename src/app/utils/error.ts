import { AxiosError } from 'axios';
import { ERROR_MESSAGES } from '../config/constants';

export const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED') {
      return ERROR_MESSAGES.API_TIMEOUT;
    }
    if (error.response) {
      return error.response.data.message || error.response.statusText;
    }
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  return ERROR_MESSAGES.INVALID_RESPONSE;
}; 