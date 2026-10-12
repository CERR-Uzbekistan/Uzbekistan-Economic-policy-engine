import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import release_contract as release
import test_package_site as fixtures

class ReleaseTests(unittest.TestCase):
    setUp = fixtures.PackagingTests.setUp
    copy = fixtures.PackagingTests.copy
    write = fixtures.PackagingTests.write
    assemble = fixtures.PackagingTests.assemble

    def prepare(self):
        self.assemble()
        config = self.repo / 'build.json'
        self.write(config, json.dumps({'schema_version': 'policy-ui-build-v1', 'commit': 'a' * 40, 'base': self.base, 'source_state': 'dirty'}))
        return config

    def evidence(self, identity, checks=None):
        path = self.repo / 'evidence.json'
        self.write(path, json.dumps({'verifier_sha256': identity['verifier_sha256'], 'release_id': identity['release_id'], 'publication_manifest_sha256': identity['publication_manifest_sha256'], 'checks': checks if checks is not None else dict.fromkeys(release.REQUIRED_CHECKS, True)}))
        return path

    def test_exact_identity_and_preview_rollback_selection(self):
        identity = release.seal(self.output, self.prepare(), source_branch='feature', expected_data={})
        release.record_verification(self.output, self.evidence(identity))
        self.assertEqual(release.require_verified(self.output), identity)
        approval = {'verifier_sha256': identity['verifier_sha256'], 'release_id': identity['release_id'], 'target': 'preview', 'approver_identity': 'operator'}
        plan = release.selection_plan(self.output, 'preview', approval=approval, rollback=True)
        self.assertFalse(plan['publication_enabled'])
        self.assertTrue(plan['requires_fresh_served_verification'])
        with self.assertRaisesRegex(release.ReleaseError, 'nonproduction'):
            release.selection_plan(self.output, 'production', approval=approval)
        with self.assertRaisesRegex(release.ReleaseError, 'manual_release_approval'):
            release.selection_plan(self.output, 'preview')

    def test_failed_smoke_is_not_eligible(self):
        identity = release.seal(self.output, self.prepare(), source_branch='feature')
        checks = dict.fromkeys(release.REQUIRED_CHECKS, True)
        checks['scenario_save_reload_export'] = False
        with self.assertRaisesRegex(release.ReleaseError, 'functional_verification_failed'):
            release.record_verification(self.output, self.evidence(identity, checks))
        with self.assertRaisesRegex(release.ReleaseError, 'release_not_verified'):
            release.require_verified(self.output)
        self.assertEqual(release.load(self.output / release.VERIFICATION)['status'], 'unverified')

    def test_evidence_cannot_be_reused_and_content_cannot_change(self):
        identity = release.seal(self.output, self.prepare(), source_branch='feature')
        wrong = {**identity, 'release_id': 'sha256:' + '0' * 64}
        with self.assertRaisesRegex(release.ReleaseError, 'verification_identity_mismatch'):
            release.record_verification(self.output, self.evidence(wrong))
        release.record_verification(self.output, self.evidence(identity))
        with (self.output / 'policy-ui/data/qpm.json').open('ab') as file:
            file.write(b' ')
        with self.assertRaisesRegex(release.ReleaseError, 'release_content_mismatch'):
            release.require_verified(self.output)

    def test_regeneration_hash_matches_packaged_bytes(self):
        artifact = release.load(self.dist / 'data/qpm.json')
        artifact['metadata']['exported_at'] = '2026-09-30T00:00:00Z'
        regenerated = json.dumps(artifact)
        self.write(self.dist / 'data/qpm.json', regenerated)
        self.write(self.repo / 'apps/policy-ui/public/data/qpm.json', regenerated)
        config = self.prepare()
        name = 'policy-ui/data/qpm.json'
        digest = release.sha((self.output / name).read_bytes())
        with self.assertRaisesRegex(release.ReleaseError, 'regenerated_data_hash_mismatch'):
            release.seal(self.output, config, source_branch='main', expected_data={name: '0' * 64})
        identity = release.seal(self.output, config, source_branch='main', expected_data={name: digest})
        self.assertEqual(identity['data'][name]['sha256'], digest)
        self.assertNotEqual(digest, release.sha((fixtures.packaging.ROOT / 'apps/policy-ui/public/data/qpm.json').read_bytes()))
        self.assertEqual(identity['data'][name]['vintages']['/metadata/exported_at'], '2026-09-30T00:00:00Z')
        self.assertIn('/attribution/data_version', identity['data'][name]['vintages'])

    def test_nonproduction_cannot_seal_production(self):
        with self.assertRaisesRegex(release.ReleaseError, 'nonproduction'):
            release.seal(self.output, self.prepare(), source_branch='feature', channel='production-candidate')

if __name__ == '__main__':
    unittest.main()

