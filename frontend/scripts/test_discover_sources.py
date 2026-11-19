import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
	"discover_sources", Path(__file__).with_name("discover-sources.py")
)
discovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(discovery)


class TestDiscoverSources(unittest.TestCase):
	def test_symlinked_apps(self):
		with tempfile.TemporaryDirectory() as directory:
			bench = Path(directory)
			(bench / "sites").mkdir()
			(bench / "sites/apps.txt").write_text("demo\n")
			(bench / "apps").mkdir()
			repository = bench / "repo/the_frappe_docs"
			repository.mkdir(parents=True)
			with patch.object(discovery.config, "read_source_hook", return_value=[]) as read:
				self.assertEqual(discovery.discover_sources(repository), [])
				read.assert_called_once_with("demo", bench / "apps/demo")

	def test_standalone_repository(self):
		with tempfile.TemporaryDirectory() as directory:
			repository = Path(directory) / "the_frappe_docs"
			with patch.object(discovery.config, "read_source_hook", return_value=[]) as read:
				self.assertEqual(discovery.discover_sources(repository), [])
				read.assert_called_once_with("the_frappe_docs", repository)
