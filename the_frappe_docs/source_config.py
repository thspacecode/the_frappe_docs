import ast
import re
from pathlib import Path


def validate_sources(app, repository, definitions):
	"""Resolve repository-relative source paths without accepting external files."""
	if not isinstance(definitions, list):
		raise ValueError(f"{app}: the_frappe_docs_sources must be a list")
	repository = Path(repository).resolve()
	sources = []
	seen = set()
	for definition in definitions:
		if not isinstance(definition, dict):
			raise ValueError(f"{app}: source must be an object")
		slug = definition.get("slug", "")
		if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
			raise ValueError(f"{app}: invalid source slug")
		if slug in seen:
			raise ValueError(f"{app}: duplicate source slug {slug}")
		seen.add(slug)
		title = definition.get("title", slug)
		if not isinstance(title, str) or not title.strip():
			raise ValueError(f"{app}: source title must be a non-empty string")
		allow_guest = definition.get("allow_guest", False)
		if not isinstance(allow_guest, bool):
			raise ValueError(f"{app}: allow_guest must be a boolean")
		path = definition.get("path")
		if not isinstance(path, str) or not path or Path(path).is_absolute():
			raise ValueError(f"{app}: source path must be repository-relative")
		resolved = (repository / path).resolve()
		if not resolved.is_relative_to(repository) or not resolved.is_dir():
			raise ValueError(f"{app}: source path must be a directory inside its repository")
		for child in resolved.rglob("*"):
			if child.is_symlink():
				raise ValueError(f"{app}: source files must not be symlinks")
		sources.append(
			dict(
				app=app,
				slug=slug,
				title=title,
				path=path,
				allow_guest=allow_guest,
				content_root=str(resolved),
			)
		)
	return sources


def read_source_hook(app, repository):
	"""Read literal source declarations without importing apps or opening a database."""
	hooks = Path(repository) / app / "hooks.py"
	if not hooks.is_file():
		return []
	for node in ast.parse(hooks.read_text()).body:
		if isinstance(node, ast.Assign) and any(
			isinstance(target, ast.Name) and target.id == "the_frappe_docs_sources" for target in node.targets
		):
			return validate_sources(app, repository, ast.literal_eval(node.value))
	return []
