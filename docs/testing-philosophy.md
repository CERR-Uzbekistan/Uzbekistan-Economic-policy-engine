# Testing Philosophy

This project favors contract-level tests over broad component-test expansion. The React surface is a pilot shell over model outputs, source-state adapters, bridge payloads, and saved-run state. Tests should protect those boundaries first because that is where silent demo corruption is most expensive.

Use guard tests for raw payload validation, especially bridge and locale inputs. Use adapter tests to prove bridge-native output becomes the page-native view model without leaking presentation shapes upstream. Use source tests to cover mock/live/error/degraded states. Use state tests for saved-run persistence, restore behavior, and stale-edit gates. Use bridge tests to validate bridge-native artifacts separately from page composers.

Component tests are appropriate when the behavior cannot be protected cleanly at the contract/source level: accessibility-critical interactions, reusable cross-page controls, trust labels, keyboard semantics, or a regression that lives in rendering rather than data shape. They should stay targeted.

Bridge work should test bridge-native output and page adapter/composer behavior separately. For example, a bridge should prove its artifact contract, while the page composer should prove how the UI derives comparison rows or model catalog content from that contract.

Content-trust tests are intentional. The sentinel inventory guards editorial placeholders so Shot 2 burn-down is explicit. The duplicate-key locale guard exists because normal JSON parsing hides duplicate keys before tests can see them. Keep both in place before RU/UZ translation expands.
