export interface Role {
  id: string;
  name: string;
  description: string | null;
  can_checkout_quantifiable: boolean;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
  is_active: boolean;
  created_at: string;
  can_checkout_quantifiable: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface SafeUser {
  id: string;
  email: string;
  display_name: string;
  roles: string[];
}

export interface UserRoleDetail {
  id: string;
  name: string;
  description: string | null;
}

export interface ManagedUser {
  id: string;
  email: string;
  display_name: string;
  roles: UserRoleDetail[];
  is_active: boolean;
  created_at: string;
  can_checkout_quantifiable: boolean;
}

export interface PaginatedUsers {
  users: ManagedUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreateUserInput {
  email: string;
  display_name: string;
  password: string;
  is_active?: boolean;
  role_ids?: string[];
}

export interface UpdateUserInput {
  email?: string;
  display_name?: string;
  password?: string;
  is_active?: boolean;
  role_ids?: string[];
}
