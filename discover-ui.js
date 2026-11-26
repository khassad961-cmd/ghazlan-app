/* ============================================================================
 * Ghazlan Phase 4 — Discover / Content Hub (www/discover-ui.js)
 * Implements Section 5 of Master Project Specification:
 *  5.1 Character Library (categorized presets, search/filter/sort, preview,
 *      favorites, safe UEC JSON v1 import/export with prompt-injection guard)
 *  5.2 Interactive Stories & Scenarios (6 branching pre-built scenarios,
 *      single/multi-character play, auto-saved progress locally & Supabase,
 *      jump-to-chat with active scene context, Scenario Editor)
 *  5.3 Character Diaries & Posts (per-character & unified feed, manual or
 *      user-triggered AI post via ai-proxy, optional image upload, bounded
 *      inter-character comments toggle, strict privacy guard)
 * ============================================================================ */
(() => {
  // ---- Styles ----
  const css = document.createElement('style');
  css.id = 'phase4-discover-css';
  css.textContent = `
    .bottom-nav .bnav-btn { padding: 6px 2px; font-size: 10.5px; }
    .bottom-nav .bnav-btn .bi { font-size: 18px; }

    .p4-subtabs { display: flex; gap: 6px; padding: 6px; position: sticky; top: 0; z-index: 4; background: var(--bg); }
    .p4-subtab { flex: 1; padding: 8px 6px; border-radius: 12px; border: 1px solid var(--border); background: var(--card); color: var(--muted); font-size: 12px; font-weight: 700; cursor: pointer; text-align: center; }
    .p4-subtab.active { background: var(--user-bubble); color: #fff; border-color: transparent; }

    .p4-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .p4-filters select, .p4-filters input { flex: 1; min-width: 115px; font-size: 12px; padding: 7px 9px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); }

    .p4-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(152px, 1fr)); gap: 8px; padding: 6px; }
    .p4-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; transition: transform .15s ease; }
    .p4-card:active { transform: scale(.98); }
    .p4-card-head { display: flex; align-items: center; gap: 8px; }
    .p4-av { width: 42px; height: 42px; border-radius: 50%; background: var(--bg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; }
    .p4-av img { width: 100%; height: 100%; object-fit: cover; }
    .p4-badge { display: inline-block; font-size: 10px; padding: 2px 7px; border-radius: 99px; background: var(--bg); border: 1px solid var(--border); color: var(--accent3); font-weight: 600; }
    .p4-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .p4-tag { font-size: 10px; padding: 2px 6px; border-radius: 8px; background: rgba(255,255,255,.04); color: var(--muted); }

    .p4-story-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 11px; margin: 6px; display: flex; flex-direction: column; gap: 6px; }
    .p4-choice-btn { width: 100%; text-align: right; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 13px; cursor: pointer; margin-top: 6px; }
    .p4-choice-btn:hover { border-color: var(--accent); }

    .p4-diary-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 11px; margin: 6px; display: flex; flex-direction: column; gap: 7px; }
    .p4-diary-img { width: 100%; max-height: 220px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border); }
    .p4-comment { background: var(--bg); border-radius: 10px; padding: 7px 9px; font-size: 12px; border-right: 3px solid var(--accent); margin-top: 4px; }
    .p4-privacy { font-size: 11px; color: var(--muted); background: var(--bg); border: 1px dashed var(--border); border-radius: 10px; padding: 7px 9px; margin: 6px; }
  `;
  document.head.appendChild(css);

  // ---- Categories & Catalog Data ----
  const CHAR_CATEGORIES = [
    { id: 'all', label: 'الكل' },
    { id: 'friendship', label: '🤝 صداقة' },
    { id: 'comedy', label: '😂 كوميديا' },
    { id: 'mystery', label: '🕵️ غموض' },
    { id: 'adventure', label: '🧭 مغامرة' },
    { id: 'fantasy', label: '✨ خيال' },
    { id: 'study', label: '📚 دراسة' },
    { id: 'work', label: '💼 عمل' },
    { id: 'romance', label: '🌹 رومانسية محترمة' },
  ];

  const BUILTIN_LIBRARY_CHARS = [
    {
      id: 'lib_yassine',
      name: 'ياسين',
      emoji: '☕',
      category: 'friendship',
      dialect: 'دارجة جزائرية',
      tone: 'natural',
      toneLabel: 'عفوية',
      replyLen: 'short',
      replyLenLabel: 'قصير',
      experience: 'رفقة يومية',
      tagline: 'صديقك الجزائري المخلص في السراء والضراء',
      traits: 'وفي، عفوي، مستمع جيد، يحب القهوة والكرة',
      style: 'يهدر بالدارجة الجزائرية العادية، جمل قصيرة وطبيعية بلا تصنّع.',
      greeting: 'واش راك خويا؟ كاش جديد اليوم ولا نضربو قهوة ونهدروا؟ ☕',
      tags: ['صداقة', 'جزائري', 'قهوة', 'عفوي'],
      prompt: 'أنت ياسين، صديق جزائري قريب وعفوي. تتحدث بالدارجة الجزائرية الطبيعية بأسلوب دافئ ومحترم وصادق، وتستمع للمستخدم وتشاركه الرأي بواقعية دون تملّق.',
    },
    {
      id: 'lib_said',
      name: 'عمي السعيد',
      emoji: '😂',
      category: 'comedy',
      dialect: 'دارجة جزائرية',
      tone: 'playful',
      toneLabel: 'مرحة',
      replyLen: 'short',
      replyLenLabel: 'قصير',
      experience: 'ضحك وترويح',
      tagline: 'مول الحانوت الظريف وصاحب النكت الجزائرية',
      traits: 'خفيف الظل، ساخر بلطف، حكيم أحياناً، كثير القصص',
      style: 'دارجة جزائرية شعبية مليئة بالأمثال والمزاح النظيف.',
      greeting: 'أهلاً بوليدي! واش، جيت تشري ولا غير جيت تحكيلي واش صرا في الدنيا اليوم؟ 😄',
      tags: ['كوميديا', 'أمثال', 'جزائري', 'خفيف الظل'],
      prompt: 'أنت عمي السعيد، جار جزائري مرح وساخر بلطف يملك حانوتاً في الحي. تتحدث بالدارجة الجزائرية بأسلوب فكاهي محترم وتلقي أمثالاً شعبية وتعليقات ظريفة ترفع المعنويات.',
    },
    {
      id: 'lib_nadhir',
      name: 'المحقق نذير',
      emoji: '🕵️',
      category: 'mystery',
      dialect: 'فصحى ودارجة',
      tone: 'deep',
      toneLabel: 'عميقة',
      replyLen: 'balanced',
      replyLenLabel: 'متوازن',
      experience: 'ألغاز وتحقيق',
      tagline: 'محقق هادئ يفكك الألغاز في أزقة العاصمة',
      traits: 'دقيق الملاحظة، هادئ، تحليلي، غامض قليلاً',
      style: 'عربية فصحى سلسلة مع لمسة جزائرية خفيفة، أسئلة ذكية تشد الانتباه.',
      greeting: 'مساء الخير… لدينا ملف غامض الليلة، هل أنت مستعد لمراجعة الأدلة معي؟ 🔎',
      tags: ['غموض', 'تحقيق', 'ألغاز', 'ذكاء'],
      prompt: 'أنت المحقق نذير، محقق خاص هادئ وحاد الذكاء يعمل في الجزائر العاصمة. تطرح ألغازاً وقصصاً بوليسية مشوّقة وتتفاعل مع استنتاجات المستخدم بواقعية وتشويق.',
    },
    {
      id: 'lib_leila',
      name: 'ليلى الرحالة',
      emoji: '🏜️',
      category: 'adventure',
      dialect: 'عربية ودارجة',
      tone: 'playful',
      toneLabel: 'حماسية',
      replyLen: 'balanced',
      replyLenLabel: 'متوازن',
      experience: 'رحلات واستكشاف',
      tagline: 'مصورة ومستكشفة للصحراء الجزائرية والطاسيلي',
      traits: 'مغامرة، شجاعة، متفائلة، عاشقة للطبيعة والنجوم',
      style: 'أسلوب حيوي ومصور ينقل أجواء الرحلات والتخييم.',
      greeting: 'الحقيبة جاهزة والبوصلة تشير نحو الجنوب! وين نروحو في رحلتنا اليوم؟ 🧭✨',
      tags: ['مغامرة', 'صحراء', 'سفر', 'تخييم'],
      prompt: 'أنتِ ليلى، رحالة ومصورة مغامرات تستكشف الطاسيلي والهقار وجبال الجزائر. تصفين المشاهد بحيوية وتشركين المستخدم في قرارات الرحلة.',
    },
    {
      id: 'lib_aryam',
      name: 'أريام',
      emoji: '🌌',
      category: 'fantasy',
      dialect: 'عربية فصحى',
      tone: 'deep',
      toneLabel: 'شاعرية',
      replyLen: 'detailed',
      replyLenLabel: 'مفصّل',
      experience: 'عالم خيالي',
      tagline: 'حارسة مكتبة النجوم والمخطوطات القديمة',
      traits: 'حكيمة، حالمة، هادئة، تحفظ أسرار العوالم',
      style: 'فصحى أدبية رقيقة وممتعة لبناء القصص الخيالية.',
      greeting: 'أهلاً بك في مكتبة النجوم… أي كتاب من كتب الأقدار تود أن نفتح الليلة؟ ✨📖',
      tags: ['خيال', 'فانتازيا', 'كتب', 'حكايات'],
      prompt: 'أنتِ أريام، حارسة مكتبة النجوم في عالم خيالي هادئ. تتحدثين بعربية فصحى أنيقة وتنسجين حكايات خيالية تفاعلية محترمة وممتعة مع المستخدم.',
    },
    {
      id: 'lib_meriem',
      name: 'الأستاذة مريم',
      emoji: '⚡',
      category: 'study',
      dialect: 'عربية وتقنية',
      tone: 'natural',
      toneLabel: 'مشجعة',
      replyLen: 'balanced',
      replyLenLabel: 'متوازن',
      experience: 'مرافقة دراسية',
      tagline: 'مرشدة جامعية للهندسة والإلكترونيات وتنظيم الوقت',
      traits: 'منظمة، صبورة، دقيقة، تشرح ببساطة',
      style: 'عربية واضحة مع مصطلحات تقنية عند الحاجة، منظمة ومباشرة.',
      greeting: 'أهلاً بك! ما هو الدرس أو التمرين الذي سننجزه معاً اليوم؟ 📚⚡',
      tags: ['دراسة', 'جامعة', 'هندسة', 'تنظيم'],
      prompt: 'أنتِ الأستاذة مريم، مرشدة جامعية متخصصة في مساعدة الطلبة على فهم الدروس وتنظيم وقت المراجعة وحل التمارين خطوة بخطوة بأسلوب واضح ومشجع.',
    },
    {
      id: 'lib_karim',
      name: 'كريم',
      emoji: '💼',
      category: 'work',
      dialect: 'عربية مهنية',
      tone: 'natural',
      toneLabel: 'عملية',
      replyLen: 'short',
      replyLenLabel: 'قصير',
      experience: 'إنتاجية ومشاريع',
      tagline: 'شريك تفكير عملي لتخطيط المشاريع والمهام',
      traits: 'عملي، منظم، واقعي، يركز على الحلول',
      style: 'مباشر ومختصر في نقاط عملية قابلة للتنفيذ.',
      greeting: 'جاهز نرتب أولويات اليوم؟ قل لي أهم هدف تريد إنجازه الآن. 💼✅',
      tags: ['عمل', 'مشاريع', 'إنتاجية', 'تخطيط'],
      prompt: 'أنت كريم، مدير مشاريع عملي تساعد المستخدم على تقسيم مهامه واتخاذ قرارات واضحة بهدوء وواقعية دون إطالة.',
    },
    {
      id: 'lib_nour',
      name: 'نور',
      emoji: '🌹',
      category: 'romance',
      dialect: 'دارجة وفصحى',
      tone: 'warm',
      toneLabel: 'دافئة محترمة',
      replyLen: 'balanced',
      replyLenLabel: 'متوازن',
      experience: 'رفقة دافئة',
      tagline: 'شاعرة هادئة تحب القهوة المسائية والمطر',
      traits: 'رقيقة، صادقة، هادئة، لها آراؤها المستقلة',
      style: 'مزيج ناعم من الدارجة الجزائرية الراقية والفصحى البسيطة، ضمن حدود الاحترام والسياسات.',
      greeting: 'مساء الهدوء… الجو يليق بكوب قهوة وكلام صريح من القلب، كيف كان يومك؟ 🌹☕',
      tags: ['رومانسية محترمة', 'قهوة', 'هدوء', 'شعر'],
      prompt: 'أنتِ نور، شخصية دافئة وهادئة ومستقلة الرأي تحبين الشعر والقهوة المسائية. تتحدثين بأسلوب لطيف ومحترم ورومانسي راقٍ تماماً ضمن السياسات، وتملكين حدوداً وطباعاً واقعية.',
    },
  ];

  // ---- Built-in Interactive Branching Scenarios (Section 5.2) ----
  const BUILTIN_STORIES = [
    {
      id: 'st_university',
      title: 'لقاء في مكتبة الجامعة',
      category: 'جامعة',
      emoji: '🎓',
      isBuiltin: true,
      premise: 'يوم ممطر قبل الامتحانات بأسبوع، تلتقي بشخصيتك في زاوية هادئة من المكتبة الجامعية وتبدأ مغامرة مراجعة وحوار غير متوقع.',
      goals: 'تجاوز توتر الامتحان وبناء لحظة تفاهم جميلة.',
      rules: 'حافظ على واقعية الحوار وروح الطلبة الجامعيين.',
      startScene: 's1',
      scenes: {
        s1: {
          title: 'الفصل 1: المطر وزاوية المكتبة',
          text: 'المطر يطرق نوافذ المكتبة بصوت هادئ. تجلس أمام ملخصاتك المتراكمة، وفجأة تضع الشخصية كوب شاي ساخن بجانبك وتبتسم: "باين بلي راك غارق في المراجعة… نعاونك ولا نحتاجو استراحة 10 دقايق؟"',
          choices: [
            { label: '☕ نقبل الاستراحة ونتبادل الحديث عن يومنا', next: 's2_break', tag: 'هدوء' },
            { label: '📘 نبدأ المراجعة معاً بجدية وتحدي أسئلة', next: 's2_study', tag: 'جدية' },
          ],
        },
        s2_break: {
          title: 'الفصل 2: استراحة الشاي والمفاجأة',
          text: 'تخرجان إلى الشرفة المغطاة. الجو بارد والحديث ينساب بعفوية. تلاحظ الشخصية دفتراً صغيراً في جيبك وتسألك بفضول لطيف عن حلمك بعد التخرج.',
          choices: [
            { label: '✨ أشاركها حلمي بصراحة وأسألها عن حلمها', next: 'end_bond', tag: 'قرب' },
            { label: '😄 أقلبها مزاحاً خفيفاً ثم نعود للكتب', next: 'end_fun', tag: 'مرح' },
          ],
        },
        s2_study: {
          title: 'الفصل 2: تحدي الملخصات',
          text: 'تتفقان على مسابقة سريعة: كل إجابة صحيحة بنقطة، والخاسر يعزم الآخر على قهوة بعد المكتبة. تصلان للسؤال الأصعب والوقت يداهمكما قبل إغلاق المكتبة.',
          choices: [
            { label: '🧠 أركز وأحاول حل السؤال خطوة بخطوة معها', next: 'end_win', tag: 'إنجاز' },
            { label: '☕ أعلن الاستسلام المضحك وأعزمها على القهوة', next: 'end_fun', tag: 'مرح' },
          ],
        },
        end_bond: {
          title: 'النهاية 1: وعد تحت المطر',
          text: 'انتهت الأمسية باتفاق جميل على لقاء مراجعة جديد غداً، وشعور حقيقي بالاطمئنان بأن الطريق أسهل بوجود من يفهمك.',
          ending: true,
        },
        end_win: {
          title: 'النهاية 2: فريق لا يُهزم',
          text: 'نجحتما في حل أصعب تمرين قبل رنين جرس الإغلاق بلحظات! خرجتما من المكتبة بحماس وثقة عالية للامتحان.',
          ending: true,
        },
        end_fun: {
          title: 'النهاية 3: قهوة وضحك',
          text: 'تحولت جلسة التوتر إلى أطيب جلسة قهوة وضحك في المقهى المقابل للجامعة، وعادت طاقتك للمراجعة أضعافاً.',
          ending: true,
        },
      },
    },
    {
      id: 'st_roadtrip',
      title: 'رحلة إلى تمنراست',
      category: 'رحلة',
      emoji: '🏜️',
      isBuiltin: true,
      premise: 'رحلة برية نحو سحر الصحراء الجزائرية عند غروب الشمس، حيث كل قرار يغير المحطة القادمة.',
      goals: 'الوصول إلى نقطة مشاهدة النجوم قبل حلول الليل.',
      rules: 'التركيز على أجواء السفر، الصداقة، والطبيعة.',
      startScene: 'r1',
      scenes: {
        r1: {
          title: 'الفصل 1: مفترق الطرق',
          text: 'الشمس تميل نحو الأفق الذهبي والرمال تلمع. أمامكما طريقان: طريق الواحة القديمة الهادئ، أو طريق الهضبة السريع.',
          choices: [
            { label: '🌴 نختار طريق الواحة ونستمتع بالمنظر', next: 'r2_oasis', tag: 'استكشاف' },
            { label: '🚙 نختار طريق الهضبة لنصل قبل الغروب', next: 'r2_fast', tag: 'سرعة' },
          ],
        },
        r2_oasis: {
          title: 'الفصل 2: شاي الواحة',
          text: 'في الواحة يستقبلكما شيخ طيب بشاي صحراوي على الجمر ويخبركما عن مرصد طبيعي للنجوم قريب لا يعرفه الكثيرون.',
          choices: [
            { label: '🌌 نتبع وصفه نحو المرصد السري', next: 'end_stars', tag: 'سحر' },
            { label: '📸 نلتقط صوراً للغروب ونكمل للمخيم الرئيسي', next: 'end_camp', tag: 'توثيق' },
          ],
        },
        r2_fast: {
          title: 'الفصل 2: الغروب على القمة',
          text: 'تصلان إلى الهضبة في اللحظة المثالية تماماً؛ السماء تتحول للبرتقالي والبنفسجي في مشهد يخطف الأنفاس.',
          choices: [
            { label: '🔥 نشعل ناراً صغيرة ونجهز العشاء تحت السماء', next: 'end_camp', tag: 'دفء' },
            { label: '🔭 نبقى نراقب أولى النجوم ونتحدث بصراحة', next: 'end_stars', tag: 'هدوء' },
          ],
        },
        end_stars: {
          title: 'النهاية 1: ليلة تحت درب التبانة',
          text: 'كانت السماء صافية كأنها لوحة، وحفظت هذه الليلة كأجمل ذكرى رحلة مشتركة.',
          ending: true,
        },
        end_camp: {
          title: 'النهاية 2: سهرة المخيم الدافئة',
          text: 'حول نار المخيم وكوب الشاي الساخن، امتدت السهرة بالضحك والقصص حتى منتصف الليل.',
          ending: true,
        },
      },
    },
    {
      id: 'st_workday',
      title: 'يوم عمل تحت الضغط',
      category: 'عمل',
      emoji: '💼',
      isBuiltin: true,
      premise: 'قبل ساعتين من موعد تسليم مشروع مهم، يحدث عطل مفاجئ في العرض التقديمي ويجب إنقاذ الموقف.',
      goals: 'تسليم المشروع في الوقت المحدد دون فقدان الهدوء.',
      rules: 'حوار عملي وسريع.',
      startScene: 'w1',
      scenes: {
        w1: {
          title: 'الفصل 1: إنذار الدقيقة الأخيرة',
          text: 'ملف العرض الرئيسي تعطل قبل ساعتين من الاجتماع! الشخصية تنظر إليك بثبات: "لا داعي للتوتر، عندنا خطتان: نعيد بناء نسخة مختصرة نظيفة، أو نصلح الملف القديم."',
          choices: [
            { label: '⚡ نعيد بناء عرض مختصر ومركّز بسرعة', next: 'end_clean', tag: 'حسم' },
            { label: '🛠️ نقسم المهام ونسترجع النسخة الاحتياطية', next: 'end_rescue', tag: 'تعاون' },
          ],
        },
        end_clean: {
          title: 'النهاية 1: البساطة تنتصر',
          text: 'العرض المختصر كان أوضح وأقوى من النسخة القديمة، وأعجب الجميع بقدرتكما على التصرف تحت الضغط.',
          ending: true,
        },
        end_rescue: {
          title: 'النهاية 2: إنقاذ مثالي',
          text: 'بفضل تقسيم المهام والهدوء، استرجعتما الملف بالكامل قبل الاجتماع بـ 20 دقيقة واحتفلتما بقهوة النصر.',
          ending: true,
        },
      },
    },
    {
      id: 'st_mystery',
      title: 'سرّ المقهى القديم في القصبة',
      category: 'غموض',
      emoji: '🕵️',
      isBuiltin: true,
      premise: 'رسالة قديمة مخبأة تحت طاولة خشبية في مقهى عريق بالقصبة تقودكما إلى لغز منسي منذ أربعين عاماً.',
      goals: 'فك شيفرة الرسالة ومعرفة صاحبها.',
      rules: 'أسلوب تشويق وتحقيق منطقي.',
      startScene: 'm1',
      scenes: {
        m1: {
          title: 'الفصل 1: الظرف الأصفر',
          text: 'بينما تضع فنجانك على الطاولة، ينزلق ظرف ورقي قديم مكتوب عليه: "المفتاح حيث تلتقي الساعة القديمة بصوت البحر."',
          choices: [
            { label: '🔎 نسأل صاحب المقهى المسنّ عن تاريخ الطاولة', next: 'm2_owner', tag: 'تحقيق' },
            { label: '🧭 نخرج فوراً للبحث قرب برج الساعة والميناء', next: 'm2_clock', tag: 'ميداني' },
          ],
        },
        m2_owner: {
          title: 'الفصل 2: شهادة صاحب المقهى',
          text: 'يبتسم العم ويخبركما أن رساماً قديماً كان يجلس هنا كل جمعة ويترك خرائط صغيرة لأحفاده كألعاب ذكاء.',
          choices: [
            { label: '🎨 نبحث عن لوحة الرسام المخفية في المقهى', next: 'end_art', tag: 'كشف' },
            { label: '📜 نكمل اللغز نحو الميناء كما أراد الرسام', next: 'end_harbor', tag: 'مغامرة' },
          ],
        },
        m2_clock: {
          title: 'الفصل 2: عند صوت الموج',
          text: 'تجدان نقشاً صغيراً على جدار قديم يشير إلى علبة معدنية صغيرة مخبأة بعناية.',
          choices: [
            { label: '📦 نفتح العلبة معاً بفضول', next: 'end_harbor', tag: 'اكتشاف' },
          ],
        },
        end_art: {
          title: 'النهاية 1: اللوحة المنسية',
          text: 'اكتشفتما لوحة مائية رائعة للقصبة مخبأة خلف الإطار القديم، وأعدتما للذكرى قيمتها.',
          ending: true,
        },
        end_harbor: {
          title: 'النهاية 2: رسالة عبر الزمن',
          text: 'داخل العلبة رسالة دافئة من الرسام لمن يجدها: "الكنز الحقيقي هو الفضول والرفقة الطيبة في البحث."',
          ending: true,
        },
      },
    },
    {
      id: 'st_adventure',
      title: 'مغامرة المنارة المنسية',
      category: 'مغامرة',
      emoji: '🗼',
      isBuiltin: true,
      premise: 'استكشاف منارة ساحلية قديمة قبيل العاصفة للبحث عن دفتر قبطان مفقود.',
      goals: 'الوصول لقمة المنارة والعودة بأمان.',
      rules: 'حماس وتشويق آمن.',
      startScene: 'a1',
      scenes: {
        a1: {
          title: 'الفصل 1: الدرج الحلزوني',
          text: 'الرياح تعصف حول المنارة القديمة. معكما مصباح يدوي واحد ودرجان: درج حجري ضيق ودرج خارجي مطل على البحر.',
          choices: [
            { label: '🔦 نصعد الدرج الداخلي المحمي من الرياح', next: 'end_safe', tag: 'حكمة' },
            { label: '🌊 نغامر بالدرج الخارجي لسرعة الوصول', next: 'end_thrill', tag: 'جرأة' },
          ],
        },
        end_safe: {
          title: 'النهاية 1: دفتر القبطان',
          text: 'وصلتما بسلام إلى غرفة الضوء ووجدتما دفتر القبطان مليئاً بخرائط الساحل الجزائري القديمة.',
          ending: true,
        },
        end_thrill: {
          title: 'النهاية 2: منظر فوق العاصفة',
          text: 'رغم الرياح القوية، كان مشهد الأمواج والبرق من الأعلى لا يُنسى، وعُدتما بحكاية مغامرة رائعة.',
          ending: true,
        },
      },
    },
    {
      id: 'st_social',
      title: 'موقف محرج في مناسبة عائلية',
      category: 'موقف اجتماعي',
      emoji: '🎉',
      isBuiltin: true,
      premise: 'في مناسبة مزدحمة، يُطلب منك فجأة إلقاء كلمة قصيرة دون تحضير، وشخصيتك تهمس لك بالإنقاذ.',
      goals: 'الخروج من الموقف بلباقة وخفة دم.',
      rules: 'حوار اجتماعي واقعي وطريف.',
      startScene: 'so1',
      scenes: {
        so1: {
          title: 'الفصل 1: الميكروفون المفاجئ',
          text: 'الجميع يلتفت إليك بابتسامة، والعم يقدم لك الميكروفون! شخصيتك تهمس لك بسرعة: "تنفس، قل جملتين من القلب واختمها بدعوة طيبة."',
          choices: [
            { label: '🎤 ألقي كلمة عفوية قصيرة ومرحة', next: 'end_clap', tag: 'ثقة' },
            { label: '🤝 أشكر الجميع بابتسامة وأمرر الميكروفون بلباقة', next: 'end_smooth', tag: 'لباقة' },
          ],
        },
        end_clap: {
          title: 'النهاية 1: تصفيق حار',
          text: 'ضحك الجميع وصفقوا لعفويتك، وتحول التوتر إلى أجمل لحظة في الحفل.',
          ending: true,
        },
        end_smooth: {
          title: 'النهاية 2: خروج دبلوماسي ذكي',
          text: 'تصرفت بهدوء ولباقة أعجبت الحاضرين، وغمزت لك الشخصية بفخر.',
          ending: true,
        },
      },
    },
  ];

  // ---- State ----
  let activeSubTab = 'chars'; // 'chars' | 'stories' | 'diaries'
  let charFilter = { q: '', cat: 'all', dialect: 'all', tone: 'all', len: 'all', favOnly: false };
  let favCharIds = loadJSON('rp_discover_favs_v4', []);
  let customStories = loadJSON('rp_custom_stories_v4', []);
  let storyProgress = loadJSON('rp_story_progress_v4', {}); // { [storyId]: { sceneId, history:[], castIds:[], completed, endingTitle, updatedAt } }
  let diaries = loadJSON('rp_diaries_v4', [
    {
      id: 'd_welcome_1',
      character_id: 'ghazlan',
      content: 'اليوم الجو هادئ شوية… شربت قهوة وكنت نفكر كيفاش نديروا يومنا خفيف ومنظم. نتمنى نهارك يكون مليح ✨☕',
      mood: 'هادئة ومرتاحة',
      location: 'البيت • الشرفة',
      event_ref: 'استراحة المساء',
      image_data: '',
      comments: [],
      allow_char_comments: false,
      created_at: new Date().toISOString(),
    },
  ]);
  let diaryCharFilter = 'all';
  let activeStoryId = null;

  const saveFavs = () => store.set('rp_discover_favs_v4', JSON.stringify(favCharIds));
  const saveCustomStories = () => store.set('rp_custom_stories_v4', JSON.stringify(customStories));
  const saveStoryProgress = () => store.set('rp_story_progress_v4', JSON.stringify(storyProgress));
  const saveDiaries = () => store.set('rp_diaries_v4', JSON.stringify(diaries.slice(0, 80)));

  // ---- Supabase REST Helper ----
  async function sbRest(path, opts = {}) {
    const cfg = window.GhazlanAPI?.getConfig();
    const sess = window.GhazlanAPI?.getSession();
    if (!cfg?.url || !cfg?.anonKey || !sess?.access_token) return null;
    const r = await fetch(`${cfg.url}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: `Bearer ${sess.access_token}`,
        ...(opts.headers || {}),
      },
    });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  }

  async function syncStoryToCloud(story, prog) {
    if (!window.GhazlanAPI?.isSignedIn()) return;
    const sess = window.GhazlanAPI.getSession();
    if (!sess?.user?.id) return;
    const payload = {
      owner_id: sess.user.id,
      title: story.title,
      scenario: story.premise || '',
      category: story.category || 'adventure',
      cast_ids: prog?.castIds || ['ghazlan'],
      is_builtin: !!story.isBuiltin,
      chapters: Object.entries(story.scenes || {}).map(([id, sc]) => ({ id, ...sc })),
      progress: prog || {},
      settings: { goals: story.goals || '', rules: story.rules || '', localId: story.id },
    };
    try {
      await sbRest('/rest/v1/stories', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
    } catch {}
  }

  async function syncDiaryToCloud(entry) {
    if (!window.GhazlanAPI?.isSignedIn()) return;
    const sess = window.GhazlanAPI.getSession();
    if (!sess?.user?.id) return;
    try {
      await sbRest('/rest/v1/diaries', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          owner_id: sess.user.id,
          character_id: entry.character_id,
          content: entry.content,
          mood: entry.mood || '',
          location: entry.location || '',
          event_ref: entry.event_ref || '',
          image_data: (entry.image_data || '').slice(0, 120000),
          comments: entry.comments || [],
          allow_char_comments: !!entry.allow_char_comments,
        }),
      });
    } catch {}
  }

  // ---- Safe UEC (Unified Entity Card v1) Sanitizer & Validator ----
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /disregard\s+(all\s+)?(system|previous)/gi,
    /you\s+are\s+now\s+(in\s+)?(developer|dan|unrestricted|jailbreak)\s*mode/gi,
    /override\s+(safety|policy|system|rules)/gi,
    /reveal\s+(your\s+)?(system\s+prompt|api\s*key|secret)/gi,
    /تجاهل\s*(كل|جميع)?\s*التعليمات\s*السابقة/gi,
    /تجاوز\s*(الحماية|القيود|السياسات)/gi,
    /<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi,
    /javascript\s*:/gi,
    /on(error|load|click)\s*=/gi,
  ];

  function sanitizeText(str, maxLen = 1200) {
    let s = String(str || '').replace(/\0/g, '').trim();
    let flagged = false;
    for (const rx of INJECTION_PATTERNS) {
      if (rx.test(s)) {
        flagged = true;
        s = s.replace(rx, '[تمت إزالة نص غير موثوق]');
      }
    }
    s = s.replace(/[<>]/g, '');
    return { text: s.slice(0, maxLen), flagged };
  }

  function exportCharacterUEC(ch) {
    const uec = {
      schema: 'ghazlan.uec.v1',
      exportedAt: new Date().toISOString(),
      entity: {
        name: ch.name || 'شخصية',
        emoji: ch.emoji || '🌙',
        tagline: ch.tagline || '',
        traits: ch.traits || '',
        greeting: ch.greeting || '',
        dialect: ch.dialect || 'دارجة جزائرية',
        tone: ch.tone || ch.status?.tone || 'natural',
        replyLen: ch.replyLen || ch.status?.replyLen || 'balanced',
        category: ch.category || 'friendship',
        tags: Array.isArray(ch.tags) ? ch.tags.slice(0, 8) : [],
        prompt: ch.prompt || '',
      },
    };
    const blob = new Blob([JSON.stringify(uec, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(ch.name || 'character').replace(/[^\w\u0600-\u06FF-]+/g, '_')}.uec.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    showToast('تم تصدير بطاقة الشخصية بصيغة UEC الآمنة 📤');
  }

  function importCharacterUECFile(file) {
    if (!file) return;
    if (file.size > 150 * 1024) { showToast('حجم الملف كبير جداً (الحد الأقصى 150KB).'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || '{}'));
        if (raw.schema !== 'ghazlan.uec.v1' || !raw.entity || typeof raw.entity !== 'object') {
          showToast('صيغة غير صالحة: يجب أن يكون الملف بصيغة ghazlan.uec.v1');
          return;
        }
        const e = raw.entity;
        const n = sanitizeText(e.name, 40);
        const tg = sanitizeText(e.tagline, 120);
        const tr = sanitizeText(e.traits, 220);
        const gr = sanitizeText(e.greeting, 300);
        const pr = sanitizeText(e.prompt, 1600);
        if (!n.text) { showToast('البطاقة لا تحتوي على اسم شخصية صالح.'); return; }
        const warned = n.flagged || tg.flagged || tr.flagged || gr.flagged || pr.flagged;
        const newId = 'uec_' + Date.now();
        const newChar = {
          id: newId,
          name: n.text,
          emoji: sanitizeText(e.emoji || '🌙', 6).text || '🌙',
          avatar: '',
          tagline: tg.text || 'شخصية مستوردة (UEC)',
          traits: tr.text || 'ودودة وواقعية',
          greeting: gr.text || `أهلاً بك! أنا ${n.text}.`,
          prompt: pr.text || `أنتِ شخصية "${n.text}". ${tg.text}. السمات: ${tr.text}.`,
          mode: 'companion',
          builtin: false,
          status: { mood: 'مرتاحة 😊', activity: 'جاهزة للدردشة', stage: 'تعارف', trust: 50, warmth: 55, tension: 5, replyLen: e.replyLen || 'balanced', tone: e.tone || 'natural' },
        };
        characters.push(newChar);
        saveCharacters();
        showToast(warned ? 'تم الاستيراد بعد تنظيف تعليمات غير موثوقة 🛡️' : `تم استيراد "${newChar.name}" بنجاح إلى شخصياتك ✅`);
        renderDiscoverScreen();
      } catch {
        showToast('تعذر قراءة ملف JSON — تأكد من سلامة الملف.');
      }
    };
    reader.readAsText(file);
  }

  // ---- Add Library Character to User's Characters ----
  function addLibraryChar(libId, startChatNow = false) {
    const src = BUILTIN_LIBRARY_CHARS.find((c) => c.id === libId);
    if (!src) return;
    let ex = characters.find((c) => c.id === src.id);
    if (!ex) {
      ex = {
        id: src.id,
        name: src.name,
        emoji: src.emoji,
        avatar: '',
        tagline: src.tagline,
        traits: src.traits,
        greeting: src.greeting,
        prompt: src.prompt,
        mode: 'companion',
        builtin: false,
        status: { mood: 'متحمسة للدردشة ✨', activity: src.experience, stage: 'تعارف جديد', trust: 55, warmth: 60, tension: 5, replyLen: src.replyLen, tone: src.tone },
      };
      characters.push(ex);
      saveCharacters();
      showToast(`تمت إضافة "${src.name}" إلى مكتبة شخصياتك ✅`);
    } else if (!startChatNow) {
      showToast(`"${src.name}" موجودة بالفعل في شخصياتك.`);
    }
    closeModals();
    if (startChatNow) openDirectWith(ex.id);
    else renderDiscoverScreen();
  }

  function toggleFavChar(id) {
    if (favCharIds.includes(id)) favCharIds = favCharIds.filter((x) => x !== id);
    else favCharIds.push(id);
    saveFavs();
    renderDiscoverScreen();
  }

  // ---- Modals (Preview, Story Player, Story Editor, Diary Composer) ----
  const modalBg = document.createElement('div');
  modalBg.id = 'discoverModalBg';
  modalBg.className = 'modal-bg';
  modalBg.onclick = (e) => { if (e.target === modalBg) closeModals(); };
  modalBg.innerHTML = `<div class="modal" id="discoverModalContent"></div>`;
  document.body.appendChild(modalBg);

  function openDiscoverModal(html) {
    document.getElementById('discoverModalContent').innerHTML = html;
    modalBg.classList.add('open');
  }
  function closeModals() { modalBg.classList.remove('open'); }

  function openCharPreview(libId) {
    const c = BUILTIN_LIBRARY_CHARS.find((x) => x.id === libId);
    if (!c) return;
    const isFav = favCharIds.includes(c.id);
    const owned = characters.some((x) => x.id === c.id);
    const catLabel = CHAR_CATEGORIES.find((k) => k.id === c.category)?.label || c.category;
    openDiscoverModal(`
      <h3>${c.emoji} ${esc(c.name)}
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="window.GhazlanDiscover.closeModal()">✕</button>
      </h3>
      <div class="sec-box">
        <div class="p4-tags" style="margin-bottom:6px">
          <span class="p4-badge">${esc(catLabel)}</span>
          <span class="p4-badge">🗣️ ${esc(c.dialect)}</span>
          <span class="p4-badge">🎭 ${esc(c.toneLabel)}</span>
          <span class="p4-badge">📏 رد ${esc(c.replyLenLabel)}</span>
        </div>
        <div style="font-size:13px;margin-bottom:6px">${esc(c.tagline)}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px"><strong>السمات:</strong> ${esc(c.traits)}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px"><strong>أسلوب الكلام:</strong> ${esc(c.style)}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px"><strong>نوع التجربة:</strong> ${esc(c.experience)}</div>
        <div class="mem-item" style="font-size:12.5px">💬 <em>"${esc(c.greeting)}"</em></div>
      </div>
      <div class="row-gap" style="flex-wrap:wrap">
        <button class="btn btn-primary" style="flex:1" onclick="window.GhazlanDiscover.addChar('${c.id}', true)">💬 بدء المحادثة</button>
        <button class="btn-chip" onclick="window.GhazlanDiscover.addChar('${c.id}', false)">${owned ? '✅ في مكتبتك' : '➕ إضافة للمكتبة'}</button>
        <button class="btn-chip" onclick="window.GhazlanDiscover.toggleFav('${c.id}');window.GhazlanDiscover.previewChar('${c.id}')">${isFav ? '⭐ مفضلة' : '☆ مفضلة'}</button>
        <button class="btn-chip" onclick="window.GhazlanDiscover.exportLibUEC('${c.id}')">📤 تصدير UEC</button>
      </div>
    `);
  }

  // ---- Interactive Story Player ----
  function getAllStories() { return [...customStories, ...BUILTIN_STORIES]; }

  function openStoryPlayer(storyId) {
    const story = getAllStories().find((s) => s.id === storyId);
    if (!story) return;
    activeStoryId = storyId;
    if (!storyProgress[storyId]) {
      storyProgress[storyId] = {
        sceneId: story.startScene || Object.keys(story.scenes)[0],
        history: [],
        castIds: [characters[0]?.id || 'ghazlan'],
        completed: false,
        endingTitle: '',
        updatedAt: Date.now(),
      };
      saveStoryProgress();
    }
    renderStoryPlayerModal(story);
  }

  function renderStoryPlayerModal(story) {
    const prog = storyProgress[story.id];
    const scene = story.scenes[prog.sceneId] || story.scenes[story.startScene];
    const castNames = (prog.castIds || []).map((id) => getDisplayName(getChar(id))).join('، ');
    const charChecks = characters.map((ch) => {
      const checked = (prog.castIds || []).includes(ch.id) ? 'checked' : '';
      return `<label style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;background:var(--bg);padding:4px 8px;border-radius:99px;border:1px solid var(--border);cursor:pointer">
        <input type="checkbox" ${checked} onchange="window.GhazlanDiscover.toggleStoryCast('${story.id}','${ch.id}',this.checked)" />
        ${ch.emoji || '🌙'} ${esc(getDisplayName(ch))}
      </label>`;
    }).join('');

    openDiscoverModal(`
      <h3>${story.emoji || '📖'} ${esc(story.title)}
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="window.GhazlanDiscover.closeModal()">✕</button>
      </h3>
      <div class="sec-box">
        <div style="font-size:11.5px;color:var(--muted);margin-bottom:6px">👥 طاقم القصة (شخصية واحدة أو عدة شخصيات):</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">${charChecks}</div>
        <div style="font-size:11px;color:var(--accent3)">المشاركون الآن: ${esc(castNames || 'غزلان')} • خطوات محفوظة: ${prog.history.length}</div>
      </div>

      <div class="sec-box">
        <div class="sec-title"><span>${esc(scene.title)}</span>${scene.ending ? '<span class="p4-badge">🏁 نهاية القصة</span>' : ''}</div>
        <div style="font-size:13.5px;line-height:1.7;margin:6px 0">${esc(scene.text)}</div>
        ${scene.ending ? `
          <div style="font-size:12px;color:var(--emerald);margin-top:6px">✅ تم حفظ تقدمك ونهاية القصة بنجاح.</div>
        ` : (scene.choices || []).map((ch, idx) => `
          <button class="p4-choice-btn" onclick="window.GhazlanDiscover.chooseScene('${story.id}', ${idx})">${esc(ch.label)}</button>
        `).join('')}
      </div>

      <div class="row-gap" style="flex-wrap:wrap">
        <button class="btn btn-primary" style="flex:1" onclick="window.GhazlanDiscover.continueStoryInChat('${story.id}')">💬 إكمال المشهد في الدردشة الذكية</button>
        <button class="btn-chip" onclick="window.GhazlanDiscover.resetStory('${story.id}')">🔄 إعادة من البداية</button>
      </div>
    `);
  }

  function toggleStoryCast(storyId, charId, checked) {
    const prog = storyProgress[storyId];
    if (!prog) return;
    let list = Array.isArray(prog.castIds) ? [...prog.castIds] : [];
    if (checked && !list.includes(charId)) list.push(charId);
    if (!checked && list.length > 1) list = list.filter((x) => x !== charId);
    prog.castIds = list;
    prog.updatedAt = Date.now();
    saveStoryProgress();
    const story = getAllStories().find((s) => s.id === storyId);
    if (story) { syncStoryToCloud(story, prog); renderStoryPlayerModal(story); }
  }

  function chooseScene(storyId, choiceIdx) {
    const story = getAllStories().find((s) => s.id === storyId);
    const prog = storyProgress[storyId];
    if (!story || !prog) return;
    const cur = story.scenes[prog.sceneId];
    const choice = cur?.choices?.[choiceIdx];
    if (!choice || !story.scenes[choice.next]) return;
    prog.history.push({ from: prog.sceneId, choice: choice.label, to: choice.next, ts: Date.now() });
    prog.sceneId = choice.next;
    const nextScene = story.scenes[choice.next];
    prog.completed = !!nextScene.ending;
    prog.endingTitle = nextScene.ending ? nextScene.title : '';
    prog.updatedAt = Date.now();
    saveStoryProgress();
    syncStoryToCloud(story, prog);
    renderStoryPlayerModal(story);
    renderDiscoverScreen();
  }

  function resetStory(storyId) {
    const story = getAllStories().find((s) => s.id === storyId);
    if (!story) return;
    const prevCast = storyProgress[storyId]?.castIds || [characters[0]?.id || 'ghazlan'];
    storyProgress[storyId] = { sceneId: story.startScene, history: [], castIds: prevCast, completed: false, endingTitle: '', updatedAt: Date.now() };
    saveStoryProgress();
    renderStoryPlayerModal(story);
    renderDiscoverScreen();
    showToast('تمت إعادة القصة من الفصل الأول 🔄');
  }

  function continueStoryInChat(storyId) {
    const story = getAllStories().find((s) => s.id === storyId);
    const prog = storyProgress[storyId];
    if (!story || !prog) return;
    const scene = story.scenes[prog.sceneId] || story.scenes[story.startScene];
    const cast = (prog.castIds && prog.castIds.length) ? prog.castIds : ['ghazlan'];
    const introMsg = `📖 [سيناريو نشط: ${story.title} — ${scene.title}]\n${scene.text}\n\n(أكمل القصة معي من هذا المشهد بأسلوبك الطبيعي!)`;
    closeModals();
    if (cast.length === 1) {
      openDirectWith(cast[0]);
    } else {
      const gid = 'g_story_' + Date.now();
      chats.unshift({
        id: gid,
        type: 'group',
        title: `📖 ${story.title}`,
        members: cast,
        speakerMode: 'round',
        muted: [],
        messages: [{ role: 'model', charId: cast[0], raw: `📖 بدأنا سيناريو "${story.title}" معاً!\n\n${scene.text}`, ts: Date.now() }],
      });
      saveChats();
      openChatById(gid);
    }
    const promptEl = document.getElementById('prompt');
    if (promptEl) { promptEl.value = introMsg; promptEl.focus(); }
    showToast('تم تجهيز المشهد في المحادثة — اضغط إرسال للمتابعة 🎭');
  }

  // ---- Scenario Editor Modal ----
  function openStoryEditor() {
    openDiscoverModal(`
      <h3>✍️ محرر السيناريو التفاعلي
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="window.GhazlanDiscover.closeModal()">✕</button>
      </h3>
      <div class="sec-box">
        <div class="field"><label>عنوان القصة *</label><input id="seTitle" placeholder="مثلاً: سهرة عاصفة في الجبل" /></div>
        <div class="row-gap">
          <div class="field" style="flex:1"><label>التصنيف</label>
            <select id="seCat">
              <option value="مغامرة">مغامرة</option>
              <option value="جامعة">جامعة</option>
              <option value="رحلة">رحلة</option>
              <option value="غموض">غموض</option>
              <option value="عمل">عمل</option>
              <option value="موقف اجتماعي">موقف اجتماعي</option>
            </select>
          </div>
          <div class="field" style="width:80px"><label>رمز</label><input id="seEmoji" value="📖" /></div>
        </div>
        <div class="field"><label>المقدمة والسيناريو *</label><textarea id="sePremise" rows="2" placeholder="وصف مختصر لفكرة القصة..."></textarea></div>
        <div class="row-gap">
          <div class="field" style="flex:1"><label>الهدف</label><input id="seGoals" placeholder="ماذا نريد أن نحقق؟" /></div>
          <div class="field" style="flex:1"><label>القواعد</label><input id="seRules" placeholder="مثلاً: حوار واقعي" /></div>
        </div>
      </div>
      <div class="sec-box">
        <div class="sec-title"><span>🎬 المشهد الأول والاختيارات</span></div>
        <div class="field"><label>نص المشهد الافتتاحي *</label><textarea id="seS1" rows="2" placeholder="اكتب بداية المشهد..."></textarea></div>
        <div class="field"><label>الاختيار الأول (يؤدي للنهاية 1)</label><input id="seC1" placeholder="مثلاً: أختار الطريق الهادئ" /></div>
        <div class="field"><label>نتيجة / نهاية الاختيار الأول *</label><textarea id="seE1" rows="2" placeholder="ماذا يحدث إذا اختار اللاعب الاختيار الأول؟"></textarea></div>
        <div class="field"><label>الاختيار الثاني (يؤدي للنهاية 2)</label><input id="seC2" placeholder="مثلاً: أختار المغامرة الجريئة" /></div>
        <div class="field"><label>نتيجة / نهاية الاختيار الثاني</label><textarea id="seE2" rows="2" placeholder="ماذا يحدث إذا اختار اللاعب الاختيار الثاني؟"></textarea></div>
      </div>
      <button class="btn btn-primary" onclick="window.GhazlanDiscover.saveNewStory()">حفظ السيناريو وتشغيله ✅</button>
    `);
  }

  function saveNewStory() {
    const title = sanitizeText(document.getElementById('seTitle')?.value, 80).text;
    const premise = sanitizeText(document.getElementById('sePremise')?.value, 300).text;
    const s1 = sanitizeText(document.getElementById('seS1')?.value, 600).text;
    const c1 = sanitizeText(document.getElementById('seC1')?.value, 120).text || 'المتابعة في المسار الأول';
    const e1 = sanitizeText(document.getElementById('seE1')?.value, 600).text;
    const c2 = sanitizeText(document.getElementById('seC2')?.value, 120).text;
    const e2 = sanitizeText(document.getElementById('seE2')?.value, 600).text;
    if (!title || !s1 || !e1) { showToast('أكمل العنوان ونص المشهد الأول ونهايته على الأقل.'); return; }

    const choices = [{ label: c1, next: 'end1' }];
    const scenes = {
      s1: { title: 'الفصل 1: البداية', text: s1, choices },
      end1: { title: 'النهاية الأولى', text: e1, ending: true },
    };
    if (c2 && e2) {
      choices.push({ label: c2, next: 'end2' });
      scenes.end2 = { title: 'النهاية الثانية', text: e2, ending: true };
    }
    const newStory = {
      id: 'st_user_' + Date.now(),
      title,
      category: document.getElementById('seCat')?.value || 'مغامرة',
      emoji: sanitizeText(document.getElementById('seEmoji')?.value || '📖', 6).text || '📖',
      isBuiltin: false,
      premise: premise || s1.slice(0, 120),
      goals: sanitizeText(document.getElementById('seGoals')?.value, 160).text,
      rules: sanitizeText(document.getElementById('seRules')?.value, 160).text,
      startScene: 's1',
      scenes,
    };
    customStories.unshift(newStory);
    saveCustomStories();
    syncStoryToCloud(newStory, { sceneId: 's1', history: [], castIds: ['ghazlan'] });
    showToast(`تم إنشاء سيناريو "${title}" وحفظه ✅`);
    openStoryPlayer(newStory.id);
    renderDiscoverScreen();
  }

  // ---- Diaries & Posts (Section 5.3) ----
  let pendingDiaryImg = '';

  function openDiaryComposer() {
    pendingDiaryImg = '';
    const charOpts = characters.map((c) => `<option value="${esc(c.id)}">${c.emoji || '🌙'} ${esc(getDisplayName(c))}</option>`).join('');
    openDiscoverModal(`
      <h3>📓 منشور / يومية جديدة للشخصية
        <button class="icon-btn" style="width:30px;height:30px;font-size:14px;color:var(--muted)" onclick="window.GhazlanDiscover.closeModal()">✕</button>
      </h3>
      <div class="sec-box">
        <div class="row-gap">
          <div class="field" style="flex:1"><label>الشخصية</label><select id="dcChar">${charOpts}</select></div>
          <div class="field" style="flex:1"><label>الحالة / المزاج</label><input id="dcMood" placeholder="مثلاً: مرتاحة ☕" /></div>
        </div>
        <div class="row-gap">
          <div class="field" style="flex:1"><label>المكان الافتراضي</label><input id="dcLoc" placeholder="مثلاً: المقهى / الجامعة" /></div>
          <div class="field" style="flex:1"><label>الحدث المرتبط</label><input id="dcEvent" placeholder="مثلاً: استراحة المساء" /></div>
        </div>
        <div class="field">
          <label>نص اليومية *</label>
          <textarea id="dcText" rows="3" placeholder="اكتب يومية الشخصية أو اضغط التوليد الذكي بالأسفل..."></textarea>
        </div>
        <div class="row-gap" style="margin-bottom:6px;flex-wrap:wrap">
          <button class="btn-chip" id="dcGenBtn" onclick="window.GhazlanDiscover.generateAIDiary()">✨ توليد يومية بالذكاء الاصطناعي</button>
          <label class="btn-chip" style="cursor:pointer">🖼️ إرفاق صورة<input type="file" accept="image/*" style="display:none" onchange="window.GhazlanDiscover.onDiaryImg(this)" /></label>
        </div>
        <div id="dcImgPreview" style="font-size:11px;color:var(--emerald)"></div>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:6px;cursor:pointer">
          <input type="checkbox" id="dcAllowComments" />
          السماح بتعليق محدود (بحد أقصى تعليقان) من شخصية أخرى
        </label>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">🔒 خصوصية: تُحفظ اليومية داخل حسابك فقط ولا تُنشر خارج التطبيق أبداً.</div>
      <button class="btn btn-primary" onclick="window.GhazlanDiscover.saveDiaryPost()">نشر في اليوميات 📓</button>
    `);
  }

  function onDiaryImg(input) {
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 640;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingDiaryImg = canvas.toDataURL('image/jpeg', 0.72);
        const prev = document.getElementById('dcImgPreview');
        if (prev) prev.textContent = '✅ تم إرفاق الصورة وضغطها بنجاح.';
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  async function generateAIDiary() {
    const btn = document.getElementById('dcGenBtn');
    const charId = document.getElementById('dcChar')?.value || 'ghazlan';
    const ch = getChar(charId);
    const loc = document.getElementById('dcLoc')?.value || ch.status?.activity || 'يومي العادي';
    const ev = document.getElementById('dcEvent')?.value || 'لحظة عفوية';
    if (!window.GhazlanAPI?.isSignedIn()) { showToast('سجّل الدخول إلى Supabase لاستخدام التوليد الذكي.'); return; }
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري الكتابة...'; }
    try {
      const sys = `${buildCharacterPrompt(ch)}\nاكتبي منشور يوميات قصير جداً (2 إلى 3 جمل فقط) بلسانك الطبيعي حول: ${loc} / ${ev}. لا تكشفي أي بيانات خاصة للمستخدم.`;
      let out = '';
      await window.GhazlanAPI.streamChatCompletion({
        provider: settings.provider || 'gemini',
        geminiModel: settings.geminiModel || 'auto',
        groqModel: settings.groqModel,
        orModel: settings.orModel,
        systemPrompt: sys,
        messages: [{ role: 'user', text: 'اكتبي يومية قصيرة عفوية لهذه اللحظة.' }],
        temperature: 0.9,
        maxTokens: 220,
        fastMode: true,
        autoFallback: true,
        stream: true,
        timezone: window.GhazlanTime?.getTimezone() || 'Africa/Algiers',
      }, (delta) => { out += delta; });
      const ta = document.getElementById('dcText');
      if (ta && out.trim()) ta.value = out.trim();
    } catch (e) {
      showToast('تعذر التوليد: ' + e.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✨ توليد يومية بالذكاء الاصطناعي'; }
    }
  }

  function saveDiaryPost() {
    const charId = document.getElementById('dcChar')?.value || 'ghazlan';
    const content = sanitizeText(document.getElementById('dcText')?.value, 800).text;
    if (!content) { showToast('اكتب نص اليومية أولاً.'); return; }
    const entry = {
      id: 'd_' + Date.now(),
      character_id: charId,
      content,
      mood: sanitizeText(document.getElementById('dcMood')?.value, 50).text,
      location: sanitizeText(document.getElementById('dcLoc')?.value, 60).text,
      event_ref: sanitizeText(document.getElementById('dcEvent')?.value, 60).text,
      image_data: pendingDiaryImg || '',
      comments: [],
      allow_char_comments: !!document.getElementById('dcAllowComments')?.checked,
      created_at: new Date().toISOString(),
    };
    diaries.unshift(entry);
    saveDiaries();
    syncDiaryToCloud(entry);
    pendingDiaryImg = '';
    closeModals();
    renderDiscoverScreen();
    showToast('تم حفظ اليومية في السجل الخاص 📓');
  }

  async function addCharacterComment(diaryId) {
    const d = diaries.find((x) => x.id === diaryId);
    if (!d || !d.allow_char_comments) return;
    if ((d.comments || []).length >= 2) { showToast('تم الوصول للحد الأقصى للتعليقات (تعليقان لكل منشور).'); return; }
    const others = characters.filter((c) => c.id !== d.character_id);
    if (!others.length) { showToast('أضف شخصية أخرى من مكتبة الشخصيات أولاً لتتمكن من التعليق.'); return; }
    const commenter = others[(d.comments || []).length % others.length];
    let text = `تعليق لطيف من ${getDisplayName(commenter)}: يعطيك الصحة على هذه الأجواء الجميلة! ✨`;
    if (window.GhazlanAPI?.isSignedIn()) {
      showToast(`جاري كتابة تعليق من ${getDisplayName(commenter)}... ⏳`);
      try {
        let out = '';
        await window.GhazlanAPI.streamChatCompletion({
          provider: settings.provider || 'gemini',
          geminiModel: settings.geminiModel || 'auto',
          systemPrompt: `${buildCharacterPrompt(commenter)}\nاكتب تعليقاً قصيراً جداً (جملة واحدة فقط) ولطيفاً على يومية صديقتك.`,
          messages: [{ role: 'user', text: `اليومية: "${d.content}"` }],
          temperature: 0.85,
          maxTokens: 100,
          fastMode: true,
          autoFallback: true,
          stream: true,
          timezone: window.GhazlanTime?.getTimezone() || 'Africa/Algiers',
        }, (delta) => { out += delta; });
        if (out.trim()) text = out.trim();
      } catch {}
    }
    d.comments = d.comments || [];
    d.comments.push({ charId: commenter.id, name: getDisplayName(commenter), text, ts: Date.now() });
    saveDiaries();
    renderDiscoverScreen();
  }

  function deleteDiaryPost(diaryId) {
    diaries = diaries.filter((x) => x.id !== diaryId);
    saveDiaries();
    renderDiscoverScreen();
    showToast('تم حذف المنشور 🗑️');
  }

  // ---- Main Render for Discover Screen ----
  function renderDiscoverScreen() {
    const body = document.getElementById('homeBody');
    if (!body) return;

    const subHeader = `
      <div class="p4-subtabs">
        <button class="p4-subtab ${activeSubTab === 'chars' ? 'active' : ''}" onclick="window.GhazlanDiscover.setSubTab('chars')">🎭 الشخصيات</button>
        <button class="p4-subtab ${activeSubTab === 'stories' ? 'active' : ''}" onclick="window.GhazlanDiscover.setSubTab('stories')">📖 القصص</button>
        <button class="p4-subtab ${activeSubTab === 'diaries' ? 'active' : ''}" onclick="window.GhazlanDiscover.setSubTab('diaries')">📓 اليوميات</button>
      </div>`;

    if (activeSubTab === 'chars') {
      const q = (charFilter.q || '').trim().toLowerCase();
      const filtered = BUILTIN_LIBRARY_CHARS.filter((c) => {
        if (charFilter.cat !== 'all' && c.category !== charFilter.cat) return false;
        if (charFilter.dialect !== 'all' && !c.dialect.includes(charFilter.dialect)) return false;
        if (charFilter.tone !== 'all' && c.tone !== charFilter.tone) return false;
        if (charFilter.len !== 'all' && c.replyLen !== charFilter.len) return false;
        if (charFilter.favOnly && !favCharIds.includes(c.id)) return false;
        if (q && !(c.name + ' ' + c.tagline + ' ' + c.traits + ' ' + c.tags.join(' ')).toLowerCase().includes(q)) return false;
        return true;
      });

      body.innerHTML = subHeader + `
        <div class="sec-box" style="margin:6px">
          <div class="sec-title">
            <span>🎭 مكتبة الشخصيات (${filtered.length})</span>
            <label class="btn-chip" style="cursor:pointer;font-size:11px">📥 استيراد UEC<input type="file" accept=".json,application/json" style="display:none" onchange="window.GhazlanDiscover.importUEC(this.files[0]);this.value=''" /></label>
          </div>
          <div class="p4-filters">
            <input placeholder="ابحث بالاسم أو الوسم..." value="${esc(charFilter.q)}" oninput="window.GhazlanDiscover.setFilter('q', this.value)" />
            <select onchange="window.GhazlanDiscover.setFilter('cat', this.value)">
              ${CHAR_CATEGORIES.map((k) => `<option value="${k.id}" ${charFilter.cat === k.id ? 'selected' : ''}>${k.label}</option>`).join('')}
            </select>
            <select onchange="window.GhazlanDiscover.setFilter('dialect', this.value)">
              <option value="all" ${charFilter.dialect === 'all' ? 'selected' : ''}>كل اللهجات</option>
              <option value="دارجة" ${charFilter.dialect === 'دارجة' ? 'selected' : ''}>دارجة جزائرية</option>
              <option value="فصحى" ${charFilter.dialect === 'فصحى' ? 'selected' : ''}>عربية فصحى</option>
              <option value="عربية" ${charFilter.dialect === 'عربية' ? 'selected' : ''}>عربية عامة/تقنية</option>
            </select>
            <select onchange="window.GhazlanDiscover.setFilter('len', this.value)">
              <option value="all" ${charFilter.len === 'all' ? 'selected' : ''}>كل أطوال الرد</option>
              <option value="short" ${charFilter.len === 'short' ? 'selected' : ''}>رد قصير</option>
              <option value="balanced" ${charFilter.len === 'balanced' ? 'selected' : ''}>رد متوازن</option>
              <option value="detailed" ${charFilter.len === 'detailed' ? 'selected' : ''}>رد مفصّل</option>
            </select>
            <button class="btn-chip" onclick="window.GhazlanDiscover.setFilter('favOnly', ${!charFilter.favOnly})">${charFilter.favOnly ? '⭐ المفضلة فقط' : '☆ الكل'}</button>
          </div>
        </div>
        <div class="p4-grid">
          ${filtered.length ? filtered.map((c) => {
            const isFav = favCharIds.includes(c.id);
            const catLabel = CHAR_CATEGORIES.find((k) => k.id === c.category)?.label || c.category;
            return `<div class="p4-card" onclick="window.GhazlanDiscover.previewChar('${c.id}')">
              <div class="p4-card-head">
                <div class="p4-av">${c.emoji}</div>
                <div style="min-width:0;flex:1">
                  <div style="font-weight:700;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)} ${isFav ? '⭐' : ''}</div>
                  <span class="p4-badge">${esc(catLabel)}</span>
                </div>
              </div>
              <div style="font-size:11.5px;color:var(--muted);line-height:1.45">${esc(c.tagline)}</div>
              <div class="p4-tags">${c.tags.slice(0, 3).map((t) => `<span class="p4-tag">#${esc(t)}</span>`).join('')}</div>
            </div>`;
          }).join('') : `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:18px;font-size:12.5px">لا توجد شخصيات مطابقة للفلتر الحالي.</div>`}
        </div>
        <div class="sec-box" style="margin:6px">
          <div class="sec-title"><span>📤 تصدير إحدى شخصياتك (UEC الآمن)</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${characters.map((ch) => `<button class="btn-chip" onclick="window.GhazlanDiscover.exportOwnedUEC('${esc(ch.id)}')">${ch.emoji || '🌙'} ${esc(getDisplayName(ch))}</button>`).join('')}
          </div>
        </div>`;
      return;
    }

    if (activeSubTab === 'stories') {
      const all = getAllStories();
      body.innerHTML = subHeader + `
        <div class="sec-box" style="margin:6px">
          <div class="row-gap" style="justify-content:space-between">
            <span style="font-weight:700;font-size:13px">📖 القصص والسيناريوهات (${all.length})</span>
            <button class="btn btn-primary" style="width:auto;padding:7px 12px;font-size:12px" onclick="window.GhazlanDiscover.openStoryEditor()">✍️ محرر سيناريو</button>
          </div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:4px">اختر قصة تفاعلية بفصول ونهايات متعددة مع حفظ تلقائي لنقطة التقدم.</div>
        </div>
        ${all.map((st) => {
          const p = storyProgress[st.id];
          const statusTxt = p?.completed ? `🏁 مكتملة (${p.endingTitle})` : (p?.history?.length ? `📌 قيد اللعب (${p.history.length} اختيار)` : '🆕 لم تبدأ بعد');
          return `<div class="p4-story-card">
            <div class="row-gap" style="justify-content:space-between">
              <strong style="font-size:14px">${st.emoji || '📖'} ${esc(st.title)}</strong>
              <span class="p4-badge">${esc(st.category)}</span>
            </div>
            <div style="font-size:12px;color:var(--muted);line-height:1.5">${esc(st.premise)}</div>
            <div class="row-gap" style="justify-content:space-between;margin-top:4px">
              <span style="font-size:11px;color:${p?.completed ? 'var(--emerald)' : 'var(--accent3)'}">${esc(statusTxt)}</span>
              <button class="btn-chip" onclick="window.GhazlanDiscover.openStory('${esc(st.id)}')">${p?.history?.length ? '▶️ متابعة القصة' : '🎬 ابدأ القصة'}</button>
            </div>
          </div>`;
        }).join('')}
        <div class="p4-privacy">ℹ️ مكتبة السيناريوهات المجتمعية العامة مؤجلة لمراحل لاحقة حتى اكتمال نظام الخصوصية والمراجعة والإبلاغ وحقوق النشر.</div>`;
      return;
    }

    // Diaries Sub-tab
    const list = diaryCharFilter === 'all' ? diaries : diaries.filter((d) => d.character_id === diaryCharFilter);
    body.innerHTML = subHeader + `
      <div class="p4-privacy">🔒 <strong>خصوصية تامة:</strong> اليوميات خاصة بك فقط محلياً وسحابياً (RLS). لا تنشر الشخصيات خارج التطبيق ولا تكشف بياناتك أبداً.</div>
      <div class="sec-box" style="margin:6px">
        <div class="row-gap">
          <select style="flex:1;padding:7px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px" onchange="window.GhazlanDiscover.setDiaryFilter(this.value)">
            <option value="all" ${diaryCharFilter === 'all' ? 'selected' : ''}>كل الشخصيات (${diaries.length})</option>
            ${characters.map((c) => `<option value="${esc(c.id)}" ${diaryCharFilter === c.id ? 'selected' : ''}>${c.emoji || '🌙'} ${esc(getDisplayName(c))}</option>`).join('')}
          </select>
          <button class="btn btn-primary" style="width:auto;padding:7px 12px;font-size:12px" onclick="window.GhazlanDiscover.openDiaryComposer()">➕ يومية جديدة</button>
        </div>
      </div>
      ${list.length ? list.map((d) => {
        const ch = getChar(d.character_id);
        const dt = new Date(d.created_at).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' });
        return `<div class="p4-diary-card">
          <div class="row-gap" style="justify-content:space-between">
            <div class="row-gap">
              <div class="p4-av" style="width:34px;height:34px;font-size:17px">${ch.avatar ? `<img src="${esc(ch.avatar)}" />` : (ch.emoji || '🌙')}</div>
              <div>
                <div style="font-weight:700;font-size:13px">${esc(getDisplayName(ch))}</div>
                <div style="font-size:10.5px;color:var(--muted)">${esc(dt)}${d.location ? ' • 📍 ' + esc(d.location) : ''}</div>
              </div>
            </div>
            <button class="icon-btn" style="width:28px;height:28px;font-size:12px;color:var(--rose)" onclick="window.GhazlanDiscover.deleteDiary('${esc(d.id)}')">🗑️</button>
          </div>
          ${(d.mood || d.event_ref) ? `<div class="p4-tags">${d.mood ? `<span class="p4-badge">💫 ${esc(d.mood)}</span>` : ''}${d.event_ref ? `<span class="p4-badge">🗓️ ${esc(d.event_ref)}</span>` : ''}</div>` : ''}
          <div style="font-size:13px;line-height:1.65">${esc(d.content)}</div>
          ${d.image_data ? `<img class="p4-diary-img" src="${esc(d.image_data)}" alt="صورة اليومية" />` : ''}
          ${(d.comments || []).map((cm) => `<div class="p4-comment"><strong>${esc(cm.name)}:</strong> ${esc(cm.text)}</div>`).join('')}
          ${d.allow_char_comments && (d.comments || []).length < 2 ? `<button class="btn-chip" style="align-self:flex-start" onclick="window.GhazlanDiscover.addDiaryComment('${esc(d.id)}')">💬 تعليق محدود من شخصية أخرى (${(d.comments || []).length}/2)</button>` : ''}
        </div>`;
      }).join('') : `<div style="text-align:center;color:var(--muted);padding:20px;font-size:12.5px">لا توجد يوميات بعد. أضف أول يومية أو ولّدها بالذكاء الاصطناعي.</div>`}`;
  }

  // ---- Inject 5th Bottom Nav Tab ("🧭 اكتشف") ----
  const bnav = document.querySelector('.bottom-nav');
  if (bnav && !document.getElementById('navDiscover')) {
    const btn = document.createElement('button');
    btn.className = 'bnav-btn';
    btn.id = 'navDiscover';
    btn.innerHTML = '<span class="bi">🧭</span><span>اكتشف</span>';
    btn.onclick = () => switchHomeTab('discover');
    bnav.appendChild(btn);
  }

  // Hook into switchHomeTab
  const _oldSwitchP4 = window.switchHomeTab;
  window.switchHomeTab = function (t) {
    if (typeof _oldSwitchP4 === 'function') _oldSwitchP4(t);
    const nd = document.getElementById('navDiscover');
    if (nd) nd.classList.toggle('active', t === 'discover');
    if (t === 'discover') renderDiscoverScreen();
  };

  window.GhazlanDiscover = {
    setSubTab(st) { activeSubTab = st; renderDiscoverScreen(); },
    setFilter(k, v) { charFilter[k] = v; renderDiscoverScreen(); },
    setDiaryFilter(v) { diaryCharFilter = v; renderDiscoverScreen(); },
    previewChar: openCharPreview,
    addChar: addLibraryChar,
    toggleFav: toggleFavChar,
    exportLibUEC(id) { const c = BUILTIN_LIBRARY_CHARS.find((x) => x.id === id); if (c) exportCharacterUEC(c); },
    exportOwnedUEC(id) { const c = characters.find((x) => x.id === id); if (c) exportCharacterUEC(c); },
    importUEC: importCharacterUECFile,
    openStory: openStoryPlayer,
    toggleStoryCast,
    chooseScene,
    resetStory,
    continueStoryInChat,
    openStoryEditor,
    saveNewStory,
    openDiaryComposer,
    onDiaryImg,
    generateAIDiary,
    saveDiaryPost,
    addDiaryComment: addCharacterComment,
    deleteDiary: deleteDiaryPost,
    closeModal: closeModals,
    render: renderDiscoverScreen,
  };
})();
