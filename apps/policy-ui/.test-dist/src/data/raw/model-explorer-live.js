export const modelExplorerLiveRawMock = {
    workspaceId: 'model-explorer-live-2026q2',
    generatedAt: '2026-04-18T09:20:00+05:00',
    defaultModelId: 'qpm-uzbekistan',
    catalog: [
        {
            id: 'qpm-uzbekistan',
            name: 'QPM Uzbekistan',
            type: 'Semi-structural macro',
            frequency: 'Quarterly',
            status: 'active',
            summary: 'Semi-structural quarterly model used for policy-rate transmission and inflation path scenarios.',
        },
        {
            id: 'dfm-nowcast',
            name: 'DFM Nowcast',
            type: 'Dynamic factor nowcast',
            frequency: 'Monthly',
            status: 'active',
            summary: 'Dynamic-factor nowcast that combines high-frequency indicators to update current-quarter growth.',
        },
        {
            id: 'fpp-fiscal',
            name: 'FPP Fiscal Block',
            type: 'Fiscal projection block',
            frequency: 'Quarterly',
            status: 'staging',
            summary: 'Accounting-style fiscal projection block linking spending, revenue effort, and deficit dynamics.',
        },
    ],
    metadataByModelId: {
        'qpm-uzbekistan': {
            modelId: 'qpm-uzbekistan',
            overview: 'QPM Uzbekistan is the anchor policy model for medium-term inflation and output-gap trade-offs.',
            assumptions: [
                {
                    id: 'qpm-a1',
                    label: 'Neutral policy rate',
                    value: '13.0%',
                    rationale: 'Anchors medium-term inflation convergence under baseline expectations.',
                },
            ],
            equations: [
                {
                    id: 'qpm-e1',
                    title: 'Output gap dynamics',
                    expression: 'x_t = 0.7 * x_(t-1) - 0.2 * (r_t - r*) + eps_x_t',
                    explanation: 'Output gap narrows with restrictive real rate settings.',
                },
            ],
            caveats: [
                {
                    id: 'qpm-c1',
                    severity: 'warning',
                    message: 'Expectation channels are calibrated, not directly estimated on micro survey panels.',
                    implication: 'Forward-guidance shocks can be over- or under-sensitive in edge cases.',
                },
            ],
            dataSources: [
                {
                    id: 'qpm-d1',
                    name: 'Policy rate history',
                    provider: 'Central Bank internal',
                    frequency: 'Monthly',
                    vintage: '2026-04',
                    note: 'Mapped to quarterly frequency for model state updates.',
                },
            ],
        },
        'dfm-nowcast': {
            modelId: 'dfm-nowcast',
            overview: 'DFM Nowcast supports short-horizon monitoring by extracting latent activity factors from mixed-frequency data.',
            assumptions: [
                {
                    id: 'dfm-a1',
                    label: 'Indicator panel completeness threshold',
                    value: '75%',
                    rationale: 'Prevents nowcast updates from sparse publication windows.',
                },
            ],
            equations: [
                {
                    id: 'dfm-e1',
                    title: 'Latent factor transition',
                    expression: 'f_t = A * f_(t-1) + u_t',
                    explanation: 'Common factor evolves as autoregressive latent state.',
                },
            ],
            caveats: [
                {
                    id: 'dfm-c1',
                    severity: 'warning',
                    message: 'Signal quality weakens when survey indicators diverge from hard data.',
                    implication: 'Nowcast revisions may be larger around turning points.',
                },
            ],
            dataSources: [
                {
                    id: 'dfm-d1',
                    name: 'Industrial production index',
                    provider: 'Statistics Agency',
                    frequency: 'Monthly',
                    vintage: '2026-03',
                    note: 'Primary hard activity indicator.',
                },
            ],
        },
        'fpp-fiscal': {
            modelId: 'fpp-fiscal',
            overview: 'FPP Fiscal Block projects deficit and financing pressure under alternative spending and revenue assumptions.',
            assumptions: [
                {
                    id: 'fpp-a1',
                    label: 'Revenue elasticity to growth',
                    value: '1.1',
                    rationale: 'Converts real activity changes into tax intake dynamics.',
                },
            ],
            equations: [
                {
                    id: 'fpp-e1',
                    title: 'Fiscal balance identity',
                    expression: 'fb_t = rev_t - exp_t - int_t',
                    explanation: 'Balance is determined by revenues, primary expenditures, and interest costs.',
                },
            ],
            caveats: [
                {
                    id: 'fpp-c1',
                    severity: 'info',
                    message: 'Off-budget operations are represented through adjustment coefficients.',
                    implication: 'Detailed public-sector coverage still requires reconciliation tables.',
                },
            ],
            dataSources: [
                {
                    id: 'fpp-d1',
                    name: 'Treasury execution dataset',
                    provider: 'Ministry of Finance',
                    frequency: 'Monthly',
                    vintage: '2026-03',
                    note: 'Main fiscal-flow source.',
                },
            ],
        },
    },
};
