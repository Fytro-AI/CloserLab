import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import RealtimeCall from "@/components/simulation/RealtimeCall";
import SimulationText from "@/pages/SimulationText";

export default function Simulation() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    voiceMode: initialVoiceMode = false,
    persona = "skeptical",
    industry = "saas",
    difficulty = "easy",
    simulationMode = "discovery",
    prospectName,
    prospectCompany,
    prospectBackstory,
    challengeId,
    challengeName,
    challengeGoal,
    challengePassScore,
    challengeSystemPrompt,
    customIndustryDescription,
    interviewRole,
    interviewCompany,
  } = (location.state as any) || {};

  const { profile, loading: profileLoading } = useProfile();

  if (initialVoiceMode && profileLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (initialVoiceMode && profile?.subscription_tier === "pro") {
    return (
      <RealtimeCall
        persona={persona}
        industry={industry}
        difficulty={difficulty}
        prospectName={prospectName}
        prospectCompany={prospectCompany}
        prospectBackstory={prospectBackstory}
        challengeSystemPrompt={challengeSystemPrompt}
        customIndustryDescription={customIndustryDescription}
        onEndCall={(transcript) =>
          navigate("/breakdown", {
            state: {
              persona,
              industry,
              difficulty,
              duration: 0,
              transcript,
              simulationMode,
              challengeId,
              challengeName,
              challengeGoal,
              challengePassScore,
              interviewRole,
              interviewCompany,
            },
          })
        }
      />
    );
  }

  return <SimulationText />;
}