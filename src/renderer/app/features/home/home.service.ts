import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiData {
  name: string;
  description: string;
  message: string;
  version: string;
  timestamp: string;
  environment: string;
}

@Injectable({ providedIn: 'root' })
export class HomeService {
  userProfile = httpResource<UserProfile>(() => ({
    url: '/api/users/profile',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    },
  }));

  apiData = httpResource<ApiData>(() => '/api/');
}
