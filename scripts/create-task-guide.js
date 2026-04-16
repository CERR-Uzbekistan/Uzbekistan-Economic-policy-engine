const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require("docx");
const fs = require("fs");

// === Colors ===
const NAVY = "0D1F3C";
const TEAL = "0D9488";
const GREEN = "16A34A";
const RED = "DC2626";
const ORANGE = "F59E0B";
const GRAY = "64748B";
const LIGHT = "F1F5F9";
const WHITE = "FFFFFF";

// === Helpers ===
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "CBD5E1" };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function heading1(text) {
  return new Paragraph({
    spacing: { before: 360, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: NAVY })],
  });
}

function heading2(text, issueNum) {
  const children = [];
  if (issueNum) {
    children.push(new TextRun({ text: `#${issueNum}  `, font: "Arial", size: 26, bold: true, color: TEAL }));
  }
  children.push(new TextRun({ text, font: "Arial", size: 26, bold: true, color: NAVY }));
  return new Paragraph({ spacing: { before: 300, after: 120 }, children });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: opts.color || "334155", bold: opts.bold, italic: opts.italic })],
  });
}

function labelValue(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label + ": ", font: "Arial", size: 22, bold: true, color: TEAL }),
      new TextRun({ text: value, font: "Arial", size: 22, color: "334155" }),
    ],
  });
}

function bulletItem(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "334155" })],
  });
}

function numberedItem(text, ref) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: "334155" })],
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Consolas", size: 20, color: TEAL })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 40 }, children: [] });
}

function phaseHeader(title, subtitle, color) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({
      children: [new TableCell({
        borders: noBorders,
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        width: { size: 9360, type: WidthType.DXA },
        children: [
          new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: title, font: "Arial", size: 28, bold: true, color: WHITE })] }),
          new Paragraph({ children: [new TextRun({ text: subtitle, font: "Arial", size: 20, color: WHITE, italic: true })] }),
        ],
      })],
    })],
  });
}

function issueBlock(num, title, fields) {
  const children = [heading2(title, num)];
  if (fields.what) children.push(labelValue("What", fields.what));
  if (fields.why) children.push(labelValue("Why", fields.why));
  if (fields.files) children.push(labelValue("Files", fields.files));
  if (fields.note) children.push(labelValue("Note", fields.note));
  if (fields.reference) children.push(labelValue("Reference", fields.reference));
  if (fields.example) {
    children.push(spacer());
    children.push(bodyText("Example:", { bold: true }));
    children.push(codeBlock(fields.example));
  }
  if (fields.steps) {
    children.push(spacer());
    children.push(bodyText("Steps:", { bold: true }));
    const ref = `steps${num}`;
    fields.steps.forEach(s => children.push(numberedItem(s, ref)));
  }
  children.push(spacer());
  return children;
}

// === Build Document ===
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ...([3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].map(n => ({
        reference: `steps${n}`,
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }))),
      { reference: "gitsteps",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: TEAL, space: 4 } },
          spacing: { after: 0 },
          children: [
            new TextRun({ text: "CERR-Uzbekistan", font: "Arial", size: 18, color: TEAL, bold: true }),
            new TextRun({ text: "  |  Task Reference Guide  |  Confidential", font: "Arial", size: 18, color: GRAY }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Page ", font: "Arial", size: 18, color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: GRAY }),
          ],
        })],
      }),
    },
    children: [
      // === TITLE PAGE ===
      new Paragraph({ spacing: { before: 2400 }, children: [] }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: "Uzbekistan Economic Policy Engine", font: "Arial", size: 44, bold: true, color: NAVY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: "Task Reference Guide", font: "Arial", size: 36, color: TEAL })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 8 } },
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: "20 GitHub Issues  |  4 Phases  |  Step-by-Step Instructions", font: "Arial", size: 22, color: GRAY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: "CERR-Uzbekistan  |  April 2026", font: "Arial", size: 22, color: GRAY })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: "Project Manager: @nozimmjon", font: "Arial", size: 24, bold: true, color: TEAL })],
      }),

      // === OVERVIEW TABLE ===
      new Paragraph({ children: [new PageBreak()] }),
      heading1("Overview"),
      bodyText("This document explains every task in our project backlog. Tasks are organized into 4 phases by priority. Each task includes what to do, why it matters, which files to edit, and step-by-step instructions."),
      spacer(),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2000, 1400, 3460, 2500],
        rows: [
          new TableRow({
            children: ["Phase", "Issues", "Focus", "Priority"].map(h =>
              new TableCell({
                borders,
                shading: { fill: NAVY, type: ShadingType.CLEAR },
                margins: cellMargins,
                width: { size: h === "Focus" ? 3460 : h === "Priority" ? 2500 : h === "Issues" ? 1400 : 2000, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun({ text: h, font: "Arial", size: 20, bold: true, color: WHITE })] })],
              })
            ),
          }),
          ...[
            ["Phase 1", "#3 \u2013 #10", "Accessibility, validation, i18n, mobile", "Do First (High)"],
            ["Phase 2", "#11 \u2013 #14", "Scenario comparison, cross-model links", "Do Next (Medium)"],
            ["Phase 3", "#15 \u2013 #17", "AI advisor, natural language, narratives", "After Phase 2"],
            ["Phase 4", "#18 \u2013 #21", "Accounts, new models, API, backend", "Future (Low)"],
          ].map((row, i) =>
            new TableRow({
              children: row.map((cell, j) =>
                new TableCell({
                  borders,
                  shading: { fill: i % 2 === 0 ? LIGHT : WHITE, type: ShadingType.CLEAR },
                  margins: cellMargins,
                  width: { size: j === 2 ? 3460 : j === 3 ? 2500 : j === 1 ? 1400 : 2000, type: WidthType.DXA },
                  children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Arial", size: 20, color: "334155", bold: j === 0 })] })],
                })
              ),
            })
          ),
        ],
      }),

      // ============================================================
      // PHASE 1
      // ============================================================
      new Paragraph({ children: [new PageBreak()] }),
      phaseHeader("Phase 1: Foundation Hardening", "8 tasks  |  Priority: Do First  |  Issues #3\u2013#10", "B91C1C"),
      spacer(),

      ...issueBlock(3, "Add ARIA Labels to All Interactive Elements", {
        what: "Add aria-label=\"descriptive text\" to every button, input, slider, and dropdown across all models and the hub page.",
        why: "Screen readers cannot describe unlabeled controls. This is a basic accessibility requirement (WCAG 2.1 AA).",
        files: "index.html, qpm_uzbekistan/index.html, dfm_nowcast/index.html, pe_model/index.html, io_model/index.html, cge_model/index.html, fpp_model/index.html",
        example: 'Before: <button onclick="run()">Run</button>\nAfter:  <button onclick="run()" aria-label="Run simulation">Run</button>',
        steps: [
          "Open each model's index.html file in a code editor (VS Code recommended).",
          "Search for <button, <input, <select, and <a tags.",
          "For each one, add aria-label=\"description\" where 'description' explains what the control does.",
          "Test: In Chrome, press F12, go to Accessibility tab, check that each control has a label.",
        ],
      }),

      ...issueBlock(4, "Add Role Attributes and Keyboard Navigation", {
        what: "Add role attributes to custom UI controls and ensure all controls can be operated with keyboard only (Tab, Enter, Arrow keys). Increase slider touch targets to 44px.",
        why: "Users who cannot use a mouse (keyboard-only users, assistive technology users) cannot operate the platform without proper roles and keyboard support.",
        files: "All 6 model index.html files",
        steps: [
          "Find custom controls (divs acting as buttons, custom sliders) and add role=\"button\" or role=\"slider\".",
          "Add tabindex=\"0\" to custom controls so they can receive keyboard focus.",
          "Add keydown event listeners: Enter/Space should activate buttons, Arrow keys should adjust sliders.",
          "In CSS, change slider thumb size to min-height: 44px; min-width: 44px for touch accessibility.",
          "Test: Try navigating each page using only the Tab and Enter keys.",
        ],
      }),

      ...issueBlock(5, "Add Input Validation and Error Handling", {
        what: "Add checks so that invalid inputs show helpful error messages instead of crashing or producing nonsense results.",
        why: "Users entering impossible values (like negative GDP or 500% tariffs) get broken charts or silent failures. Errors should be clear and friendly.",
        files: "All model index.html files + shared/toast.js",
        steps: [
          "In FPP model: Find the calculation function. Add a check: if GDP growth < -50%, show error.",
          "In PE model: Before running simulation, check that tariff values are between 0 and 100%.",
          "In CGE model: Before division operations, check that the denominator is not zero.",
          "Replace all alert() calls with Toast.show('message', 'error') for user-friendly notifications.",
          "Replace all console.log error messages with Toast.show() so users see them.",
          "Test: Enter obviously wrong values and verify you get a helpful error message, not a crash.",
        ],
      }),

      ...issueBlock(6, "Complete i18n for PE Model (RU/UZ)", {
        what: "Translate all English text in the Partial Equilibrium model to Russian and Uzbek, matching the hub page's 3-language system.",
        why: "The main page supports 3 languages, but clicking into the PE model switches to English-only. This breaks the user experience for Russian and Uzbek speakers.",
        files: "pe_model/index.html",
        reference: "Study how index.html (hub page) implements translations using the LANGS object and setLang() function.",
        steps: [
          "Open pe_model/index.html and list every piece of English text visible to users.",
          "Create a LANGS object with keys for en, ru, uz (copy the pattern from the hub page).",
          "Add data-i18n=\"key_name\" attributes to each text element in the HTML.",
          "Write translations for all keys in Russian and Uzbek (get help from team linguists).",
          "Create a setLang() function that updates all data-i18n elements when language changes.",
          "Connect the language switcher buttons to call setLang().",
          "Test all 3 languages: verify every label, chart title, button, and message switches correctly.",
        ],
      }),

      ...issueBlock(7, "Complete i18n for IO Model (RU/UZ)", {
        what: "Translate all English text in the Input-Output model, including all 136 sector names.",
        why: "Same as #6. The 136 sector names are the biggest translation task in the project.",
        files: "io_model/index.html",
        steps: [
          "Follow the same pattern as Issue #6.",
          "For the 136 sector names: use the Statistics Agency of Uzbekistan's official sector classifications in Russian and Uzbek.",
          "Translate table headers, search placeholders, chart labels, badge text, and KPI labels.",
          "Test: switch languages and verify the sector table, charts, and all labels update correctly.",
        ],
      }),

      ...issueBlock(8, "Complete i18n for CGE Model (RU/UZ)", {
        what: "Translate all English text in the CGE 1-2-3 model including controls, charts, 3 scenario presets, calibration table, and documentation tab.",
        why: "Same as #6. The CGE model has more UI sections than other models (scenarios, calibration, docs tab).",
        files: "cge_model/index.html",
        steps: [
          "Follow the same pattern as Issue #6.",
          "Include translations for the 3 preset scenario names and their descriptions.",
          "Translate the calibration parameter table headers and parameter names.",
          "Translate the documentation tab content.",
          "Test all 3 languages across all tabs (Simulation, Calibration, Documentation).",
        ],
      }),

      ...issueBlock(9, "Externalize Hardcoded English in Chart Configs", {
        what: "Find all English strings inside Chart.js configuration objects (chart titles, axis labels, legend text) and make them switch with the language selector.",
        why: "Even after translating the HTML, chart labels remain in English because they are hardcoded in JavaScript objects. Users see a half-translated page.",
        files: "All 6 model index.html files",
        steps: [
          "In each model file, search for Chart.js config objects (look for 'new Chart(' or 'title:', 'label:', 'text:').",
          "Find every hardcoded English string in these configs.",
          "Replace each with a variable that reads from the current language (e.g., LANGS[currentLang].chart_title_gdp).",
          "Add a function that re-renders charts when language changes.",
          "Test: switch language and verify chart titles, axis labels, and legends all translate.",
        ],
      }),

      ...issueBlock(10, "Mobile Responsive Polish", {
        what: "Make data tables scrollable on mobile, increase touch target sizes, and test the entire platform at phone width (375px).",
        why: "Many policymakers and students will access the platform from phones or tablets. Currently, tables overflow and controls are too small to tap.",
        files: "All model index.html files + index.html",
        steps: [
          "Wrap every data table in a <div style=\"overflow-x: auto\"> so it scrolls horizontally on small screens.",
          "In CSS, set all slider thumbs and buttons to minimum 44px height/width.",
          "Open Chrome DevTools (F12), click the device toggle icon, and test at 375px width (iPhone SE).",
          "Fix any content that overflows the screen, overlaps, or is unreadable at mobile size.",
          "Test the sidebar: it should be closeable on mobile (add a close button or swipe gesture).",
        ],
      }),

      // ============================================================
      // PHASE 2
      // ============================================================
      new Paragraph({ children: [new PageBreak()] }),
      phaseHeader("Phase 2: Scenario Engine & Integration", "4 tasks  |  Priority: Do Next  |  Issues #11\u2013#14", "D97706"),
      spacer(),

      ...issueBlock(11, "Build Scenario Comparison Dashboard", {
        what: "Build a user interface where users can save simulation results, give them names and tags, and compare 2-4 scenarios side by side with charts and difference tables.",
        why: "This is the core value proposition for policymakers. They need to compare 'What if we lower tariffs?' vs 'What if we raise them?' in one view.",
        files: "shared/scenario-engine.js (already has save/load/compare logic) + new UI in index.html",
        steps: [
          "Review shared/scenario-engine.js to understand existing save(), list(), compare() functions.",
          "Design a 'Saved Scenarios' panel in the hub page sidebar or as a new view.",
          "Add a 'Save Scenario' button to each model that captures current parameters + results.",
          "Build comparison view: select 2-4 scenarios, show charts overlaid and a delta table.",
          "Add 'Export Comparison as PDF' using shared/report-engine.js.",
          "Add the 5 preset scenarios from scenario-engine.js as starting templates.",
        ],
      }),

      ...issueBlock(12, "Implement Cross-Model Data Linkages", {
        what: "Connect the output of one model to the input of another. For example, the DFM nowcast GDP estimate should automatically feed into QPM as an initial condition.",
        why: "Currently the 6 models are isolated. Linking them creates a coherent policy analysis workflow where insights flow between models.",
        files: "shared/ (create new data-bus module) + all model index.html files",
        steps: [
          "Design a shared data bus (a JavaScript object in localStorage or window scope) for passing results between models.",
          "Start with 2 pairs: DFM nowcast GDP \u2192 QPM initial GDP, and PE tariff effects \u2192 CGE import prices.",
          "When a model finishes a simulation, store key outputs to the shared bus.",
          "When another model loads, check the bus for available upstream data and pre-fill inputs.",
          "Create a visual 'model flow' diagram in the hub showing which models feed which.",
        ],
      }),

      ...issueBlock(13, "Uncertainty Quantification (Fan Charts, Monte Carlo)", {
        what: "Add confidence bands (shaded 'fan' areas) around forecast lines showing 70% and 90% probability ranges, plus sensitivity tornado diagrams.",
        why: "A single forecast line is misleading. Policymakers need to see how uncertain the projection is to make informed decisions.",
        files: "qpm_uzbekistan/index.html, fpp_model/index.html (extend from DFM)",
        note: "Fan charts already work in the DFM nowcast (added in PR #1). Replicate that approach for QPM and FPP.",
        steps: [
          "Study the fan chart implementation in dfm_nowcast/index.html (search for 'fan' or 'confidence').",
          "Replicate the Chart.js fill-between technique for QPM impulse response charts.",
          "Add Monte Carlo option for QPM: run simulation 1000 times with small random parameter changes, plot the distribution.",
          "Build a tornado diagram showing which parameters have the biggest impact on results.",
        ],
      }),

      ...issueBlock(14, "Live Data Pipeline (World Bank, IMF, CBU APIs)", {
        what: "Build a module that automatically fetches the latest economic data from international APIs so the platform always has fresh numbers.",
        why: "Currently, data is manually updated by editing JS files. Automation keeps the platform current and reduces maintenance work.",
        files: "Create new shared/data-pipeline.js",
        steps: [
          "Research World Bank API (api.worldbank.org/v2/country/UZB/indicator/) for GDP, inflation, trade data.",
          "Research IMF WEO API for forecast data.",
          "Research Central Bank of Uzbekistan API for policy rate and monetary data.",
          "Write fetch() functions for each API with error handling.",
          "Cache results in localStorage with timestamps.",
          "Add a 'Last updated: X days ago' indicator to the hub page.",
          "Add a 'Refresh Data' button that re-fetches from all APIs.",
        ],
      }),

      // ============================================================
      // PHASE 3
      // ============================================================
      new Paragraph({ children: [new PageBreak()] }),
      phaseHeader("Phase 3: AI Integration", "3 tasks  |  Priority: After Phase 2  |  Issues #15\u2013#17", "0D9488"),
      spacer(),

      ...issueBlock(15, "AI Policy Advisor: Post-Simulation Briefs", {
        what: "After any simulation run, generate a plain-language policy brief explaining what the numbers mean, what risks exist, and what actions to consider.",
        why: "Not all users can interpret charts and tables. AI-generated explanations make the platform accessible to non-technical decision-makers.",
        files: "shared/ai-advisor.js + all model index.html files",
        note: "The foundation already exists in ai-advisor.js with a template-based fallback when no API key is configured.",
        steps: [
          "Review shared/ai-advisor.js to understand the current analyzeSim() function.",
          "Improve the prompt templates for each model with more Uzbekistan-specific context.",
          "Add a 'Get AI Analysis' button to each model's results panel.",
          "Ensure it works in all 3 languages (EN/RU/UZ).",
          "Test with API key configured (Claude/OpenAI) AND without (template fallback).",
        ],
      }),

      ...issueBlock(16, "Natural Language Scenario Builder", {
        what: "Let users describe scenarios in plain text (e.g., 'What happens if oil drops to $50 and remittances fall 20%?') and have AI translate this into model parameters and run the simulation automatically.",
        why: "Makes the platform usable by anyone, even those unfamiliar with the model parameters. Policymakers think in terms of events, not variables.",
        files: "New module + new UI text input component",
        steps: [
          "Build a text input box in the hub page or as a floating panel.",
          "When the user submits text, send it to the AI advisor with a prompt that maps natural language to model parameters.",
          "Parse the AI response to extract parameter values.",
          "Auto-select the appropriate model and set the parameters.",
          "Run the simulation and show results.",
          "Allow follow-up questions ('What if we also raise interest rates?').",
        ],
      }),

      ...issueBlock(17, "Automated DFM Nowcast Narratives", {
        what: "After the DFM model runs, automatically generate a written monthly economic briefing in plain language.",
        why: "Saves analysts hours of report writing. The model already has all the data; it just needs to be translated into words.",
        files: "dfm_nowcast/index.html + shared/ai-advisor.js",
        steps: [
          "After DFM runs, collect the key results: GDP nowcast, top contributing indicators, changes from last month.",
          "Pass these to the AI advisor with a narrative template.",
          "Display the generated briefing below the DFM results.",
          "Add anomaly detection: flag any indicator that moved more than 2 standard deviations.",
          "Support EN/RU/UZ output.",
        ],
      }),

      // ============================================================
      // PHASE 4
      // ============================================================
      new Paragraph({ children: [new PageBreak()] }),
      phaseHeader("Phase 4: Platform & Scale", "4 tasks  |  Priority: Future  |  Issues #18\u2013#21", "6D28D9"),
      spacer(),

      bodyText("Phase 4 tasks require a backend server and are planned for later. For now, understand the vision and plan the architecture.", { italic: true }),
      spacer(),

      ...issueBlock(18, "User Accounts and Collaboration", {
        what: "Add login functionality, user roles (viewer vs analyst), shared scenario libraries, commenting, and an audit trail of who changed what.",
        why: "Institutional adoption requires team collaboration features. Multiple analysts need to work together on policy scenarios.",
        note: "Requires the backend from Issue #21 first. Plan the architecture now, implement after the backend exists.",
        steps: [
          "Design the user role system: viewer (read-only), analyst (full access), admin (manage users).",
          "Plan the database schema for users, sessions, shared scenarios, and comments.",
          "Design the authentication flow (OAuth2 or institutional SSO).",
          "Implementation happens after Issue #21 (backend migration).",
        ],
      }),

      ...issueBlock(19, "New Models: DSA, BVAR, Agent-Based, Climate-Macro, Labor", {
        what: "Add 5 new economic models to expand the platform's analytical coverage.",
        why: "More models means more policy questions can be answered. Each model addresses a different aspect of the economy.",
        note: "Each model needs R/Python economic research first, then JavaScript implementation for the web interface. Economists should lead the model design.",
        steps: [
          "Debt Sustainability Analysis (DSA): Implement the IMF DSA framework with stress tests.",
          "BVAR Forecasting: Bayesian VAR with Minnesota/Litterman priors for macroeconomic forecasting.",
          "Agent-Based Model: Simulate heterogeneous firms and households for distributional analysis.",
          "Climate-Macro Module: Model carbon pricing and green transition costs.",
          "Labor Market Model: Unemployment dynamics, wage formation, and migration effects.",
        ],
      }),

      ...issueBlock(20, "REST API and SDK", {
        what: "Build a programmatic API so researchers can access model outputs from R, Python, or Excel without using the web interface.",
        why: "Researchers and analysts often work in R or Python. An API lets them pull simulation results directly into their analysis pipelines.",
        note: "Requires the backend from Issue #21 first.",
        steps: [
          "Design API endpoints: POST /simulate/{model}, GET /scenarios, GET /data/{indicator}.",
          "Build an R package and Python SDK that wraps the API.",
          "Create embeddable chart widgets (iframes) for reports and presentations.",
          "Design an Excel add-in for pulling results into spreadsheets.",
        ],
      }),

      ...issueBlock(21, "Backend Migration (Node.js/FastAPI + PostgreSQL)", {
        what: "Move the platform from static HTML files to a proper server application with a database.",
        why: "User accounts, the API, real-time collaboration, and persistent scenario storage all require a backend server and database.",
        note: "This is the biggest architectural change in the project. Plan very carefully before starting.",
        steps: [
          "Choose framework: Node.js (Express/Fastify) or Python (FastAPI). Discuss with team.",
          "Set up PostgreSQL database for scenarios, users, and data.",
          "Migrate localStorage scenario storage to database.",
          "Add OAuth2 authentication.",
          "Deploy to CDN + server infrastructure.",
          "Set up monitoring and usage analytics.",
        ],
      }),

      // ============================================================
      // GIT WORKFLOW
      // ============================================================
      new Paragraph({ children: [new PageBreak()] }),
      heading1("How to Start Working on a Task"),
      bodyText("Follow these steps every time you pick up a new task from the Issues board."),
      spacer(),

      numberedItem("Open PowerShell and navigate to the project folder:", "gitsteps"),
      codeBlock("cd C:\\Users\\YourName\\Desktop\\Uzbekistan-Economic-policy-engine"),
      spacer(),

      numberedItem("Pull the latest code (always do this first!):", "gitsteps"),
      codeBlock("git pull origin main"),
      spacer(),

      numberedItem("Create a new branch for your task:", "gitsteps"),
      codeBlock("git checkout -b feature/issue-6-pe-i18n"),
      spacer(),

      numberedItem("Make your changes in the code editor (VS Code recommended).", "gitsteps"),
      spacer(),

      numberedItem("Save your work with a commit:", "gitsteps"),
      codeBlock("git add ."),
      codeBlock("git commit -m \"Add PE model Russian translations\""),
      spacer(),

      numberedItem("Push your branch to GitHub:", "gitsteps"),
      codeBlock("git push -u origin feature/issue-6-pe-i18n"),
      spacer(),

      numberedItem("Open a Pull Request on GitHub (the link appears after pushing). Fill in the template and wait for review from @nozimmjon.", "gitsteps"),
      spacer(),

      // Contact
      spacer(),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({
          children: [new TableCell({
            borders: noBorders,
            shading: { fill: "F0FDFA", type: ShadingType.CLEAR },
            margins: { top: 200, bottom: 200, left: 300, right: 300 },
            width: { size: 9360, type: WidthType.DXA },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Questions? Need Help?", font: "Arial", size: 28, bold: true, color: NAVY })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Contact Project Manager: @nozimmjon", font: "Arial", size: 24, color: TEAL, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "There are no stupid questions. Ask before you break something!", font: "Arial", size: 20, color: GRAY, italic: true })] }),
            ],
          })],
        })],
      }),
    ],
  }],
});

// === Save ===
const outputPath = process.argv[2] || "CERR-Task-Guide.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Created: " + outputPath + " (" + (buffer.length / 1024).toFixed(0) + " KB)");
}).catch(err => console.error("Error:", err));
