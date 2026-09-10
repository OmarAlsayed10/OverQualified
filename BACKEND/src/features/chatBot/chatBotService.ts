import { groqChat, MODELS } from "../../lib/groqChat";

type PredefinedResponses = {
  [key: string]: string;
};

const predefinedResponses: PredefinedResponses = {
  hello: "Hello! I'm your CV assistant. How can I help you today?",
  hi: "Hi! I'm your CV assistant. How can I help you today?",
  "السلام عليكم":
    "وعليكم السلام! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",
  مرحبا: "مرحباً! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",
  اهلا: "أهلاً وسهلاً! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",
  هاي: "هاي! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",
  ازيك: "مرحبا بك! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",
  "عامل ايه":
    " الحمدلله انت اخبارك ايه! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",
  "عامل ايه؟":
    " الحمدلله انت اخبارك ايه! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",
  "عامل اي":
    " الحمدلله انت اخبارك ايه! أنا مساعدك لكتابة السيرة الذاتية. كيف يمكنني مساعدتك اليوم؟",

  "how to write a cv":
    "Here are the key steps to write a CV: 1. Start with contact information 2. Write a compelling professional summary 3. List your work experience 4. Include your education 5. Add relevant skills 6. Keep it concise and professional",

  "what is cv":
    "A CV (Curriculum Vitae) is a detailed document highlighting your professional and academic history. It includes your education, work experience, skills, and achievements.",

  "cv tips":
    "Top CV tips: 1. Customize your CV for each job 2. Use action verbs 3. Focus on achievements 4. Keep it short and relevant 5. Proofread carefully",

  "ما هي السيرة الذاتية":
    "السيرة الذاتية هي وثيقة تحتوي على معلوماتك المهنية والتعليمية وتُستخدم للتقديم على الوظائف.",

  "ازاي اكتب cv":
    "عشان تكتب CV قوي: 1. ابدأ بمعلومات التواصل 2. اكتب ملخص مهني 3. اذكر الخبرات السابقة 4. التعليم 5. المهارات 6. حافظ على الشكل مرتب ومختصر.",

  "نصائح لكتابة cv":
    "نصائح لكتابة CV ممتاز: 1. خصصه لكل وظيفة 2. استخدم أفعال قوية 3. ابرز إنجازاتك 4. خليه مختصر واحترافي 5. راجعه كويس قبل الإرسال.",

  "ايه الفرق بين cv و resume":
    "الـ CV بيكون أطول ومفصل أكتر وبيستخدم غالبًا في التقديم الأكاديمي، أما الـ Resume بيكون مختصر ومناسب لسوق العمل العادي.",

  "كيف أجهز نفسي لمقابلة عمل":
    "راجع الشركة، حضّر إجابات للأسئلة الشائعة، واهتم بمظهرك ولباقتك. الثقة بالنفس مهمة جدًا في المقابلات.",

  "how to prepare for a job interview":
    "To prepare for a job interview: 1. Research the company 2. Practice common questions 3. Dress professionally 4. Be confident and clear in your answers.",

  "ما هي المهارات المطلوبة في السيرة الذاتية":
    "المهارات اللي لازم تكون في السيرة الذاتية بتختلف حسب الوظيفة، لكن دايمًا مهم تذكر مهارات مثل العمل الجماعي، التواصل، وإدارة الوقت.",
};

const relatedKeywords = [
  "cv",
  "resume",
  "job",
  "career",
  "interview",
  "experience",
  "cover letter",
  "skills",
  "education",
  "linkedin",
  "objective",
  "apply",
  "professional",
  "questions",
  "resumme",
  "سيرة",
  "وظيفة",
  "مقابلة",
  "خبرة",
  "مهارات",
  "تعليم",
  "رابط",
  "مهنة",
  "مقدمة",
  "تقديم",
  "اسئلة",
  "انترفيو",
  "سي في",
  "أسئلة",
];

export const generateChatResponse = async (message: string, chatId: string) => {
  const lowerCaseMessage = message.toLowerCase().trim();

  if (predefinedResponses[lowerCaseMessage]) {
    return predefinedResponses[lowerCaseMessage];
  }

  const isRelated = relatedKeywords.some((keyword) =>
    lowerCaseMessage.includes(keyword)
  );
  if (!isRelated) {
    return "I am a CV and career development assistant, please ask me something in this field 😊";
  }

  const response = await groqChat({
    model: MODELS.fast,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful career and CV assistant. You help users with career advice, CV writing, and professional development questions.",
      },
      {
        role: "user",
        content: message,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const cleanContent = response.choices[0].message?.content
    ?.trim()
    .replace(/\*\*/g, "")
    .replace(/\\n/g, "")
    .replace(/\n/g, "");

  return cleanContent;
};
