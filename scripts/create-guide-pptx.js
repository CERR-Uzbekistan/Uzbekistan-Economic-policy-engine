const pptxgen = require("pptxgenjs");
const pres = new pptxgen();

pres.layout = "LAYOUT_16x9";
pres.author = "Nozimmjon";
pres.title = "Git & GitHub Guide for CERR Team";

// === Design Tokens ===
const NAVY = "0D1F3C";
const NAVY2 = "1A3A6E";
const TEAL = "0D9488";
const GREEN = "16A34A";
const WHITE = "FFFFFF";
const LIGHT = "F1F5F9";
const GRAY = "64748B";
const DARK = "1E293B";
const ORANGE = "F59E0B";
const RED = "DC2626";

const TITLE_FONT = "Arial Black";
const BODY_FONT = "Calibri";
const CODE_FONT = "Consolas";

const makeShadow = () => ({ type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.12 });

// ============================================================
// SLIDE 1: Title
// ============================================================
let s1 = pres.addSlide();
s1.background = { color: NAVY };
// Accent bar top
s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s1.addText("Git & GitHub", { x: 0.8, y: 1.2, w: 8.4, h: 1.2, fontSize: 48, fontFace: TITLE_FONT, color: WHITE, bold: true, margin: 0 });
s1.addText("Guide for CERR Team", { x: 0.8, y: 2.3, w: 8.4, h: 0.8, fontSize: 32, fontFace: BODY_FONT, color: TEAL, margin: 0 });
s1.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 3.3, w: 1.5, h: 0.05, fill: { color: TEAL } });
s1.addText("Uzbekistan Economic Policy Engine", { x: 0.8, y: 3.6, w: 8.4, h: 0.5, fontSize: 16, fontFace: BODY_FONT, color: GRAY });
s1.addText("CERR-Uzbekistan  |  2026", { x: 0.8, y: 4.6, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY });

// ============================================================
// SLIDE 2: What is Git? What is GitHub?
// ============================================================
let s2 = pres.addSlide();
s2.background = { color: WHITE };
s2.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s2.addText("What is Git? What is GitHub?", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: NAVY, margin: 0 });

// Git card
s2.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 4.2, h: 3.5, fill: { color: LIGHT }, shadow: makeShadow() });
s2.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 4.2, h: 0.06, fill: { color: TEAL } });
s2.addText("Git", { x: 0.8, y: 1.5, w: 3.6, h: 0.5, fontSize: 24, fontFace: TITLE_FONT, color: TEAL, margin: 0 });
s2.addText("Version control on YOUR computer", { x: 0.8, y: 2.0, w: 3.6, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: DARK, bold: true, margin: 0 });
s2.addText([
  { text: "Like \"Ctrl+Z\" but for your entire project", options: { bullet: true, breakLine: true, fontSize: 13 } },
  { text: "Saves snapshots of your work (\"commits\")", options: { bullet: true, breakLine: true, fontSize: 13 } },
  { text: "You can go back to any previous version", options: { bullet: true, breakLine: true, fontSize: 13 } },
  { text: "Works offline on your laptop", options: { bullet: true, fontSize: 13 } }
], { x: 0.8, y: 2.5, w: 3.6, h: 2.0, fontFace: BODY_FONT, color: DARK, paraSpaceAfter: 6 });

// GitHub card
s2.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 1.3, w: 4.2, h: 3.5, fill: { color: LIGHT }, shadow: makeShadow() });
s2.addShape(pres.shapes.RECTANGLE, { x: 5.3, y: 1.3, w: 4.2, h: 0.06, fill: { color: NAVY2 } });
s2.addText("GitHub", { x: 5.6, y: 1.5, w: 3.6, h: 0.5, fontSize: 24, fontFace: TITLE_FONT, color: NAVY2, margin: 0 });
s2.addText("Shared cloud storage for code", { x: 5.6, y: 2.0, w: 3.6, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: DARK, bold: true, margin: 0 });
s2.addText([
  { text: "Like Google Drive but for code projects", options: { bullet: true, breakLine: true, fontSize: 13 } },
  { text: "Everyone on the team sees the same files", options: { bullet: true, breakLine: true, fontSize: 13 } },
  { text: "Tracks who changed what and when", options: { bullet: true, breakLine: true, fontSize: 13 } },
  { text: "Has tools for reviewing each other's work", options: { bullet: true, fontSize: 13 } }
], { x: 5.6, y: 2.5, w: 3.6, h: 2.0, fontFace: BODY_FONT, color: DARK, paraSpaceAfter: 6 });

// Analogy
s2.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 5.0, w: 9.0, h: 0.5, fill: { color: TEAL, transparency: 10 } });
s2.addText("Think of it like Google Docs: Git = version history, GitHub = the shared document", { x: 0.8, y: 5.0, w: 8.4, h: 0.5, fontSize: 13, fontFace: BODY_FONT, color: TEAL, italic: true, valign: "middle" });

// ============================================================
// SLIDE 3: One-Time Setup
// ============================================================
let s3 = pres.addSlide();
s3.background = { color: WHITE };
s3.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s3.addText("One-Time Setup", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s3.addText("Do this once on your computer, then you're ready forever.", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY, margin: 0 });

const steps = [
  { num: "1", title: "Install Git", desc: "Download from git-scm.com\nClick \"Next\" through the installer", color: TEAL },
  { num: "2", title: "Install GitHub CLI", desc: "Download from cli.github.com\nClick \"Next\" through the installer", color: NAVY2 },
  { num: "3", title: "Log in to GitHub", desc: "Open PowerShell, type:\ngh auth login\nFollow the prompts", color: GREEN },
];

steps.forEach((step, i) => {
  const y = 1.5 + i * 1.25;
  s3.addShape(pres.shapes.OVAL, { x: 0.8, y: y, w: 0.6, h: 0.6, fill: { color: step.color } });
  s3.addText(step.num, { x: 0.8, y: y, w: 0.6, h: 0.6, fontSize: 20, fontFace: TITLE_FONT, color: WHITE, align: "center", valign: "middle" });
  s3.addText(step.title, { x: 1.7, y: y - 0.05, w: 3, h: 0.35, fontSize: 18, fontFace: BODY_FONT, color: DARK, bold: true, margin: 0 });
  s3.addText(step.desc, { x: 1.7, y: y + 0.3, w: 7.5, h: 0.8, fontSize: 12, fontFace: CODE_FONT, color: GRAY, margin: 0 });
});

s3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 5.0, w: 9.0, h: 0.5, fill: { color: "FEF3C7" } });
s3.addText("After this, you never need to do these steps again!", { x: 0.8, y: 5.0, w: 8.4, h: 0.5, fontSize: 13, fontFace: BODY_FONT, color: ORANGE, bold: true, valign: "middle" });

// ============================================================
// SLIDE 4: The Team Workflow
// ============================================================
let s4 = pres.addSlide();
s4.background = { color: NAVY };
s4.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s4.addText("The Team Workflow", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: WHITE, margin: 0 });
s4.addText("Every change follows this path:", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY });

const flow = [
  { label: "Pull latest", desc: "Get the newest code", color: TEAL },
  { label: "Branch", desc: "Create your workspace", color: "2563EB" },
  { label: "Code", desc: "Make your changes", color: GREEN },
  { label: "Commit", desc: "Save a snapshot", color: ORANGE },
  { label: "Push", desc: "Upload to GitHub", color: "8B5CF6" },
  { label: "PR", desc: "Request a review", color: RED },
];

flow.forEach((step, i) => {
  const x = 0.3 + i * 1.6;
  const y = 2.2;
  s4.addShape(pres.shapes.RECTANGLE, { x: x, y: y, w: 1.35, h: 1.8, fill: { color: step.color }, shadow: makeShadow() });
  s4.addText(step.label, { x: x, y: y + 0.3, w: 1.35, h: 0.5, fontSize: 15, fontFace: TITLE_FONT, color: WHITE, align: "center", valign: "middle" });
  s4.addText(step.desc, { x: x, y: y + 0.9, w: 1.35, h: 0.5, fontSize: 11, fontFace: BODY_FONT, color: WHITE, align: "center", valign: "middle" });
  // Arrow between boxes
  if (i < flow.length - 1) {
    s4.addText(">", { x: x + 1.35, y: y + 0.3, w: 0.25, h: 0.5, fontSize: 20, fontFace: TITLE_FONT, color: GRAY, align: "center", valign: "middle" });
  }
});

s4.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.5, w: 9.0, h: 0.7, fill: { color: TEAL, transparency: 80 } });
s4.addText("After PR is reviewed by the Project Manager, it gets merged into the main code.", { x: 0.8, y: 4.5, w: 8.4, h: 0.7, fontSize: 13, fontFace: BODY_FONT, color: LIGHT, valign: "middle" });

// ============================================================
// SLIDE 5: First Time — Clone the Project
// ============================================================
let s5 = pres.addSlide();
s5.background = { color: WHITE };
s5.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s5.addText("Step 1: Clone the Project", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s5.addText("First time only — downloads the project to your computer", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY, margin: 0 });

s5.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 8.4, h: 1.2, fill: { color: DARK } });
s5.addText("git clone https://github.com/CERR-Uzbekistan/Uzbekistan-Economic-policy-engine.git", { x: 1.0, y: 1.7, w: 8.0, h: 0.4, fontSize: 13, fontFace: CODE_FONT, color: TEAL });
s5.addText("cd Uzbekistan-Economic-policy-engine", { x: 1.0, y: 2.2, w: 8.0, h: 0.4, fontSize: 13, fontFace: CODE_FONT, color: GREEN });

s5.addText([
  { text: "What this does:", options: { bold: true, breakLine: true, fontSize: 15 } },
  { text: "Downloads the entire project from GitHub to your computer.", options: { bullet: true, breakLine: true } },
  { text: "Creates a folder called \"Uzbekistan-Economic-policy-engine\".", options: { bullet: true, breakLine: true } },
  { text: "The second command moves you into that folder.", options: { bullet: true, breakLine: true } },
  { text: "You only do this ONCE. After that, the folder stays on your computer.", options: { bullet: true } }
], { x: 0.8, y: 3.2, w: 8.4, h: 2.2, fontSize: 13, fontFace: BODY_FONT, color: DARK, paraSpaceAfter: 6 });

// ============================================================
// SLIDE 6: Start of Day — Pull Latest
// ============================================================
let s6 = pres.addSlide();
s6.background = { color: WHITE };
s6.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s6.addText("Step 2: Pull Latest Code", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s6.addText("Do this EVERY TIME before you start working", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: RED, bold: true, margin: 0 });

s6.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 8.4, h: 0.7, fill: { color: DARK } });
s6.addText("git pull origin main", { x: 1.0, y: 1.7, w: 8.0, h: 0.5, fontSize: 16, fontFace: CODE_FONT, color: TEAL });

s6.addText([
  { text: "What this does:", options: { bold: true, breakLine: true, fontSize: 15 } },
  { text: "Downloads any changes your teammates made since you last worked.", options: { bullet: true, breakLine: true } },
  { text: "Keeps your copy of the project up to date.", options: { bullet: true, breakLine: true } },
  { text: "If you skip this, you might overwrite someone else's work!", options: { bullet: true } }
], { x: 0.8, y: 2.6, w: 8.4, h: 1.8, fontSize: 13, fontFace: BODY_FONT, color: DARK, paraSpaceAfter: 6 });

s6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.6, w: 9.0, h: 0.7, fill: { color: "FEE2E2" } });
s6.addText("Rule: Always pull before starting. Think of it as checking your email before you start the day.", { x: 0.8, y: 4.6, w: 8.4, h: 0.7, fontSize: 13, fontFace: BODY_FONT, color: RED, valign: "middle" });

// ============================================================
// SLIDE 7: Create Your Branch
// ============================================================
let s7 = pres.addSlide();
s7.background = { color: WHITE };
s7.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s7.addText("Step 3: Create Your Branch", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s7.addText("A branch is your own private workspace — your changes don't affect others until you're ready", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 13, fontFace: BODY_FONT, color: GRAY, margin: 0 });

s7.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 8.4, h: 0.7, fill: { color: DARK } });
s7.addText("git checkout -b feature/my-task-name", { x: 1.0, y: 1.7, w: 8.0, h: 0.5, fontSize: 16, fontFace: CODE_FONT, color: TEAL });

s7.addText("Branch naming rules:", { x: 0.8, y: 2.6, w: 8.4, h: 0.4, fontSize: 16, fontFace: BODY_FONT, color: DARK, bold: true, margin: 0 });

const branches = [
  { prefix: "feature/", desc: "New features or models", example: "feature/dsa-model", color: TEAL },
  { prefix: "fix/", desc: "Bug fixes", example: "fix/io-decimal-bug", color: RED },
  { prefix: "i18n/", desc: "Translation work", example: "i18n/pe-model-uzbek", color: ORANGE },
  { prefix: "docs/", desc: "Documentation", example: "docs/methodology-update", color: NAVY2 },
];

branches.forEach((b, i) => {
  const y = 3.1 + i * 0.55;
  s7.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: y, w: 1.2, h: 0.4, fill: { color: b.color } });
  s7.addText(b.prefix, { x: 0.8, y: y, w: 1.2, h: 0.4, fontSize: 12, fontFace: CODE_FONT, color: WHITE, align: "center", valign: "middle" });
  s7.addText(b.desc, { x: 2.2, y: y, w: 2.5, h: 0.4, fontSize: 12, fontFace: BODY_FONT, color: DARK, valign: "middle" });
  s7.addText(b.example, { x: 5.0, y: y, w: 4.2, h: 0.4, fontSize: 11, fontFace: CODE_FONT, color: GRAY, valign: "middle" });
});

// ============================================================
// SLIDE 8: Save Your Work (Commit)
// ============================================================
let s8 = pres.addSlide();
s8.background = { color: WHITE };
s8.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s8.addText("Step 4: Save Your Work", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s8.addText("After making changes, save a snapshot (\"commit\")", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY, margin: 0 });

s8.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.5, w: 8.4, h: 1.4, fill: { color: DARK } });
s8.addText("git add .", { x: 1.0, y: 1.6, w: 8.0, h: 0.4, fontSize: 15, fontFace: CODE_FONT, color: GREEN });
s8.addText("git commit -m \"Add PE model Russian translations\"", { x: 1.0, y: 2.1, w: 8.0, h: 0.4, fontSize: 15, fontFace: CODE_FONT, color: TEAL });

s8.addText([
  { text: "git add .", options: { bold: true, color: GREEN, fontFace: CODE_FONT } },
  { text: "  =  Stage all your changes (prepare them to be saved)", options: { breakLine: true } },
  { text: "", options: { breakLine: true, fontSize: 6 } },
  { text: "git commit -m \"message\"", options: { bold: true, color: TEAL, fontFace: CODE_FONT } },
  { text: "  =  Save a snapshot with a description", options: {} }
], { x: 0.8, y: 3.2, w: 8.4, h: 1.2, fontSize: 13, fontFace: BODY_FONT, color: DARK });

s8.addText("Good commit messages:", { x: 0.8, y: 4.3, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: DARK, bold: true, margin: 0 });
s8.addText([
  { text: "\"Add QPM impulse response horizon selector\"", options: { bullet: true, breakLine: true, color: GREEN } },
  { text: "\"Fix IO model decimal locale bug\"", options: { bullet: true, breakLine: true, color: GREEN } },
  { text: "\"Update PE model translations for Russian\"", options: { bullet: true, color: GREEN } }
], { x: 0.8, y: 4.6, w: 8.4, h: 1.0, fontSize: 12, fontFace: CODE_FONT, color: GREEN, paraSpaceAfter: 4 });

// ============================================================
// SLIDE 9: Push to GitHub
// ============================================================
let s9 = pres.addSlide();
s9.background = { color: WHITE };
s9.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s9.addText("Step 5: Push to GitHub", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s9.addText("Upload your saved work to GitHub so the team can see it", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY, margin: 0 });

s9.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: 8.4, h: 0.7, fill: { color: DARK } });
s9.addText("git push -u origin feature/my-task-name", { x: 1.0, y: 1.7, w: 8.0, h: 0.5, fontSize: 16, fontFace: CODE_FONT, color: TEAL });

s9.addText([
  { text: "What this does:", options: { bold: true, breakLine: true, fontSize: 15 } },
  { text: "Uploads your branch and commits to GitHub.", options: { bullet: true, breakLine: true } },
  { text: "Your code is now visible to the team, but NOT yet in the main project.", options: { bullet: true, breakLine: true } },
  { text: "Use -u the first time you push a new branch. After that, just git push.", options: { bullet: true } }
], { x: 0.8, y: 2.6, w: 8.4, h: 1.8, fontSize: 13, fontFace: BODY_FONT, color: DARK, paraSpaceAfter: 6 });

s9.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.6, w: 9.0, h: 0.7, fill: { color: LIGHT } });
s9.addText("After pushing, GitHub will show a link to create a Pull Request. Go to the next step!", { x: 0.8, y: 4.6, w: 8.4, h: 0.7, fontSize: 13, fontFace: BODY_FONT, color: TEAL, bold: true, valign: "middle" });

// ============================================================
// SLIDE 10: Open a Pull Request
// ============================================================
let s10 = pres.addSlide();
s10.background = { color: WHITE };
s10.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s10.addText("Step 6: Open a Pull Request (PR)", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 28, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s10.addText("A Pull Request asks the PM to review and approve your changes", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY, margin: 0 });

const prSteps = [
  { num: "1", text: "Go to the GitHub repo page in your browser" },
  { num: "2", text: "Click the green \"Compare & pull request\" button (appears after you push)" },
  { num: "3", text: "Fill in the title: what you did (e.g. \"Add PE model Russian translations\")" },
  { num: "4", text: "Fill in the checklist in the description (it auto-fills from our template)" },
  { num: "5", text: "Click \"Create pull request\"" },
  { num: "6", text: "Wait for @nozimmjon to review and merge" },
];

prSteps.forEach((step, i) => {
  const y = 1.5 + i * 0.6;
  s10.addShape(pres.shapes.OVAL, { x: 0.8, y: y + 0.05, w: 0.35, h: 0.35, fill: { color: TEAL } });
  s10.addText(step.num, { x: 0.8, y: y + 0.05, w: 0.35, h: 0.35, fontSize: 13, fontFace: TITLE_FONT, color: WHITE, align: "center", valign: "middle" });
  s10.addText(step.text, { x: 1.4, y: y, w: 8.0, h: 0.45, fontSize: 13, fontFace: BODY_FONT, color: DARK, valign: "middle", margin: 0 });
});

// ============================================================
// SLIDE 11: Finding and Claiming Issues
// ============================================================
let s11 = pres.addSlide();
s11.background = { color: WHITE };
s11.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s11.addText("Finding Your Tasks on GitHub", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 28, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s11.addText("All tasks are tracked as GitHub Issues. Here's how to find yours:", { x: 0.8, y: 0.9, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY, margin: 0 });

const issueSteps = [
  { num: "1", title: "Go to the Issues tab", desc: "github.com/CERR-Uzbekistan/Uzbekistan-Economic-policy-engine > Issues" },
  { num: "2", title: "Filter by label", desc: "Click \"Labels\" and pick your area (e.g. model:pe, i18n, phase:1)" },
  { num: "3", title: "Assign yourself", desc: "Open an issue > click \"Assignees\" on the right > select your name" },
  { num: "4", title: "Create a branch for it", desc: "Use the issue number in your branch: feature/issue-6-pe-i18n" },
  { num: "5", title: "Check off tasks as you go", desc: "Edit the issue and check the [ ] boxes when done" },
];

issueSteps.forEach((step, i) => {
  const y = 1.5 + i * 0.75;
  s11.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 0.45, h: 0.45, fill: { color: NAVY } });
  s11.addText(step.num, { x: 0.5, y: y, w: 0.45, h: 0.45, fontSize: 16, fontFace: TITLE_FONT, color: WHITE, align: "center", valign: "middle" });
  s11.addText(step.title, { x: 1.2, y: y - 0.02, w: 8.0, h: 0.3, fontSize: 14, fontFace: BODY_FONT, color: DARK, bold: true, margin: 0 });
  s11.addText(step.desc, { x: 1.2, y: y + 0.25, w: 8.0, h: 0.3, fontSize: 11, fontFace: BODY_FONT, color: GRAY, margin: 0 });
});

// ============================================================
// SLIDE 12: Golden Rules
// ============================================================
let s12 = pres.addSlide();
s12.background = { color: NAVY };
s12.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s12.addText("Golden Rules", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 30, fontFace: TITLE_FONT, color: WHITE, margin: 0 });

const rules = [
  { icon: "X", title: "Never push directly to main", desc: "Always use a branch and PR. Direct pushes can break the project for everyone.", color: RED },
  { icon: "!", title: "Pull before you start working", desc: "Always run git pull origin main before creating a new branch.", color: ORANGE },
  { icon: "1", title: "One branch per task", desc: "Don't mix multiple tasks in one branch. Keep it focused.", color: TEAL },
  { icon: "?", title: "Ask if you're unsure", desc: "It's better to ask than to accidentally break something. Message @nozimmjon.", color: "2563EB" },
];

rules.forEach((rule, i) => {
  const y = 1.2 + i * 1.05;
  s12.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 9.0, h: 0.85, fill: { color: rule.color, transparency: 85 } });
  s12.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 0.06, h: 0.85, fill: { color: rule.color } });
  s12.addText(rule.title, { x: 0.9, y: y + 0.05, w: 8.3, h: 0.35, fontSize: 16, fontFace: BODY_FONT, color: WHITE, bold: true, margin: 0 });
  s12.addText(rule.desc, { x: 0.9, y: y + 0.4, w: 8.3, h: 0.35, fontSize: 12, fontFace: BODY_FONT, color: GRAY, margin: 0 });
});

// ============================================================
// SLIDE 13: Quick Reference Card
// ============================================================
let s13 = pres.addSlide();
s13.background = { color: WHITE };
s13.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s13.addText("Quick Reference — Daily Commands", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 26, fontFace: TITLE_FONT, color: NAVY, margin: 0 });
s13.addText("Print this slide and keep it on your desk!", { x: 0.8, y: 0.85, w: 8.4, h: 0.3, fontSize: 13, fontFace: BODY_FONT, color: GRAY, italic: true, margin: 0 });

const cmds = [
  { cmd: "git pull origin main", what: "Get latest code from team", when: "Start of day" },
  { cmd: "git checkout -b feature/name", what: "Create your branch", when: "Before starting a task" },
  { cmd: "git add .", what: "Stage all changes", when: "After making changes" },
  { cmd: "git commit -m \"message\"", what: "Save a snapshot", when: "After staging" },
  { cmd: "git push -u origin feature/name", what: "Upload to GitHub", when: "When ready for review" },
  { cmd: "git checkout main", what: "Go back to main branch", when: "After PR is merged" },
  { cmd: "git pull origin main", what: "Get the merged changes", when: "Before next task" },
];

// Table header
s13.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3, w: 9.0, h: 0.45, fill: { color: NAVY } });
s13.addText("Command", { x: 0.6, y: 1.3, w: 3.8, h: 0.45, fontSize: 12, fontFace: BODY_FONT, color: WHITE, bold: true, valign: "middle" });
s13.addText("What it does", { x: 4.5, y: 1.3, w: 2.8, h: 0.45, fontSize: 12, fontFace: BODY_FONT, color: WHITE, bold: true, valign: "middle" });
s13.addText("When to use", { x: 7.4, y: 1.3, w: 2.0, h: 0.45, fontSize: 12, fontFace: BODY_FONT, color: WHITE, bold: true, valign: "middle" });

cmds.forEach((c, i) => {
  const y = 1.75 + i * 0.48;
  const bg = i % 2 === 0 ? LIGHT : WHITE;
  s13.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 9.0, h: 0.48, fill: { color: bg } });
  s13.addText(c.cmd, { x: 0.6, y: y, w: 3.8, h: 0.48, fontSize: 10, fontFace: CODE_FONT, color: TEAL, valign: "middle" });
  s13.addText(c.what, { x: 4.5, y: y, w: 2.8, h: 0.48, fontSize: 11, fontFace: BODY_FONT, color: DARK, valign: "middle" });
  s13.addText(c.when, { x: 7.4, y: y, w: 2.0, h: 0.48, fontSize: 11, fontFace: BODY_FONT, color: GRAY, valign: "middle" });
});

// ============================================================
// SLIDE 14: Common Mistakes
// ============================================================
let s14 = pres.addSlide();
s14.background = { color: WHITE };
s14.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s14.addText("Common Mistakes & Fixes", { x: 0.8, y: 0.3, w: 8.4, h: 0.7, fontSize: 28, fontFace: TITLE_FONT, color: NAVY, margin: 0 });

const mistakes = [
  { wrong: "I forgot to pull before starting", fix: "Run: git stash, then git pull origin main, then git stash pop" },
  { wrong: "I committed to main by accident", fix: "Don't panic! Ask @nozimmjon to help undo it" },
  { wrong: "Git says there's a \"merge conflict\"", fix: "Ask @nozimmjon — conflicts are normal, we'll walk through it together" },
  { wrong: "I don't know what branch I'm on", fix: "Run: git branch (the * marks your current branch)" },
  { wrong: "I made changes but forgot to commit", fix: "Run: git status to see what changed, then git add . and git commit" },
];

mistakes.forEach((m, i) => {
  const y = 1.2 + i * 0.85;
  // Problem
  s14.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 4.3, h: 0.7, fill: { color: "FEE2E2" } });
  s14.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: y, w: 0.06, h: 0.7, fill: { color: RED } });
  s14.addText(m.wrong, { x: 0.8, y: y, w: 3.8, h: 0.7, fontSize: 11, fontFace: BODY_FONT, color: RED, valign: "middle", margin: 0 });
  // Fix
  s14.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: y, w: 4.3, h: 0.7, fill: { color: "DCFCE7" } });
  s14.addShape(pres.shapes.RECTANGLE, { x: 5.2, y: y, w: 0.06, h: 0.7, fill: { color: GREEN } });
  s14.addText(m.fix, { x: 5.5, y: y, w: 3.8, h: 0.7, fontSize: 11, fontFace: BODY_FONT, color: GREEN, valign: "middle", margin: 0 });
});

// ============================================================
// SLIDE 15: Need Help?
// ============================================================
let s15 = pres.addSlide();
s15.background = { color: NAVY };
s15.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: TEAL } });
s15.addText("Need Help?", { x: 0.8, y: 1.0, w: 8.4, h: 0.8, fontSize: 40, fontFace: TITLE_FONT, color: WHITE, margin: 0 });
s15.addShape(pres.shapes.RECTANGLE, { x: 0.8, y: 1.9, w: 1.5, h: 0.05, fill: { color: TEAL } });

s15.addText("Project Manager", { x: 0.8, y: 2.3, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY_FONT, color: GRAY, margin: 0 });
s15.addText("@nozimmjon", { x: 0.8, y: 2.7, w: 8.4, h: 0.6, fontSize: 28, fontFace: TITLE_FONT, color: TEAL, margin: 0 });

s15.addText([
  { text: "GitHub:", options: { bold: true } },
  { text: "  github.com/CERR-Uzbekistan/Uzbekistan-Economic-policy-engine", options: {} }
], { x: 0.8, y: 3.6, w: 8.4, h: 0.4, fontSize: 13, fontFace: BODY_FONT, color: GRAY });

s15.addText([
  { text: "Remember:", options: { bold: true, breakLine: true, color: WHITE, fontSize: 16 } },
  { text: "", options: { breakLine: true, fontSize: 6 } },
  { text: "There are no stupid questions.", options: { breakLine: true, color: TEAL } },
  { text: "It's better to ask than to accidentally break something.", options: { breakLine: true, color: TEAL } },
  { text: "Everyone was a beginner once.", options: { color: TEAL } }
], { x: 0.8, y: 4.2, w: 8.4, h: 1.2, fontSize: 14, fontFace: BODY_FONT, color: TEAL });

// ============================================================
// SAVE
// ============================================================
const outputPath = process.argv[2] || "Git-GitHub-Guide-CERR-Team.pptx";
pres.writeFile({ fileName: outputPath }).then(() => {
  console.log("Created: " + outputPath);
}).catch(err => {
  console.error("Error:", err);
});
