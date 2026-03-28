import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Zap, Trophy, Crown, ChevronRight, Star, Flame } from "lucide-react";
import { CHALLENGES, getWeeklyChallenge, type Challenge } from "@/lib/challenges-data";
import { DIFFICULTIES } from "@/lib/game-data";
import { useProfile } from "@/hooks/useProfile";
import { useChallengeCompletions } from "@/hooks/useChallengeCompletions";

const CHALLENGE_DIFFICULTIES = DIFFICULTIES.filter((d) => d.id !== "nightmare");

export default function Challenges() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { completions, getBestScore } = useChallengeCompletions();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("easy");
  const weeklyChallenge = getWeeklyChallenge();
  const isPro = profile?.is_pro ?? false;

  const getCompletedDifficulties = (challengeId: string) => {
    return CHALLENGE_DIFFICULTIES.filter((d) => {
      const result = getBestScore(challengeId, d.id);
      return result?.passed;
    });
  };

  const isUnlocked = (challenge: Challenge): boolean => {
    if (challenge.free) return true;
    if (isPro) return true;
    return false;
  };

  const handleStart = (challenge: Challenge) => {
    if (!isUnlocked(challenge)) return;
    setSelectedChallenge(challenge);
    setSelectedDifficulty("easy");
  };

  const handleLaunch = () => {
    if (!selectedChallenge) return;
    navigate("/simulation", {
      state: {
        industry: selectedChallenge.industry,
        difficulty: selectedDifficulty,
        persona: selectedChallenge.persona,
        voiceMode: false,
        challengeId: selectedChallenge.id,
        challengeName: selectedChallenge.name,
        challengeGoal: selectedChallenge.goal,
        challengePassScore: selectedChallenge.passScore,
        challengeSystemPrompt: selectedChallenge.systemPromptOverride,
        prospectName: undefined,
        prospectCompany: undefined,
        prospectBackstory: undefined,
      },
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-slide-up">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Challenge Mode</h1>
        <p className="text-muted-foreground">Targeted drills for your weakest skills. Pass to unlock the next.</p>
      </div>

      {/* Weekly Challenge Banner */}
      <div className="rounded-xl border border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 p-5 flex items-center gap-4">
        <div className="text-4xl">{weeklyChallenge.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-accent">Weekly Challenge</span>
          </div>
          <h2 className="text-lg font-black text-foreground mt-0.5">{weeklyChallenge.name}</h2>
          <p className="text-sm text-muted-foreground">{weeklyChallenge.tagline}</p>
        </div>
        <button
          onClick={() => handleStart(weeklyChallenge)}
          disabled={!isUnlocked(weeklyChallenge)}
          className="rounded-lg gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
        >
          Play <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Challenge Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {CHALLENGES.map((challenge) => {
          const unlocked = isUnlocked(challenge);
          const passed = getCompletedDifficulties(challenge.id);
          const bestEasy = getBestScore(challenge.id, "easy");
          const bestMedium = getBestScore(challenge.id, "medium");
          const bestHard = getBestScore(challenge.id, "hard");

          return (
            <button
              key={challenge.id}
              onClick={() => handleStart(challenge)}
              disabled={!unlocked}
              className={`rounded-xl border p-5 text-left transition-all relative group ${
                !unlocked
                  ? "border-border bg-card/50 opacity-60 cursor-not-allowed"
                  : selectedChallenge?.id === challenge.id
                  ? "border-primary bg-primary/10 card-glow"
                  : "border-border bg-card hover:border-primary/30 card-glow-hover"
              }`}
            >
              {/* Lock / Pro badge */}
              {!unlocked && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-accent font-semibold">
                  <Crown className="h-3.5 w-3.5" /> PRO
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="text-3xl">{challenge.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">{challenge.name}</h3>
                  <p className="text-xs text-primary font-semibold mt-0.5">{challenge.tagline}</p>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{challenge.description}</p>

                  {/* Difficulty progress dots */}
                  {unlocked && (
                    <div className="flex items-center gap-2 mt-3">
                      {CHALLENGE_DIFFICULTIES.map((d) => {
                        const result = getBestScore(challenge.id, d.id);
                        return (
                          <div key={d.id} className="flex items-center gap-1">
                            <div
                              className={`h-2.5 w-2.5 rounded-full border ${
                                result?.passed
                                  ? "bg-success border-success"
                                  : result
                                  ? "bg-accent/30 border-accent"
                                  : "bg-secondary border-border"
                              }`}
                            />
                            <span className="text-[10px] text-muted-foreground uppercase">{d.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Challenge Launch Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md mx-4 rounded-xl border border-primary/30 bg-card p-8 space-y-6 card-glow">
            <button
              onClick={() => setSelectedChallenge(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-lg"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <div className="text-5xl mb-2">{selectedChallenge.icon}</div>
              <h2 className="text-2xl font-black text-foreground">{selectedChallenge.name}</h2>
              <p className="text-sm text-primary font-semibold">{selectedChallenge.tagline}</p>
            </div>

            {/* Goal */}
            <div className="rounded-lg border border-border bg-secondary/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">🎯 Mission</p>
              <p className="text-sm text-foreground leading-relaxed">{selectedChallenge.goal}</p>
            </div>

            {/* Pass score */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pass Score</span>
              <span className="font-bold text-primary">{selectedChallenge.passScore}+</span>
            </div>

            {/* Difficulty selector */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {CHALLENGE_DIFFICULTIES.map((d) => {
                  const userXp = profile?.xp ?? 0;
                  const locked = userXp < d.minXP;
                  const result = getBestScore(selectedChallenge.id, d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => !locked && setSelectedDifficulty(d.id)}
                      disabled={locked}
                      className={`rounded-lg border p-3 text-center transition-all relative ${
                        locked
                          ? "border-border bg-card opacity-40 cursor-not-allowed"
                          : selectedDifficulty === d.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      {locked && <Lock className="h-3 w-3 text-muted-foreground absolute top-1.5 right-1.5" />}
                      <div className={`font-bold text-sm ${d.color}`}>{d.label}</div>
                      {result?.passed && (
                        <div className="text-[10px] text-success font-semibold mt-0.5 flex items-center justify-center gap-0.5">
                          <Star className="h-3 w-3" /> {result.score}
                        </div>
                      )}
                      {result && !result.passed && (
                        <div className="text-[10px] text-accent font-semibold mt-0.5">{result.score}</div>
                      )}
                      {!result && !locked && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">-</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleLaunch}
              className="w-full rounded-lg gradient-primary py-4 text-base font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="h-5 w-5" /> Start Challenge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
