function toIsoOrFallback(value, fallback) {
    if (!value) {
        return fallback;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}
function toModelStatus(value) {
    if (value === 'active' || value === 'staging' || value === 'paused') {
        return value;
    }
    return 'staging';
}
function toCaveatSeverity(value) {
    if (value === 'info' || value === 'warning' || value === 'critical') {
        return value;
    }
    return 'warning';
}
export function toModelExplorerWorkspace(raw) {
    const fallbackGeneratedAt = new Date().toISOString();
    const generatedAt = toIsoOrFallback(raw.generatedAt, fallbackGeneratedAt);
    const catalog = raw.catalog ?? [];
    const models = catalog.map((entry, index) => ({
        model_id: entry.id ?? `model-${index + 1}`,
        model_name: entry.name ?? `Model ${index + 1}`,
        model_type: entry.type ?? 'Unknown type',
        frequency: entry.frequency ?? 'Not specified',
        status: toModelStatus(entry.status),
        summary: entry.summary ?? 'No model summary is available.',
    }));
    const detailsByModelId = {};
    for (const model of models) {
        const rawDetail = raw.metadataByModelId?.[model.model_id];
        detailsByModelId[model.model_id] = {
            model_id: model.model_id,
            overview: rawDetail?.overview ?? 'No model overview is available.',
            assumptions: (rawDetail?.assumptions ?? []).map((item, index) => ({
                assumption_id: item.id ?? `${model.model_id}-assumption-${index + 1}`,
                label: item.label ?? `Assumption ${index + 1}`,
                value: item.value ?? 'Not specified',
                rationale: item.rationale ?? 'No rationale provided.',
            })),
            equations: (rawDetail?.equations ?? []).map((item, index) => ({
                equation_id: item.id ?? `${model.model_id}-equation-${index + 1}`,
                title: item.title ?? `Equation ${index + 1}`,
                expression: item.expression ?? 'No expression provided.',
                explanation: item.explanation ?? 'No explanation provided.',
            })),
            caveats: (rawDetail?.caveats ?? []).map((item, index) => ({
                caveat_id: item.id ?? `${model.model_id}-caveat-${index + 1}`,
                severity: toCaveatSeverity(item.severity),
                message: item.message ?? 'No caveat details provided.',
                implication: item.implication ?? 'No implication provided.',
            })),
            data_sources: (rawDetail?.dataSources ?? []).map((item, index) => ({
                source_id: item.id ?? `${model.model_id}-source-${index + 1}`,
                name: item.name ?? `Source ${index + 1}`,
                provider: item.provider ?? 'Unknown provider',
                frequency: item.frequency ?? 'Not specified',
                vintage: item.vintage ?? 'Not specified',
                note: item.note ?? 'No source note provided.',
            })),
        };
    }
    const defaultModelId = raw.defaultModelId && detailsByModelId[raw.defaultModelId] ? raw.defaultModelId : models[0]?.model_id ?? '';
    return {
        workspace_id: raw.workspaceId ?? 'model-explorer-workspace',
        generated_at: generatedAt,
        models,
        default_model_id: defaultModelId,
        details_by_model_id: detailsByModelId,
    };
}
