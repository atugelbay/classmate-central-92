import { useState, useCallback } from "react";
import { AuthShell } from "./AuthShell";
import { RegisterWizard } from "./RegisterWizard";

export default function RegisterPage() {
  const [registerStep, setRegisterStep] = useState(1);
  const handleStepChange = useCallback((step: number) => setRegisterStep(step), []);

  return (
    <AuthShell mode="register" registerStep={registerStep}>
      <RegisterWizard onStepChange={handleStepChange} />
    </AuthShell>
  );
}
