import { DOMAINR_BASE_URL } from "../../src/constants";

export const checkDomain = async (domain: string) => {
  try {
    const response = await fetch(DOMAINR_BASE_URL + domain);
    const result = await response.text();
    const data = JSON.parse(result);
    const isAvailable = data.status[0].summary === "inactive";
    return isAvailable;
  } catch (error) {
    console.error(error);
  }
};
