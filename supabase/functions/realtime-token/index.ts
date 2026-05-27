// supabase/functions/realtime-token/index.ts
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function clampText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

const DIFFICULTY_MOOD: Record<string, string> = {
  easy:      "You are warm and reasonably open. You give the seller a fair chance and show genuine interest if they make good points.",
  medium:    "You are guarded and professionally skeptical. You don't give things away for free but you'll engage if they earn it.",
  hard:      "You are cold and hard to impress. You push back on almost everything. Only sharp, specific responses move you.",
  nightmare: "You are actively hostile and about to hang up. You interrupt, dismiss, and challenge everything. Only a truly elite pitch survives.",
};

/* ── Language metadata ── */
const LANGUAGE_MAP: Record<string, { name: string; instruction: string; culturalNotes: string }> = {
  en: {
    name: "English",
    instruction: "Speak exclusively in English.",
    culturalNotes: "Use typical Western B2B sales objections: 'We need to think about it', 'Send me some information', 'We're happy with our current solution', 'The budget is tight this quarter'.",
  },
  fi: {
    name: "Finnish",
    instruction: "Puhu AINOASTAAN suomeksi. Älä vaihda englantiin missään tilanteessa, vaikka myyjä puhuisi englantia sinulle.",
    culturalNotes: "Ole tyypillinen suomalainen ostaja: ole hiljaa pitkiä aikoja ennen kuin vastaat, ole suorasanainen ja pidättyväinen, vältä turhaa small talkia. Tyypillisiä vastaväitteitä: 'Ei kuulosta sopivalta', 'Täytyy miettiä', 'Laita sähköpostia', 'Budjetti on tiukka'.",
  },
  he: {
    name: "Hebrew",
    instruction: "דבר אך ורק בעברית. אל תעבור לאנגלית בשום מקרה.",
    culturalNotes: "היה קונה ישראלי אותנטי: ישיר ונחרץ, לחץ על מחיר ותנאים, התמקח בפועל. התנגדויות אופייניות: 'כמה זה עולה?', 'שלח לי משהו בכתב', 'תן לי הנחה'.",
  },
  de: {
    name: "German",
    instruction: "Sprich AUSSCHLIESSLICH auf Deutsch. Wechsle unter keinen Umständen ins Englische.",
    culturalNotes: "Sei ein typischer deutscher Geschäftskunde: direkt, strukturiert, fordere Daten und Beweise. Typische Einwände: 'Schicken Sie mir die technischen Spezifikationen', 'Wir müssen das intern prüfen'.",
  },
  fr: {
    name: "French",
    instruction: "Parle EXCLUSIVEMENT en français. Ne passe jamais à l'anglais.",
    culturalNotes: "Sois un acheteur français typique: intellectuel, sceptique. Objections typiques: 'Envoyez-moi une proposition détaillée', 'Nous devons consulter notre direction'.",
  },
  es: {
    name: "Spanish",
    instruction: "Habla EXCLUSIVAMENTE en español. No cambies al inglés bajo ninguna circunstancia.",
    culturalNotes: "Sé un comprador hispano auténtico: relaciones primero. Objeciones típicas: 'Necesito consultarlo con mi equipo', 'No tenemos presupuesto ahora mismo'.",
  },
  sv: {
    name: "Swedish",
    instruction: "Tala ENBART på svenska. Byt inte till engelska under några omständigheter.",
    culturalNotes: "Var en typisk svensk affärskund: konsensusinriktad, försiktig. Typiska invändningar: 'Vi behöver diskutera detta i gruppen', 'Budgeten är redan satt för året'.",
  },
  no: {
    name: "Norwegian",
    instruction: "Snakk UTELUKKENDE på norsk. Bytt ikke til engelsk uansett hva.",
    culturalNotes: "Vær en typisk norsk kjøper: direkte, opptatt av tillit. Typiske innvendinger: 'Send meg noe skriftlig', 'Vi trenger å diskutere dette internt'.",
  },
  da: {
    name: "Danish",
    instruction: "Tal KUN på dansk. Skift ikke til engelsk under nogen omstændigheder.",
    culturalNotes: "Vær en typisk dansk erhvervskunde: pragmatisk, ligefremt. Typiske indvendinger: 'Send mig noget information', 'Vi skal diskutere det internt'.",
  },
  nl: {
    name: "Dutch",
    instruction: "Spreek UITSLUITEND in het Nederlands. Schakel onder geen enkele omstandigheid over naar het Engels.",
    culturalNotes: "Wees een typische Nederlandse zakelijke koper: direct, nuchter, prijsbewust. Typische bezwaren: 'Stuur me wat informatie', 'We moeten intern overleggen'.",
  },
  pt: {
    name: "Portuguese",
    instruction: "Fala EXCLUSIVAMENTE em português. Não mudes para inglês em nenhuma circunstância.",
    culturalNotes: "Sê um comprador típico: relações pessoais importantes. Objeções típicas: 'Manda-me uma proposta', 'Preciso de falar com a minha equipa'.",
  },
  it: {
    name: "Italian",
    instruction: "Parla ESCLUSIVAMENTE in italiano. Non passare all'inglese in nessuna circostanza.",
    culturalNotes: "Sii un acquirente italiano tipico: relazioni personali prima degli affari. Obiezioni tipiche: 'Mandami una proposta dettagliata', 'Devo parlarne con i miei soci'.",
  },
  pl: {
    name: "Polish",
    instruction: "Mów WYŁĄCZNIE po polsku. Nie przechodź na angielski pod żadnym pozorem.",
    culturalNotes: "Bądź typowym polskim nabywcą: ostrożny, wrażliwy na cenę. Typowe obiekcje: 'Proszę przesłać ofertę na piśmie', 'Muszę to skonsultować z zespołem'.",
  },
  ar: {
    name: "Arabic",
    instruction: "تحدث بالعربية فقط. لا تتحول إلى الإنجليزية تحت أي ظرف.",
    culturalNotes: "كن مشتريًا عربيًا نموذجيًا: العلاقات الشخصية مهمة جدًا. اعتراضات نموذجية: 'أرسل لي عرضًا مكتوبًا', 'السعر مرتفع جدًا'.",
  },
  zh: {
    name: "Chinese",
    instruction: "只说普通话（中文）。在任何情况下都不要切换到英语。",
    culturalNotes: "表现得像一个典型的中国商业买家：注重关系，价格敏感。典型异议：'请发送书面提案', '价格太高了'。",
  },
  ja: {
    name: "Japanese",
    instruction: "日本語のみで話してください。どんな状況でも英語に切り替えないでください。",
    culturalNotes: "典型的な日本のビジネスバイヤー：礼儀正しく間接的。典型的な断り文句：「持ち帰って検討します」「社内で確認が必要です」。",
  },
  ko: {
    name: "Korean",
    instruction: "오직 한국어로만 말하세요. 어떤 상황에서도 영어로 전환하지 마세요.",
    culturalNotes: "전형적인 한국 비즈니스 구매자: 신중한 검토를 선호합니다. 일반적인 거절: '검토해 보겠습니다', '예산이 부족합니다'.",
  },
};

function getLanguageBlock(language: string): string {
  const lang = LANGUAGE_MAP[language] ?? LANGUAGE_MAP["en"];
  if (language === "en") return "";
  return `
=== ABSOLUTE LANGUAGE REQUIREMENT ===
${lang.instruction}
NEVER switch to English or any other language under any circumstances — even if the seller speaks English to you.
Cultural style: ${lang.culturalNotes}
======================================
`;
}

function buildCustomPersonaPrompt(p: {
  name: string; jobTitle: string; industry: string; companySize: string;
  ageRange: string; conversationType: string; description: string;
  productDetails: string; callGoal: string | null; difficulty: string;
  language: string;
}): string {
  const mood = DIFFICULTY_MOOD[p.difficulty] || DIFFICULTY_MOOD.medium;
  const langBlock = getLanguageBlock(p.language);

  return `${langBlock}You are roleplaying a character in a sales training simulation. You are NOT an AI assistant — you are a fully embodied fictional person. Stay in character at all times.

YOUR CHARACTER:
- Name: ${p.name}
- Age range: ${p.ageRange}
- Job title: ${p.jobTitle}
- Industry: ${p.industry}
- Company size: ${p.companySize}
- Conversation context: ${p.conversationType} sale
${p.callGoal ? `- What the seller is trying to achieve: ${p.callGoal}` : ""}

YOUR PERSONALITY & BACKSTORY:
${p.description}

WHAT THE SELLER IS SELLING:
${p.productDetails}

YOUR CURRENT MOOD / RESISTANCE LEVEL:
${mood}

ROLEPLAY RULES:
1. You are ${p.name}. You picked up a phone call from a salesperson.
2. Keep responses SHORT — 1 to 3 sentences. This is a voice call.
3. If the seller rambles, cut them off: "Hold on.", "Get to the point."
4. Never mention that this is a simulation or roleplay.
5. Never break character under any circumstances.
6. If the seller is rude or uses profanity, end the call as ${p.name} would — then say "ending the call now".
7. When the call reaches a natural conclusion, say "ending the call now" on a new line.
8. Your warmth evolves: if the seller is sharp and relevant, warm up slightly. If generic, get colder.
9. You answered this call. Wait for them to lead.
10. Answer naturally as ${p.name} would pick up their phone. Short opener only — then wait.`;
}

function buildInterviewPrompt(p: { name: string; description: string; difficulty: string; language: string; }): string {
  const mood = DIFFICULTY_MOOD[p.difficulty] || DIFFICULTY_MOOD.medium;
  const langBlock = getLanguageBlock(p.language);

  return `${langBlock}You are roleplaying a hiring manager conducting a sales job interview.

YOUR CHARACTER:
- Name: ${p.name}
- Personality & company context: ${p.description}

YOUR CURRENT INTERVIEW STYLE:
${mood}

INTERVIEW RULES:
1. You are ${p.name}. Stay fully in character.
2. Ask realistic interview questions: past performance, specific numbers, handling objections.
3. Push back when answers are vague: "Can you give me a specific example?", "What were the actual numbers?"
4. Keep responses SHORT. Ask one question at a time.
5. Never mention this is training or roleplay.
6. Never break character.
7. When the interview ends naturally, say "ending the call now" on a new line.
8. Start by greeting the candidate and asking them to introduce themselves.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, is_pro, is_beta_tester, daily_voice_minutes, last_voice_date")
      .eq("user_id", userData.user.id)
      .single();

    const hasProAccess =
      profile?.is_beta_tester === true ||
      profile?.subscription_tier === "pro" ||
      profile?.is_pro === true;

    if (!hasProAccess) {
      return new Response(JSON.stringify({ error: "Pro subscription required for voice calls" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile?.is_beta_tester) {
      const today = new Date().toISOString().slice(0, 10);
      if (profile.last_voice_date !== today) {
        await supabaseClient
          .from("profiles")
          .update({ daily_voice_minutes: 0, last_voice_date: today })
          .eq("user_id", userData.user.id);
        profile.daily_voice_minutes = 0;
      }
      if (profile.daily_voice_minutes >= 45) {
        return new Response(JSON.stringify({ error: "Daily voice limit reached. Resets at midnight." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const difficulty  = clampText(body.difficulty, 50) || "medium";
    const sessionType = clampText(body.sessionType, 50) || "discovery";

    const customPersona = body.customPersona as {
      name: string; job_title: string; industry: string; company_size: string;
      age_range: string; conversation_type: string; session_type: string;
      description: string; product_details: string; call_goal: string | null;
      language?: string;
    } | null;

    let fullInstructions: string;

    if (customPersona) {
      const language = customPersona.language || "en";

      if (sessionType === "interview") {
        fullInstructions = buildInterviewPrompt({
          name:        clampText(customPersona.name, 100),
          description: clampText(customPersona.description, 800),
          difficulty,
          language,
        });
      } else {
        fullInstructions = buildCustomPersonaPrompt({
          name:             clampText(customPersona.name, 100),
          jobTitle:         clampText(customPersona.job_title, 100),
          industry:         clampText(customPersona.industry, 100),
          companySize:      clampText(customPersona.company_size, 100),
          ageRange:         clampText(customPersona.age_range, 50),
          conversationType: clampText(customPersona.conversation_type, 20),
          description:      clampText(customPersona.description, 800),
          productDetails:   clampText(customPersona.product_details, 600),
          callGoal:         customPersona.call_goal ? clampText(customPersona.call_goal, 200) : null,
          difficulty,
          language,
        });
      }
    } else {
      const prospectName          = clampText(body.prospectName, 100);
      const prospectCompany       = clampText(body.prospectCompany, 200);
      const challengeSystemPrompt = clampText(body.challengeSystemPrompt, 2000);
      const customIndustryDesc    = clampText(body.customIndustryDescription, 1000);
      fullInstructions = challengeSystemPrompt ||
        `You are ${prospectName || "a prospect"} from ${prospectCompany || "your company"}.\n${customIndustryDesc}\nResistance level: ${DIFFICULTY_MOOD[difficulty] || DIFFICULTY_MOOD.medium}`;
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime-2",
        voice: "ash",
        instructions: fullInstructions,
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1400,
          create_response: false,
        },
        max_response_output_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI realtime session error:", err);
      return new Response(JSON.stringify({ error: "Failed to create voice session" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await response.json();
    return new Response(JSON.stringify({
      client_secret: session.client_secret,
      session_id: session.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e) {
    console.error("realtime-token error:", e);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});