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
	apps = repository.parent
	for parent in repository.parents:
		if (parent / "sites/apps.txt").is_file():
			apps = parent / "apps"
			break
	if apps.name != "apps" or not (apps.parent / "sites/apps.txt").is_file():
		return config.read_source_hook("the_frappe_docs", repository)
	sources = []
	for app in (apps.parent / "sites/apps.txt").read_text().splitlines():
		if app.strip():
			sources.extend(config.read_source_hook(app.strip(), apps / app.strip()))
	return config.validate_source_registry(sources)


if __name__ == "__main__":
	print(json.dumps(discover_sources(repository)))
