import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
	"source_config", Path(__file__).resolve().parents[2] / "the_frappe_docs/source_config.py"
)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)


class TestSourceConfig(unittest.TestCase):
	def test_validate_sources(self):
		"""Default to login and reject unsafe paths, duplicates, and non-boolean access rules."""
		with tempfile.TemporaryDirectory() as directory:
			root = Path(directory)
			(root / "docs").mkdir()
			definition = dict(slug="guide", path="docs")
			self.assertFalse(config.validate_sources("demo", root, [definition])[0]["allow_guest"])
			for field, value, message in (
				("path", "../outside", "inside its repository"),
				("path", "/etc", "repository-relative"),
				("allow_guest", "false", "must be a boolean"),
				("slug", "../guide", "invalid source slug"),
			):
				with self.subTest(field=field, value=value), self.assertRaisesRegex(ValueError, message):
					config.validate_sources("demo", root, [{**definition, field: value}])
			with self.assertRaisesRegex(ValueError, "duplicate source slug"):
				config.validate_sources("demo", root, [definition, definition])

	def test_read_source_hook(self):
		"""Read literal declarations without running hook module code."""
		with tempfile.TemporaryDirectory() as directory:
			root = Path(directory)
			(root / "demo").mkdir()
			(root / "docs").mkdir()
			(root / "demo/hooks.py").write_text(
				'raise RuntimeError("do not execute")\nthe_frappe_docs_sources = [{"slug": "guide", "path": "docs"}]'
			)
			self.assertEqual(config.read_source_hook("demo", root)[0]["slug"], "guide")
