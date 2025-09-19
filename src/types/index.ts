export interface CompanyData {
  name: string;
  website: string;
  businessPositioning: {
    tagline: string;
    promise: string;
    valueProposition: string[];
  };
  targetAudience: {
    segments: string[];
    painPoints: string[];
    decisionTriggers: string[];
  };
  contentGoals: {
    seo: boolean;
    authority: boolean;
    leadGeneration: boolean;
    brandAwareness: boolean;
  };
  toneOfVoice: {
    style: string[];
    preferences: string[];
  };
  existingContent: {
    websiteCopy: string[];
    linkedinPosts: string[];
    pastBlogs: string[];
  };
}

export interface SitePage {
  url: string;
  title: string;
  description: string;
  pageType: 'homepage' | 'service' | 'about' | 'blog' | 'contact' | 'product' | 'other';
  linkingOpportunities: {
    whenToLink: string;
    suggestedAnchorText: string[];
    contextualRelevance: string;
  };
}

export interface KeywordTopic {
  topic: string;
  keywords: KeywordData[];
  cluster: string;
  used?: boolean;
  usedAt?: Date;
}

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  difficulty: number;
  cpc: number;
  competition: string;
  intent: 'informational' | 'commercial' | 'navigational' | 'transactional';
  cluster: string;
}

export interface WritingInstructions {
  company: string;
  website: string;
  oneLineDescription: string;
  brandBackground: {
    mission: string;
    productsServices: string[];
    uniqueDifferentiators: string[];
  };
  purposeGoals: string[];
  audiencePersonas: Array<{
    persona: string;
    role: string;
    painPoints: string[];
    contentNeeds: string[];
  }>;
  toneStyle: {
    voice: string;
    tone: string;
    perspective: string;
    brandKeywords: string[];
  };
  blogStructure: {
    headlineGuidelines: string;
    introGuidelines: string;
    defaultOutline: string[];
    visualGuidelines: string;
  };
  seoGuidelines: {
    primaryKeywordExamples: string[];
    keywordPlacementRules: string[];
    metaLengths: { titleMax: number; descriptionMax: number };
    internalLinkTargets: string[];
    externalSourcesPreferred: string[];
  };
  contentRequirements: string[];
  visualsMedia: {
    featuredImageRequired: boolean;
    inPostImages: number;
    allowedSources: string[];
    altTextRule: string;
  };
  cta: {
    primaryTypes: string[];
    placement: string[];
    tone: string;
    exampleCopy: string[];
  };
  formattingSubmission: {
    outputFormats: string[];
    fileNamingPattern: string;
    workflow: string[];
  };
  qualityChecklist: string[];
  sampleTopics: string[];
}

export interface InternalLink {
  url: string;
  title: string;
  pageType: string;
  usageNotes: string;
  suggestedAnchorText: string[];
  contextualRelevance: string;
}

export interface ArticleContent {
  title: string;
  content: string;
  keywords: string[];
  internalLinks: Array<{
    url: string;
    anchorText: string;
    context: string;
  }>;
  metadata: {
    wordCount: number;
    readingTime: number;
    articleType: string;
    targetKeyword: string;
    createdAt: Date;
  };
}

export interface ScriptConfig {
  companyName: string;
  companyPath: string;
  websiteUrl?: string;
}