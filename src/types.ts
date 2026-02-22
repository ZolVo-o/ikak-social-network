export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  joinedDate: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  content: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  content: string;
  createdAt: string;
}

export type Page = 'feed' | 'profile' | 'settings';

export interface AppSettings {
  notifications: boolean;
  language: 'ru' | 'en';
  privateProfile: boolean;
  showOnline: boolean;
}
