# Frontend Replatform Component Inventory (MVP)

## Core Design Tokens (Foundation)

- Color tokens (surface, text, semantic states)
- Typography scale tokens
- Spacing scale tokens
- Border radius/shadow tokens
- Chart semantic color tokens (baseline, alternative, downside, upside, uncertainty)

## Layout Primitives

- `AppShell`
- `PageContainer`
- `PageHeader`
- `Section`
- `Panel`
- `SplitLayout` (2/3 column responsive shells)

## Data and Insight Components

- `KPICard`
- `ChartCard`
- `DeltaTable`
- `RiskCard`
- `NarrativePanel`
- `CaveatBox`
- `ModelAttributionBadge`
- `StatusBadge`
- `ScenarioTag`

## Scenario Workflow Components

- `AssumptionControl`
- `AssumptionGroup`
- `PresetSelector`
- `ScenarioSaveDialog`
- `ScenarioSelector`
- `ComparisonToggle` (level/delta/risk)

## System and Utility Components

- `SectionHeader`
- `SearchInput`
- `LanguageSwitcher`
- `LoadingState`
- `EmptyState`
- `ErrorState`
- `LastUpdatedMeta`

## MVP Component Acceptance Rules

- Reusable by at least two pages or one cross-cutting workflow.
- No page-specific one-off styling unless promoted to tokenized variant.
- Supports accessibility baseline (keyboard, labels, contrast).
- Supports i18n text expansion without layout breakage.

## Deferred Components (Post-MVP)

- Collaboration comments and annotations
- Scenario recommendation widgets
- Advanced explainability visualizers
- Rich document editor blocks
