"""Check FPP raw MCP arguments before FastMCP can discard/coerce them.

This adapter is deliberately scoped to FPP. It does not change the SDK or
readiness approvals. Actual FastMCP schemas and calls are regression tested.
"""
from mcp.server.fastmcp.utilities.func_metadata import FuncMetadata
from .fpp import FppInputError, input_reason, validate_fpp_tool_call, validate_fpp_request


class FppTransportMetadata(FuncMetadata):
    async def call_fn_with_arg_validation(self, fn, fn_is_async, arguments_to_validate, arguments_to_pass_directly):
        values = arguments_to_validate
        try:
            if fn.__name__ == 'fpp_project':
                validate_fpp_tool_call(fn, (), values)
            elif fn.__name__ == 'model_execute' and values.get('variant_id') == 'fpp-reduced-form-v0':
                unknown = [key for key in values if key not in ('variant_id', 'inputs', 'intent')]
                if unknown:
                    raise FppInputError([input_reason(key, key) for key in unknown])
                validate_fpp_request(values.get('inputs', {}))
            elif fn.__name__ == 'scenario_compare':
                scenarios = values.get('scenarios', [])
                if isinstance(scenarios, list) and any(isinstance(item, dict) and str(item.get('model', '')).lower() == 'fpp' for item in scenarios):
                    unknown = [key for key in values if key != 'scenarios']
                    if unknown:
                        raise FppInputError([input_reason(key, key) for key in unknown])
                    for item in scenarios:
                        if isinstance(item, dict) and str(item.get('model', '')).lower() == 'fpp':
                            validate_fpp_request({key: value for key, value in item.items() if key not in ('model', 'label', 'variant')})
        except FppInputError as error:
            return {'error': error.response()}
        return await super().call_fn_with_arg_validation(fn, fn_is_async, values, arguments_to_pass_directly)


def install_fpp_transport_validation(server):
    manager = getattr(server, '_tool_manager', None)
    if manager is None:
        return  # Lightweight test registries already pass raw kwargs to guards.
    for name in ('fpp_project', 'model_execute', 'scenario_compare'):
        tool = manager.get_tool(name)
        if tool is None:
            raise RuntimeError(f'Missing registered FPP boundary: {name}')
        metadata = tool.fn_metadata
        tool.fn_metadata = FppTransportMetadata(**{key: getattr(metadata, key) for key in FuncMetadata.model_fields})
        if name == 'fpp_project':
            tool.parameters['additionalProperties'] = False
