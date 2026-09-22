import api from "./api";

export const getAccountManagerAssignments = async () => {
  const response = await api.get(
    "/api/account-manager-assignments/"
  );

  return response.data;
};

export const getUnassignedCustomers = async () => {
  const response = await api.get(
    "/api/account-manager-assignments/unassigned"
  );

  return response.data;
};

export const assignAccountManager = async (
  accountManagerId,
  customerId
) => {
  await api.post(
    "/api/account-manager-assignments/",
    {
      accountManagerId,
      customerId,
    }
  );
};