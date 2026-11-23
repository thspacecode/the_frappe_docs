import importlib.util
import json
from pathlib import Path

repository = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
	"source_config", repository / "the_frappe_docs/source_config.py"
)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)


def discover_sources(repository):
	"""Find bench registrations for direct and symlinked app repositories."""
	repository = Path(repository).resolve()
	for bench in repository.parents:
		apps = bench / "apps"
		registry = bench / "sites/apps.txt"
		if registry.is_file() and (apps / "the_frappe_docs").resolve() == repository:
			sources = []
			for app in registry.read_text().splitlines():
				if app.strip():
					sources.extend(config.read_source_hook(app.strip(), apps / app.strip()))
			return sources
	return config.read_source_hook("the_frappe_docs", repository)


if __name__ == "__main__":
	print(json.dumps(discover_sources(repository)))
