import { SystemRole } from '../constants/system-role.constant';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  isActive: boolean;
  systemRole: SystemRole;
}
