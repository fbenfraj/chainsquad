const API_URL = `${import.meta.env.VITE_BACKEND_URL}/squads`;
const ACCESS_TOKEN = localStorage.getItem("accessToken");

export async function getSquad(squadId: number): Promise<Squad> {
  const response = await fetch(`${API_URL}/${squadId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error("Squad not found");
  }

  return await response.json();
}

export async function createSquad(
  squad: Partial<Squad>,
  userId: number
): Promise<Squad> {
  const data = {
    squadName: squad.squadName,
    createdBy: userId,
  };

  const response = await fetch(`${API_URL}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error);
  }

  return responseData;
}
