import json
from pathlib import Path
from urllib.parse import urlencode

import frappe
from frappe.website.page_renderers.base_renderer import BaseRenderer
from werkzeug.wrappers import Response

from the_frappe_docs.source_config import validate_sources


def get_site_sources():
	"""Read declarations only from apps installed on the current site."""
	sources = []
	for app in frappe.get_installed_apps():
		sources.extend(
			validate_sources(
				app,
				Path(frappe.get_app_path(app)).parent,
				frappe.get_hooks("the_frappe_docs_sources", app_name=app) or [],
			)
		)
	return sources


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
			url=f"/docs/source/{source['app']}/{source['slug']}",
		)
		for source in get_site_sources()
		if can_access_source(source) and is_built(source)
	]


def resolve_build_file(source, relative_path):
	"""Reject traversal and symlinks before returning a protected build file."""
	root = (get_build_directory(source) / "client").resolve()
	path = (root / relative_path).resolve()
	if not path.is_relative_to(root) or not path.is_file():
		return None
	return path


class DocsSourceRenderer(BaseRenderer):
	def can_render(self):
		return frappe.local.request.path.startswith("/docs/source/")

	def render(self):
		import mimetypes

		parts = frappe.local.request.path.split("/", 5)
		if len(parts) < 5:
			return self.respond("Source not found", 404)
		app, slug = parts[3:5]
		source = next(
			(source for source in get_site_sources() if source["app"] == app and source["slug"] == slug), None
		)
		if not source:
			return self.respond("Source not found", 404)
		remainder = parts[5] if len(parts) == 6 else ""
		if not can_access_source(source):
			if frappe.session.user == "Guest" and not remainder.startswith("assets/"):
				request = frappe.local.request
				target = request.path
				if request.query_string:
					target += "?" + request.query_string.decode("utf-8")
				response = self.respond("", 302)
				response.headers["Location"] = "/login?" + urlencode({"redirect-to": target})
				return response
			return self.respond("Login required", 403)
		if not is_built(source):
			return self.respond("Documentation needs a build", 503)
		if remainder.startswith("assets/"):
			path = resolve_build_file(source, remainder)
			if path is None:
				return self.respond("Asset not found", 404)
		else:
			path = resolve_build_file(source, "index.html")
			if path is None:
				return self.respond("Documentation needs a build", 503)
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
