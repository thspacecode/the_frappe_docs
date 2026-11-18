import json
from pathlib import Path

import frappe
from frappe.website.page_renderers.base_renderer import BaseRenderer
from werkzeug.wrappers import Response

from the_frappe_docs.source_config import validate_source_registry, validate_sources


def get_site_sources(app=None):
	"""Read declarations only from apps installed on the current site."""
	sources = []
	apps = list(frappe.get_installed_apps())
	if app and app not in apps:
		apps.append(app)
	for app in apps:
		sources.extend(
			validate_sources(
				app,
				Path(frappe.get_app_path(app)).parent,
				frappe.get_hooks("the_frappe_docs_sources", app_name=app) or [],
			)
		)
	return validate_source_registry(sources)


def can_access_source(source):
	return source["app"] in frappe.get_installed_apps() and (
		source["allow_guest"] or frappe.session.user != "Guest"
	)


def get_build_directory(source):
	return Path(frappe.get_app_path("the_frappe_docs")) / "private_build" / source["app"] / source["slug"]


def is_built(source):
	manifest = get_build_directory(source) / "source.json"
	if not manifest.is_file():
		return False
	compiled = json.loads(manifest.read_text())
	return all(compiled.get(key) == source[key] for key in ("app", "slug", "path"))


@frappe.whitelist(allow_guest=True)
def get_sources():
	"""List allowed source titles without exposing other sites' registrations."""
	frappe.local.response.headers = {"Cache-Control": "private, no-store", "Vary": "Cookie, Host"}
	return [
		dict(
			app=source["app"],
			slug=source["slug"],
			title=source["title"],
			desk_url=f"/desk/the-frappe-docs/docs-viewer/{source['slug']}",
			asset_base=f"/docs-assets/{source['slug']}",
		)
		for source in get_site_sources()
		if can_access_source(source) and is_built(source)
	]


def resolve_build_file(source, relative_path):
	"""Reject traversal and symlinks before returning a protected build file."""
	root = get_build_directory(source) / "client"
	candidate = root / relative_path
	path = candidate.resolve()
	if not path.is_relative_to(root.resolve()) or not path.is_file():
		return None
	if any(part.is_symlink() for part in (candidate, *candidate.parents)):
		return None
	return path


class DocsSourceRenderer(BaseRenderer):
	def can_render(self):
		return frappe.local.request.path.startswith(("/docs/", "/docs-assets/"))

	def render(self):
		import mimetypes

		request = frappe.local.request
		if request.path.startswith("/docs/"):
			return self.respond("Documentation is available in Desk", 404)
		parts = request.path.split("/", 3)
		slug = parts[2]
		remainder = parts[3] if len(parts) == 4 else ""
		source = next((source for source in get_site_sources() if source["slug"] == slug), None)
		if not source:
			return self.respond("Source not found", 404)
		if not can_access_source(source):
			return self.respond("Login required", 403)
		if not is_built(source):
			return self.respond("Documentation needs a build", 503)
		if not remainder.startswith("assets/"):
			return self.respond("Asset not found", 404)
		path = resolve_build_file(source, remainder)
		if path is None or path.suffix.lower() in (".html", ".htm"):
			return self.respond("Asset not found", 404)
		mimetype = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
		return self.respond(path.read_bytes(), 200, mimetype)

	def respond(self, body, status, mimetype="text/plain"):
		return Response(
			body,
			status=status,
			mimetype=mimetype,
			headers={
				"Cache-Control": "private, no-store",
				"Vary": "Cookie, Host",
				"X-Content-Type-Options": "nosniff",
			},
		)


def validate_install_sources(app="the_frappe_docs"):
	"""Check the incoming app together with all installed source registrations."""
	get_site_sources(app)
