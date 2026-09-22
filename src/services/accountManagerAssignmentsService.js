import api from "./api";

export const getAccountManagerAssignments = async () => {
  const response = await api.get("/api/account-manager-assignments/");
  return response.data;
};