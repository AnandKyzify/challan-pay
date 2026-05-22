import { api } from "@/services/api";

export interface CreateUserInput {
  username: string;
  password: string;
}

export interface UserListItem {
  id: string;
  username: string;
  role: string;
  password: string;
  created_at: string;
}

export const userService = {
  async create(input: CreateUserInput): Promise<UserListItem> {
    return api.post<UserListItem>("/users", {
      username: input.username,
      password: input.password,
    });
  },

  async list(): Promise<UserListItem[]> {
    return api.get<UserListItem[]>("/users");
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
