export type IntakeProfile = {
  name: string;
  email: string;
  role: string;
  company: string;
  trainingGoal: string;
  experience: string;
};

export const INTAKE_STORAGE_KEY = "workflow:intake";
export const TRAINEE_STORAGE_KEY = "workflow:trainee_id";
