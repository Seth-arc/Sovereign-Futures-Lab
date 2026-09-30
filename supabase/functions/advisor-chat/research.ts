export type AdvisorId = "amara" | "daniel";

export type ResearchAuthorityTier =
  | "OFFICIAL_G20_COMMON_FRAMEWORK"
  | "ILLUSTRATIVE_TEMPLATE"
  | "EMPIRICAL_RESEARCH"
  | "POLICY_PROPOSAL";

export interface ResearchCard {
  claimId: string;
  sourceId: string;
  sourceTitle: string;
  sourceClass: string;
  pageReference: string;
  boundedClaim: string;
  supportingExcerpt: string;
  scopeConditions: readonly string[];
  prohibitedInferences: readonly string[];
  publicUseStatus: "APPROVED_WITH_SCOPE" | "APPROVED_IF_LABELED_PROPOSAL";
  authorityTier: ResearchAuthorityTier;
  advisorTags: readonly AdvisorId[];
  topicTags: readonly string[];
  keywords: readonly string[];
}

export interface AdvisorCitation {
  claimId: string;
  sourceId: string;
  sourceTitle: string;
  pageReference: string;
  sourceClass: string;
}

export interface ResearchBoundaryResponse {
  kind: "BOUNDED_ANSWER" | "SOURCE_GAP";
  answer: string;
  claimIds: readonly string[];
}

const CF_TITLE = "Common Framework for Debt Treatments beyond the DSSI";
const G20_TITLE = "G20 Note — Common Framework: Lessons Learned and Ways Forward";
const MOU_TITLE = "Illustrative Template Memorandum of Understanding on Debt Treatment under the Common Framework";
const HCL_TITLE = "How China Lends: A Rare Look into 100 Debt Contracts with Foreign Governments";
const HCC_TITLE = "How China Collateralizes";

export const RESEARCH_CARDS: readonly ResearchCard[] = [
  {
    claimId: "CLAIM-CF-001",
    sourceId: "SRC-CF-2020",
    sourceTitle: CF_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_PROCESS",
    pageReference: "PDF p. 1, 'Need for Debt Treatment and Debt eligible to the Treatment'",
    boundedClaim: "The Common Framework process begins at the debtor country's request. The need for treatment and restructuring envelope are based on the IMF-WBG DSA and participating official creditors' collective assessment and should align with an upper-credit-tranche IMF-supported program.",
    supportingExcerpt: "The process will be initiated at the request of a debtor country.",
    scopeConditions: ["Common Framework debt-treatment requests within the framework's eligibility and institutional scope."],
    prohibitedInferences: ["Do not turn this dependency into a rigid universal chronology.", "Do not claim one institution alone determines the envelope."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara"],
    topicTags: ["common-framework", "debt-treatment-request", "dsa", "restructuring-envelope", "imf-program"],
    keywords: ["common framework", "debtor request", "debt treatment request", "dsa", "debt sustainability", "restructuring envelope", "imf program"],
  },
  {
    claimId: "CLAIM-CF-002",
    sourceId: "SRC-CF-2020",
    sourceTitle: CF_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_PROCESS",
    pageReference: "PDF p. 1, 'Need for Debt Treatment and Debt eligible to the Treatment'",
    boundedClaim: "The 2020 Common Framework states that eligible debt includes public and publicly guaranteed debt with original maturity over one year, while taking account of the DSSI cut-off date protecting new financing after 24 March 2020.",
    supportingExcerpt: "Debt eligible to the treatment will include all public and publicly guaranteed debts which have an original maturity of more than one year.",
    scopeConditions: ["Use as the 2020 baseline; later case-specific treatment scope and cut-off decisions can differ."],
    prohibitedInferences: ["Do not imply every later Official Creditor Committee uses the same cut-off date or treatment perimeter."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara", "daniel"],
    topicTags: ["treatment-perimeter", "eligible-debt", "cut-off-date", "ppg-debt"],
    keywords: ["eligible debt", "treatment perimeter", "cut-off", "cutoff", "publicly guaranteed", "ppg", "maturity over one year"],
  },
  {
    claimId: "CLAIM-CF-003",
    sourceId: "SRC-CF-2020",
    sourceTitle: CF_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_PROCESS",
    pageReference: "PDF p. 1, final paragraph under 'Need for Debt Treatment and Debt eligible to the Treatment'",
    boundedClaim: "A debtor requesting treatment is expected to provide the IMF, World Bank Group, and participating creditors necessary information about public-sector financial commitments while respecting commercially sensitive information.",
    supportingExcerpt: "necessary information regarding all public sector financial commitments (debt), while respecting commercially sensitive information.",
    scopeConditions: ["Common Framework process; precise disclosure content and legal ability remain case- and contract-specific."],
    prohibitedInferences: ["Do not infer that every participant automatically possesses all contract details.", "Do not infer that commercial sensitivity implies bad faith."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara", "daniel"],
    topicTags: ["information-sharing", "disclosure", "confidentiality", "verification"],
    keywords: ["information sharing", "disclosure", "confidential", "commercially sensitive", "financial commitments", "verification"],
  },
  {
    claimId: "CLAIM-CF-004",
    sourceId: "SRC-CF-2020",
    sourceTitle: CF_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_PROCESS",
    pageReference: "PDF pp. 1-2, 'Coordination among Official Bilateral Creditors' and 'Comparability of Treatment with Other Creditors'",
    boundedClaim: "The framework provides for coordinated official bilateral treatment and requires the debtor to seek treatment from other official bilateral and private creditors that is at least as favorable. Comparable efforts are assessed through nominal debt service, debt stock in NPV terms, and duration.",
    supportingExcerpt: "Assessment of comparable efforts will be based on changes in nominal debt service, debt stock in net present value terms and duration of the treated claims.",
    scopeConditions: ["Common Framework baseline; assessment remains case-specific and later guidance recognizes flexibility across indicators."],
    prohibitedInferences: ["Do not collapse Comparability of Treatment into a single haircut formula."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara", "daniel"],
    topicTags: ["comparability-of-treatment", "official-creditor-coordination", "nominal-debt-service", "npv", "duration"],
    keywords: ["comparability", "cot", "haircut", "nominal debt service", "net present value", "npv", "duration", "official creditor coordination"],
  },
  {
    claimId: "CLAIM-CF-005",
    sourceId: "SRC-CF-2020",
    sourceTitle: CF_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_PROCESS",
    pageReference: "PDF p. 1, final paragraph under 'Coordination among Official Bilateral Creditors'",
    boundedClaim: "Key treatment parameters are recorded in a legally non-binding MoU, while participating creditors implement the MoU through bilateral agreements with the debtor country.",
    supportingExcerpt: "Creditors will implement the MoU through bilateral agreements signed with the debtor country.",
    scopeConditions: ["Common Framework official bilateral treatment."],
    prohibitedInferences: ["Do not claim an MoU itself creates realized cash relief.", "Do not claim signing completes all bilateral implementation."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara", "daniel"],
    topicTags: ["mou", "bilateral-implementation", "legal-effect", "cash-relief"],
    keywords: ["mou", "memorandum of understanding", "bilateral agreement", "implementation", "cash relief", "legally non-binding"],
  },
  {
    claimId: "CLAIM-G20-001",
    sourceId: "SRC-G20-LL-2024",
    sourceTitle: G20_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_LESSONS",
    pageReference: "PDF pp. 2-5, Summary and section 1.1",
    boundedClaim: "The 2024 G20 lessons note describes the Common Framework as a case-by-case coordination platform and summarizes major process steps while calling for improved timeliness, predictability, clarity, and information sharing.",
    supportingExcerpt: "case-by-case basis, tailored to each borrower country's debt structure and to creditors' specific constraints.",
    scopeConditions: ["Lessons from Chad, Zambia, Ghana, and Ethiopia through October 2024."],
    prohibitedInferences: ["Do not represent the summarized steps as a fixed waterfall.", "Do not treat four cases as a universal causal model."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara"],
    topicTags: ["case-by-case", "process-sequence", "timeliness", "predictability", "information-sharing"],
    keywords: ["case by case", "case-by-case", "process sequence", "timeliness", "predictability", "chad", "zambia", "ghana", "ethiopia"],
  },
  {
    claimId: "CLAIM-G20-002",
    sourceId: "SRC-G20-LL-2024",
    sourceTitle: G20_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_LESSONS",
    pageReference: "PDF p. 6, text below Table 1",
    boundedClaim: "The G20 note states that restructurings are time-consuming at each stage because creditors examine commitments, solve technical issues, and obtain internal approvals, while debtors assemble data including individual cashflows for debt reconciliation.",
    supportingExcerpt: "Restructurings are time consuming at each stage.",
    scopeConditions: ["Observed lessons from the cases synthesized by the G20 note."],
    prohibitedInferences: ["Do not assign all delay to one creditor.", "Do not infer a universal duration for any step."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara"],
    topicTags: ["delay", "approvals", "reconciliation", "cashflows", "process-friction"],
    keywords: ["delay", "time consuming", "timing", "internal approval", "debt reconciliation", "cashflow", "process friction"],
  },
  {
    claimId: "CLAIM-G20-003",
    sourceId: "SRC-G20-LL-2024",
    sourceTitle: G20_TITLE,
    sourceClass: "OFFICIAL_INSTITUTIONAL_LESSONS",
    pageReference: "PDF p. 11, section 1.4",
    boundedClaim: "The 2024 G20 note lists three Comparability of Treatment indicators—change in debt stock NPV, change in duration, and change in nominal debt service over the IMF program period—and states that the assessment includes flexibility across them.",
    supportingExcerpt: "The assessment of the CoT based on the three indicators includes a certain degree of flexibility.",
    scopeConditions: ["Common Framework Comparability of Treatment implementation as discussed in the 2024 note."],
    prohibitedInferences: ["Do not infer that one indicator is dispositive in every case.", "Do not infer that the note defines a single haircut formula."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "OFFICIAL_G20_COMMON_FRAMEWORK",
    advisorTags: ["amara", "daniel"],
    topicTags: ["comparability-of-treatment", "npv", "duration", "nominal-debt-service", "flexibility"],
    keywords: ["comparability", "cot", "three indicators", "npv", "duration", "nominal debt service", "flexibility", "haircut"],
  },
  {
    claimId: "CLAIM-MOU-001",
    sourceId: "SRC-G20-MOU-TEMPLATE",
    sourceTitle: MOU_TITLE,
    sourceClass: "OFFICIAL_ILLUSTRATIVE_TEMPLATE",
    pageReference: "PDF p. 1, preamble paragraphs 2-3",
    boundedClaim: "The illustrative MoU template depicts financing assurances as a step that can pave the way for IMF Executive Board approval, followed separately by quantified treatment terms, agreement in principle, and MoU agreement.",
    supportingExcerpt: "the OCC provided financing assurances [...] paving the way for the approval [...] by the IMF Executive Board",
    scopeConditions: ["Illustrative and non-binding; provisions are not universally applicable and cases remain tailored."],
    prohibitedInferences: ["Do not claim every Common Framework case follows this exact sequence.", "Do not claim financing assurances are final commitments from every creditor."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "ILLUSTRATIVE_TEMPLATE",
    advisorTags: ["amara"],
    topicTags: ["financing-assurances", "imf-board", "agreement-in-principle", "mou", "lifecycle"],
    keywords: ["financing assurance", "imf board", "agreement in principle", "mou", "sequence", "lifecycle"],
  },
  {
    claimId: "CLAIM-MOU-002",
    sourceId: "SRC-G20-MOU-TEMPLATE",
    sourceTitle: MOU_TITLE,
    sourceClass: "OFFICIAL_ILLUSTRATIVE_TEMPLATE",
    pageReference: "PDF p. 2, footnote 3",
    boundedClaim: "The illustrative template states that debts covered by its debt-treatment article include debts with security arrangements.",
    supportingExcerpt: "All debts covered under Article II-1 a) and b), including those with security arrangements, shall be subject to the treatment.",
    scopeConditions: ["Illustrative template; the actual treatment perimeter remains subject to Official Creditor Committee decisions and case-specific terms."],
    prohibitedInferences: ["Do not infer every secured claim is treated identically.", "Do not infer security is irrelevant to comparability and implementation."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "ILLUSTRATIVE_TEMPLATE",
    advisorTags: ["daniel"],
    topicTags: ["secured-debt", "treatment-perimeter", "security-arrangements", "occ-discretion"],
    keywords: ["secured debt", "security arrangement", "treatment perimeter", "secured claim", "collateralized claim"],
  },
  {
    claimId: "CLAIM-MOU-003",
    sourceId: "SRC-G20-MOU-TEMPLATE",
    sourceTitle: MOU_TITLE,
    sourceClass: "OFFICIAL_ILLUSTRATIVE_TEMPLATE",
    pageReference: "PDF p. 5, footnote 7",
    boundedClaim: "For illustrative Comparability of Treatment information sharing, the template identifies financial and non-financial terms that could affect comparability, including covenants, collateral, negative pledges, embedded options, contingencies, and other material benefits.",
    supportingExcerpt: "Other relevant parameters also include, non-financial terms which could impact CoT, such as financial covenants, offers of collateral, negative pledge clauses",
    scopeConditions: ["Illustrative template; exact information and legal disclosure constraints remain case-specific."],
    prohibitedInferences: ["Do not claim every listed term changes Comparability of Treatment in every case.", "Do not claim contract clauses determine creditor behavior."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "ILLUSTRATIVE_TEMPLATE",
    advisorTags: ["daniel"],
    topicTags: ["comparability-of-treatment", "information-sharing", "collateral", "negative-pledge", "covenants", "embedded-options"],
    keywords: ["comparability", "cot", "covenant", "collateral", "negative pledge", "embedded option", "contingency", "material benefit"],
  },
  {
    claimId: "CLAIM-HCL-001",
    sourceId: "SRC-HCL-2021",
    sourceTitle: HCL_TITLE,
    sourceClass: "EMPIRICAL_CONTRACT_ANALYSIS",
    pageReference: "PDF/report pp. 4-5 and 11-15, Introduction and Dataset",
    boundedClaim: "The study analyzes 100 publicly available loan contracts signed between 2000 and 2020 between Chinese state-owned entities and government borrowers in 24 developing countries. The sample is informative but non-random and covers a small part of the broader lending universe.",
    supportingExcerpt: "100 debt contracts between Chinese state-owned entities and government borrowers in 24 countries [...] signed between 2000 and 2020.",
    scopeConditions: ["Preserve the sample, period, creditor, and public-availability boundaries."],
    prohibitedInferences: ["Do not universalize frequencies or terms to every Chinese loan, country, or period."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["daniel"],
    topicTags: ["empirical-scope", "chinese-lending", "contracts", "methodology", "sample-limitations"],
    keywords: ["how china lends", "chinese loan", "chinese lending", "contract sample", "100 contracts", "sample limitation", "methodology"],
  },
  {
    claimId: "CLAIM-HCL-002",
    sourceId: "SRC-HCL-2021",
    sourceTitle: HCL_TITLE,
    sourceClass: "EMPIRICAL_CONTRACT_ANALYSIS",
    pageReference: "PDF/report pp. 6-8 and 22-25, Summary and section 3.1",
    boundedClaim: "In the study's Chinese contract sample, borrower-facing confidentiality clauses are unusually broad relative to its benchmark sample, particularly in post-2014 China Eximbank contracts.",
    supportingExcerpt: "All of the post-2014 contracts with Chinese state-owned entities in our sample contain or reference far-reaching confidentiality clauses.",
    scopeConditions: ["The contract sample and periods analyzed by the study; individual wording and legal carve-outs matter."],
    prohibitedInferences: ["Do not infer illegality, bad faith, or actual nondisclosure in every case.", "Do not infer actual creditor conduct from clause existence."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["daniel"],
    topicTags: ["confidentiality", "disclosure", "china-eximbank", "contract-terms", "sample-limitations"],
    keywords: ["confidentiality", "confidential clause", "china eximbank", "eximbank", "non-disclosure", "nondisclosure", "contract term"],
  },
  {
    claimId: "CLAIM-HCL-003",
    sourceId: "SRC-HCL-2021",
    sourceTitle: HCL_TITLE,
    sourceClass: "EMPIRICAL_CONTRACT_ANALYSIS",
    pageReference: "PDF/report pp. 26-31, section 3.2",
    boundedClaim: "The study finds special or escrow accounts used as repayment security in a meaningful subset of its Chinese contract sample and little evidence in that sample that Chinese state-owned banks routinely use physical infrastructure as collateral.",
    supportingExcerpt: "We find little evidence in our contract sample that China's state-owned banks routinely use physical infrastructure [...] as collateral.",
    scopeConditions: ["Study sample only; account details are sometimes contained in unavailable related agreements."],
    prohibitedInferences: ["Do not translate collateral into physical asset seizure.", "Do not infer that all account arrangements operate identically."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["daniel"],
    topicTags: ["escrow", "special-accounts", "collateral", "physical-assets", "effective-control"],
    keywords: ["escrow", "special account", "repayment security", "physical infrastructure", "asset seizure", "collateral", "seaport", "power plant"],
  },
  {
    claimId: "CLAIM-HCC-001",
    sourceId: "SRC-HCC-2025",
    sourceTitle: HCC_TITLE,
    sourceClass: "EMPIRICAL_SECURED_LENDING_DATASET_AND_ANALYSIS",
    pageReference: "report pp. 10-13 (PDF pp. 11-14), section 3.1",
    boundedClaim: "The HCC dataset identifies 620 collateralized PPG loan commitments by Chinese state-owned creditors to 158 borrowers in 57 EMDEs during 2000-2021. It classifies 46% of studied PPG lending volume as collateralized, which the authors describe as a lower-bound estimate.",
    supportingExcerpt: "we identify 620 collateralized PPG loan commitments [...] to 158 borrowers in 57 EMDEs between 2000 and 2021.",
    scopeConditions: ["HCC Dataset v1.0, 2000-2021, PPG lending to emerging markets and developing economies."],
    prohibitedInferences: ["Do not claim all Chinese PPG lending is collateralized.", "Do not extend the percentage beyond the dataset or timeframe without new evidence."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["daniel"],
    topicTags: ["dataset-scope", "collateralization", "ppg-debt", "lower-bound"],
    keywords: ["how china collateralizes", "620", "46%", "collateralized ppg", "lower bound", "hcc dataset", "158 borrowers", "57 emde"],
  },
  {
    claimId: "CLAIM-HCC-002",
    sourceId: "SRC-HCC-2025",
    sourceTitle: HCC_TITLE,
    sourceClass: "EMPIRICAL_SECURED_LENDING_DATASET_AND_ANALYSIS",
    pageReference: "report pp. 14-17 (PDF pp. 15-18), Box 3.1 and Figure 3",
    boundedClaim: "In the HCC collateralized PPG lending portfolio, bank deposits and revenue claims are the dominant forms of collateral or quasi-collateral by lending volume, while physical and illiquid assets account for much smaller shares.",
    supportingExcerpt: '"Bank Deposits" dominate, making up 84% of total lending volume.',
    scopeConditions: ["HCC Dataset v1.0 definitions and classification; shares can overlap because a loan may have multiple collateral types."],
    prohibitedInferences: ["Do not infer every secured transaction uses an offshore bank account.", "Do not infer physical assets are never used."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["daniel"],
    topicTags: ["bank-accounts", "revenue-claims", "physical-assets", "collateral-taxonomy"],
    keywords: ["bank deposit", "revenue claim", "revenue account", "quasi-collateral", "physical asset", "collateral type", "collateral taxonomy"],
  },
  {
    claimId: "CLAIM-HCC-003",
    sourceId: "SRC-HCC-2025",
    sourceTitle: HCC_TITLE,
    sourceClass: "EMPIRICAL_SECURED_LENDING_DATASET_AND_ANALYSIS",
    pageReference: "report pp. 17-20 (PDF pp. 18-21), Figure 3 Panel B and surrounding text",
    boundedClaim: "Nearly two-thirds of the HCC collateralized PPG lending volume draws on assets unrelated to the financed project, and more than 70% of the portfolio collateralized against revenues relies on quasi-collateral arrangements providing effective control rather than only formal security grants.",
    supportingExcerpt: "nearly two-thirds (62%) of the collateralized PPG lending portfolio relies on assets unrelated to the purpose of the loan.",
    scopeConditions: ["HCC Dataset v1.0 classifications of related/unrelated collateral and formal/quasi-collateral."],
    prohibitedInferences: ["Do not infer effective control guarantees enforcement.", "Do not infer all such arrangements have identical legal effect."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["daniel"],
    topicTags: ["effective-control", "quasi-collateral", "unrelated-assets", "revenue-control"],
    keywords: ["effective control", "quasi-collateral", "unrelated asset", "revenue control", "formal security", "62%", "70%"],
  },
  {
    claimId: "CLAIM-HCC-004",
    sourceId: "SRC-HCC-2025",
    sourceTitle: HCC_TITLE,
    sourceClass: "EMPIRICAL_SECURED_LENDING_DATASET_AND_ANALYSIS",
    pageReference: "report pp. 21-24 (PDF pp. 22-25), section 3.3",
    boundedClaim: "For nearly half of collateralized PPG lending in the HCC dataset, the same asset or asset pool supports more than one loan. The paper identifies 52 cash collateral pools securing multiple debts and describes long-lived control implications.",
    supportingExcerpt: "For nearly half of the collateralized PPG lending portfolio, the same asset or pool of assets acts as collateral for more than one loan.",
    scopeConditions: ["HCC Dataset v1.0; predominantly same-creditor cross-collateralization in the documented cases."],
    prohibitedInferences: ["Do not infer competing creditor claims where the dataset instead shows the same creditor or group.", "Do not infer a specific restructuring outcome from cross-collateralization alone."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["daniel"],
    topicTags: ["cross-collateralization", "cash-pooling", "dependency", "duration"],
    keywords: ["cross-collateral", "cross collateral", "cash pool", "asset pool", "multiple loans", "52 pools", "shared pool"],
  },
  {
    claimId: "CLAIM-WB-001",
    sourceId: "SRC-WB-STATUTORY-2022",
    sourceTitle: "Potential Statutory Options to Encourage Private Sector Creditor Participation in the Common Framework",
    sourceClass: "POLICY_OPTIONS_NOTE",
    pageReference: "report p. 3 and pp. 7-11 (PDF p. 4 and pp. 8-12), Background summary and 'Potential Statutory Options'",
    boundedClaim: "The World Bank note presents four statutory approaches jurisdictions could consider to encourage private-sector creditor participation: a duty to cooperate, limits on recoveries, additional immunity from attachment, and retrofitting collective action mechanisms.",
    supportingExcerpt: "This note presents four statutory approaches that countries can consider adopting.",
    scopeConditions: ["Policy options and legal considerations as of 2022; applicability depends on jurisdiction and instrument."],
    prohibitedInferences: ["Do not represent the options as current universally applicable law.", "Do not represent them as existing Common Framework requirements."],
    publicUseStatus: "APPROVED_IF_LABELED_PROPOSAL",
    authorityTier: "POLICY_PROPOSAL",
    advisorTags: ["daniel"],
    topicTags: ["policy-proposal", "private-creditors", "holdouts", "statutory-options", "collective-action"],
    keywords: ["policy", "reform", "statutory", "statute", "private creditor participation", "holdout", "collective action", "immunity from attachment", "limit recoveries"],
  },
  {
    claimId: "CLAIM-IDOS-001",
    sourceId: "SRC-IDOS-2024",
    sourceTitle: "Input to the UN-DESA Elements Paper on Financing for Development — Action area: Debt and Debt Sustainability — Reforming the Global Debt Governance System: Exploring Effective and Feasible Policy Solutions",
    sourceClass: "POLICY_SYNTHESIS_AND_REFORM_PROPOSAL",
    pageReference: "PDF/report pp. 2-5, sections 2.1-2.2",
    boundedClaim: "The IDOS paper recommends reforms to the Common Framework and proposes a universal code of conduct for sovereign debtors and creditors, including transparency, participation, and governance measures.",
    supportingExcerpt: "We therefore propose the establishment of a universal code of conduct linked to the G20 Common Framework.",
    scopeConditions: ["The author's 2024 policy proposals; not an official Common Framework amendment."],
    prohibitedInferences: ["Do not treat recommendations as current binding G20 rules.", "Do not use them as evidence of how every restructuring currently operates."],
    publicUseStatus: "APPROVED_IF_LABELED_PROPOSAL",
    authorityTier: "POLICY_PROPOSAL",
    advisorTags: ["amara"],
    topicTags: ["policy-proposal", "debt-governance", "common-framework-reform", "code-of-conduct"],
    keywords: ["policy", "reform", "debt governance", "code of conduct", "common framework reform", "transparency reform", "governance proposal"],
  },
  {
    claimId: "CLAIM-CHASING-001",
    sourceId: "SRC-CHASING-CHINA-2025",
    sourceTitle: "Chasing China: Learning to Play by Beijing's Global Lending Rules",
    sourceClass: "EMPIRICAL_AND_CONTEXTUAL_RESEARCH_REPORT",
    pageReference: "PDF pp. 4-6 (Executive Summary) and PDF pp. 20-22 (Chapter 1, report pp. 7-9)",
    boundedClaim: "Chasing China presents broad evidence that China's overseas lending portfolio is large, globally distributed, and increasingly difficult to track in official sources over the study period.",
    supportingExcerpt: "more than 30,000 projects and activities across 217 countries and territories",
    scopeConditions: ["Use only for broad contextual framing unless a more precise report section is separately registered."],
    prohibitedInferences: ["Do not use broad portfolio claims to replace contract-specific HCL/HCC evidence for Financing Assurances."],
    publicUseStatus: "APPROVED_WITH_SCOPE",
    authorityTier: "EMPIRICAL_RESEARCH",
    advisorTags: ["amara"],
    topicTags: ["china-overseas-finance", "portfolio-context", "opacity", "transparency", "empirical-context"],
    keywords: ["chasing china", "overseas lending", "global lending", "portfolio scale", "opaque", "opacity", "track", "transparency", "30,000 projects"],
  },
] as const;

const POLICY_QUERY_TERMS = [
  "policy option",
  "policy proposal",
  "reform",
  "statutory",
  "statute",
  "legislation",
  "legislative",
  "change the law",
  "holdout",
  "collective action",
  "code of conduct",
  "debt governance",
  "private creditor participation",
];

const AUTHORITY_RANK: Record<ResearchAuthorityTier, number> = {
  OFFICIAL_G20_COMMON_FRAMEWORK: 2,
  ILLUSTRATIVE_TEMPLATE: 3,
  EMPIRICAL_RESEARCH: 4,
  POLICY_PROPOSAL: 5,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isExplicitPolicyQuestion(question: string): boolean {
  const normalized = normalize(question);
  return POLICY_QUERY_TERMS.some((term) => normalized.includes(normalize(term)));
}

export function researchBoundaryResponse(question: string): ResearchBoundaryResponse | null {
  const normalized = normalize(question);

  if (
    normalized.includes("progress debt treatments")
    || normalized.includes("progress docx")
    || normalized.includes("progress document")
    || normalized.includes("progress chronology")
  ) {
    return {
      kind: "SOURCE_GAP",
      answer: "That progress chronology is a source gap, not an approved research source. Its provenance and authoritative publisher have not been established, so I cannot use it to answer. I can instead explain the verified Common Framework process or the bounded findings in the approved sources.",
      claimIds: [],
    };
  }

  if (
    /\b(all|every)\b/.test(normalized)
    && normalized.includes("chinese")
    && normalized.includes("loan")
    && normalized.includes("collateral")
  ) {
    return {
      kind: "BOUNDED_ANSWER",
      answer: "No. The approved dataset identifies 620 collateralized public and publicly guaranteed loan commitments by Chinese state-owned creditors across 57 emerging-market and developing economies from 2000 to 2021. Its authors describe the reported share as a lower-bound estimate; it does not establish that every Chinese loan is collateralized.",
      claimIds: ["CLAIM-HCC-001"],
    };
  }

  if (
    (normalized.includes("mou") || normalized.includes("memorandum of understanding"))
    && normalized.includes("sign")
    && (normalized.includes("cash relief") || normalized.includes("create relief") || normalized.includes("implemented relief"))
  ) {
    return {
      kind: "BOUNDED_ANSWER",
      answer: "No. Under the official Common Framework baseline, an MoU records key treatment parameters and is legally non-binding. Participating creditors implement it through bilateral agreements, so signing the MoU does not itself create cash-effective relief.",
      claimIds: ["CLAIM-CF-005"],
    };
  }

  if (
    (normalized.includes("world bank") || normalized.includes("statutory option"))
    && (normalized.includes("current law") || normalized.includes("binding law") || normalized.includes("already law"))
  ) {
    return {
      kind: "BOUNDED_ANSWER",
      answer: "No. The World Bank note presents four statutory approaches that countries could consider adopting. They are policy options, not current universally applicable law and not existing Common Framework requirements.",
      claimIds: ["CLAIM-WB-001"],
    };
  }

  if (
    (normalized.includes("cot") || normalized.includes("comparability of treatment"))
    && (normalized.includes("one") || normalized.includes("single"))
    && (normalized.includes("haircut") || normalized.includes("formula"))
  ) {
    return {
      kind: "BOUNDED_ANSWER",
      answer: "No. Comparability of Treatment is assessed through changes in nominal debt service, debt stock in net-present-value terms, and duration. Official guidance allows flexibility across those indicators; it does not define one universal haircut formula.",
      claimIds: ["CLAIM-CF-004", "CLAIM-G20-003"],
    };
  }

  return null;
}

export function researchCardsForClaimIds(claimIds: readonly string[]): ResearchCard[] {
  const requested = new Set(claimIds);
  return RESEARCH_CARDS.filter((card) => requested.has(card.claimId));
}

export function retrieveResearchCards(question: string, advisorId: AdvisorId, limit = 4): ResearchCard[] {
  const normalized = normalize(question);
  if (!normalized) return [];
  const allowPolicy = isExplicitPolicyQuestion(question);

  return RESEARCH_CARDS
    .filter((card) => card.authorityTier !== "POLICY_PROPOSAL" || allowPolicy)
    .map((card) => {
      const keywordHits = card.keywords.filter((keyword) => normalized.includes(normalize(keyword))).length;
      const topicHits = card.topicTags.filter((topic) => normalized.includes(normalize(topic))).length;
      const advisorBoost = card.advisorTags.includes(advisorId) ? 1 : 0;
      return { card, score: keywordHits * 3 + topicHits * 2 + advisorBoost };
    })
    .filter(({ score }) => score > 1)
    .sort((left, right) =>
      right.score - left.score
      || AUTHORITY_RANK[left.card.authorityTier] - AUTHORITY_RANK[right.card.authorityTier]
      || left.card.claimId.localeCompare(right.card.claimId)
    )
    .slice(0, Math.max(0, limit))
    .map(({ card }) => card);
}

export function citationFor(card: ResearchCard): AdvisorCitation {
  return {
    claimId: card.claimId,
    sourceId: card.sourceId,
    sourceTitle: card.sourceTitle,
    pageReference: card.pageReference,
    sourceClass: card.sourceClass,
  };
}

export function citationsUsedByAnswer(answer: string, retrievedCards: readonly ResearchCard[]): AdvisorCitation[] {
  if (!retrievedCards.length) return [];
  const referencedIds = new Set(answer.match(/CLAIM-[A-Z0-9-]+/g) ?? []);
  const explicitlyUsedCards = retrievedCards.filter((card) => referencedIds.has(card.claimId));
  const usedCards = explicitlyUsedCards.length ? explicitlyUsedCards : retrievedCards;
  return usedCards.map(citationFor);
}

export function stripClaimMarkers(answer: string): string {
  return answer
    .replace(/\s*\[CLAIM-[A-Z0-9-]+\]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function researchPrompt(cards: readonly ResearchCard[]): string {
  if (!cards.length) return "No external research card matched this question. Do not introduce external research.";
  return cards.map((card) => `
[${card.claimId}]
source_id: ${card.sourceId}
source_title: ${card.sourceTitle}
source_class: ${card.sourceClass}
authority_tier: ${card.authorityTier}
page_reference: ${card.pageReference}
bounded_claim: ${card.boundedClaim}
supporting_excerpt: ${card.supportingExcerpt}
scope_conditions: ${card.scopeConditions.join(" | ")}
prohibited_inferences: ${card.prohibitedInferences.join(" | ")}
public_use_status: ${card.publicUseStatus}`).join("\n");
}
