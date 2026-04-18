const STORAGE_KEY = "showSandboxProject";

export const SANDBOX_PROJECT_NUMBER = "SYS-TEST";

export const getShowSandboxProject = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) === "true";
};

export const setShowSandboxProject = (show: boolean): void => {
  localStorage.setItem(STORAGE_KEY, show ? "true" : "false");
};
