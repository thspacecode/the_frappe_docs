import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
	"discover_sources", Path(__file__).with_name("discover-sources.py")
)
discovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(discovery)


class TestDiscoverSources(unittest.TestCase):
	def create_source(self, repository, app, slug):
		(repository / app).mkdir(parents=True)
		(repository / "docs").mkdir()
		(repository / app / "hooks.py").write_text(
			f'the_frappe_docs_sources = [{{"slug": "{slug}", "path": "docs"}}]'
		)

	def test_bench_layouts(self):
		for linked in (False, True):
			with self.subTest(linked=linked), tempfile.TemporaryDirectory() as directory:
				bench = Path(directory)
				apps = bench / "apps"
				apps.mkdir()
				(bench / "sites").mkdir()
				(bench / "sites/apps.txt").write_text("the_frappe_docs\n\nbmu_core\n")
				storage = bench / "repo" if linked else apps
				repository = storage / "the_frappe_docs"
				repository.mkdir(parents=True)
				self.create_source(storage / "bmu_core", "bmu_core", "bmu-core")
				if linked:
					(apps / "the_frappe_docs").symlink_to(repository, target_is_directory=True)
					(apps / "bmu_core").symlink_to(storage / "bmu_core", target_is_directory=True)
				for path in (repository, apps / "the_frappe_docs"):
					sources = discovery.discover_sources(path)
					self.assertEqual([source["slug"] for source in sources], ["bmu-core"])
					self.assertFalse(sources[0]["allow_guest"])

	def test_standalone_build(self):
		with tempfile.TemporaryDirectory() as directory:
			repository = Path(directory) / "the_frappe_docs"
			self.create_source(repository, "the_frappe_docs", "guide")
			self.assertEqual(discovery.discover_sources(repository)[0]["slug"], "guide")

	def test_unrelated_parent_bench(self):
		with tempfile.TemporaryDirectory() as directory:
			bench = Path(directory)
			(bench / "sites").mkdir()
			(bench / "sites/apps.txt").write_text("bmu_core\n")
			(bench / "apps/the_frappe_docs").mkdir(parents=True)
			repository = bench / "other/the_frappe_docs"
			self.create_source(repository, "the_frappe_docs", "standalone")
			self.assertEqual(discovery.discover_sources(repository)[0]["slug"], "standalone")
