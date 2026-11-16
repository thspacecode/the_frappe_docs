import importlib.util
import json
from pathlib import Path

repository = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
	"source_config", repository / "the_frappe_docs/source_config.py"
)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

apps = repository.parent
sources = []
if apps.name == "apps" and (apps.parent / "sites/apps.txt").is_file():
	for app in (apps.parent / "sites/apps.txt").read_text().splitlines():
		if app.strip():
			sources.extend(config.read_source_hook(app.strip(), apps / app.strip()))
else:
	sources = config.read_source_hook("the_frappe_docs", repository)
print(json.dumps(sources))
