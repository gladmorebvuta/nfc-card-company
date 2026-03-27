export const phasesData = [
  {
    id: "v1",
    version: "V1",
    title: "MVP (Core Tap & Share)",
    status: "in-progress",
    progress: 85,
    dueDate: "Q1 2026",
    owner: "Product Team",
    milestones: ["NFC Tag Encoding System", "Basic Profile UI", "QR Code Generation"],
    tasks: [
      { id: "t1", title: "Develop Profile Data Schema", status: "completed", owner: "Backend", estimate: "1w" },
      { id: "t2", title: "Implement NFC Read/Write React Native module", status: "in-progress", owner: "Mobile", estimate: "2w" },
      { id: "t3", title: "Design minimal web viewer", status: "completed", owner: "Design", estimate: "1w" },
      { id: "t4", title: "Configure standard VCard export", status: "pending", owner: "Backend", estimate: "3d" },
    ],
  },
  {
    id: "v2",
    version: "V2",
    title: "Engagement & Customization",
    status: "pending",
    progress: 20,
    dueDate: "Q2 2026",
    owner: "Growth Team",
    milestones: ["Social Link Integrations", "Custom Color Themes", "Basic Analytics"],
    tasks: [
      { id: "t5", title: "Oauth flows for major social platforms", status: "pending", owner: "Backend", estimate: "3w" },
      { id: "t6", title: "Theme Builder UI", status: "pending", owner: "Frontend", estimate: "2w" },
      { id: "t7", title: "Implement view tracking", status: "in-progress", owner: "Data", estimate: "1w" },
    ],
  },
  {
    id: "v3",
    version: "V3",
    title: "Pro Features & Enterprise",
    status: "pending",
    progress: 0,
    dueDate: "Q3 2026",
    owner: "B2B Team",
    milestones: ["Team Management", "Lead Capture Mode", "CRM Integrations (Salesforce, Hubspot)"],
    tasks: [
      { id: "t8", title: "Design Admin Dashboard", status: "pending", owner: "Design", estimate: "2w" },
      { id: "t9", title: "Build Form Builder for Lead Capture", status: "pending", owner: "Frontend", estimate: "3w" },
      { id: "t10", title: "Hubspot API Integration", status: "pending", owner: "Backend", estimate: "2w" },
    ],
  },
  {
    id: "v4",
    version: "V4",
    title: "Scale & Manage",
    status: "planned",
    progress: 0,
    dueDate: "Q4 2026",
    owner: "Platform Team",
    milestones: ["White-labeling", "Advanced Analytics Engine", "Physical Product Storefront"],
    tasks: [
      { id: "t11", title: "Multi-tenant architecture upgrade", status: "pending", owner: "Platform", estimate: "4w" },
      { id: "t12", title: "E-commerce integration for ordering cards", status: "pending", owner: "Fullstack", estimate: "4w" },
    ],
  },
];

export const endpointsData = [
  { method: "GET", path: "/api/v1/profile/:id", desc: "Fetch public profile data", auth: "None" },
  { method: "POST", path: "/api/v1/profile", desc: "Create or update user profile", auth: "Bearer Token" },
  { method: "GET", path: "/api/v1/nfc/encode", desc: "Get payload for physical card encoding", auth: "Admin Token" },
  { method: "POST", path: "/api/v1/analytics/view", desc: "Record a profile view event", auth: "None (Rate Limited)" },
  { method: "GET", path: "/api/v1/connections", desc: "List saved contacts (Pro)", auth: "Bearer Token" },
];

export const questionsData = [
  {
    id: "q1",
    question: "Do we require users to download an app to view a profile after tapping?",
    impact: "High",
    status: "unresolved",
    context: "AppStore review guidelines might block 'app-required' models. Web-first is safer but limits native features."
  },
  {
    id: "q2",
    question: "How are we handling lead capture data privacy (GDPR)?",
    impact: "Critical",
    status: "investigating",
    context: "We need explicit consent checkboxes before pushing data to CRM integrations."
  },
  {
    id: "q3",
    question: "Which manufacturer are we using for the initial batch of physical NFC cards?",
    impact: "Medium",
    status: "resolved",
    context: "Selected vendor A. Lead time is 3 weeks, we need to finalize artwork by Friday."
  }
];

export const statsData = {
  totalTasks: 24,
  completedTasks: 8,
  activeBlockers: 2,
  sprintVelocity: "14 pts/wk",
};
