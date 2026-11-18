import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import frappe

from the_frappe_docs import sources


class TestSourceAccess(unittest.TestCase):
	def test_can_access_source(self):
		"""Require installation for guests and authenticated users alike."""
		with (
			patch.object(frappe, "get_installed_apps", return_value=["bmu_core"]),
			patch.object(frappe, "session", frappe._dict(user="Guest")),
		):
			self.assertTrue(sources.can_access_source(dict(app="bmu_core", allow_guest=True)))
			self.assertFalse(sources.can_access_source(dict(app="bmu_core", allow_guest=False)))
			self.assertFalse(sources.can_access_source(dict(app="other_app", allow_guest=True)))
		with (
			patch.object(frappe, "get_installed_apps", return_value=["bmu_core"]),
			patch.object(frappe, "session", frappe._dict(user="Administrator")),
		):
			self.assertTrue(sources.can_access_source(dict(app="bmu_core", allow_guest=False)))
			self.assertFalse(sources.can_access_source(dict(app="other_app", allow_guest=False)))

	def test_render(self):
		"""Protect nested assets and retire the standalone page and asset paths."""
		source = dict(app="bmu_core", slug="guide", path="docs", allow_guest=False)
		with tempfile.TemporaryDirectory() as directory:
			root = Path(directory)
			(root / "client/assets/desk").mkdir(parents=True)
			(root / "client/assets/desk/desk.js").write_text("private React mount")
			(root / "source.json").write_text(json.dumps(source))
			with (
				patch.object(sources, "get_site_sources", return_value=[source]),
				patch.object(sources, "get_build_directory", return_value=root),
				patch.object(frappe, "get_installed_apps", return_value=["bmu_core"]),
				patch.object(frappe, "session", frappe._dict(user="Guest")),
				patch.object(
					frappe,
					"local",
					frappe._dict(
						request=frappe._dict(path="/docs-assets/guide/assets/desk/desk.js", query_string=b"")
					),
				),
			):
				response = sources.DocsSourceRenderer("docs").render()
				self.assertEqual(response.status_code, 403)
				self.assertNotIn(b"private", response.data)
				self.assertEqual(response.headers["Cache-Control"], "private, no-store")
				with patch.object(frappe, "session", frappe._dict(user="Administrator")):
					self.assertEqual(sources.DocsSourceRenderer("docs").render().data, b"private React mount")
					frappe.local.request.path = "/docs-assets/guide/index.html"
					self.assertEqual(sources.DocsSourceRenderer("docs").render().status_code, 404)
					frappe.local.request.path = "/docs/guide/assets/desk/desk.js"
					self.assertEqual(sources.DocsSourceRenderer("docs").render().status_code, 404)
				frappe.local.request.path = "/docs/guide/p/setup"
				frappe.local.request.query_string = b"scope=guide&x=1"
				response = sources.DocsSourceRenderer("docs").render()
				self.assertEqual(response.status_code, 301)
				self.assertEqual(
					response.headers["Location"],
					"/desk/the-frappe-docs/docs-viewer/guide?doc=%2Fp%2Fsetup%3Fscope%3Dguide%26x%3D1",
				)
				with patch.object(sources, "get_site_sources", return_value=[]):
					self.assertEqual(sources.DocsSourceRenderer("docs").render().status_code, 404)

	def test_render_public_source(self):
		"""Allow guest assets only while the owning app is installed."""
		source = dict(app="bmu_core", slug="public", allow_guest=True)
		with tempfile.TemporaryDirectory() as directory:
			asset = Path(directory) / "guide.js"
			asset.write_text("public guide")
			with (
				patch.object(sources, "get_site_sources", return_value=[source]),
				patch.object(sources, "is_built", return_value=True),
				patch.object(sources, "resolve_build_file", return_value=asset),
				patch.object(
					frappe,
					"local",
					frappe._dict(request=frappe._dict(path="/docs-assets/public/assets/guide.js")),
				),
				patch.object(frappe, "session", frappe._dict(user="Guest")),
			):
				with patch.object(frappe, "get_installed_apps", return_value=["bmu_core"]):
					self.assertEqual(sources.DocsSourceRenderer("docs").render().status_code, 200)
				with patch.object(frappe, "get_installed_apps", return_value=[]):
					self.assertEqual(sources.DocsSourceRenderer("docs").render().status_code, 403)

	def test_resolve_build_file(self):
		"""Reject traversal and symlinks that escape a source build."""
		with tempfile.TemporaryDirectory() as directory:
			root = Path(directory)
			(root / "client").mkdir()
			(root / "secret.txt").write_text("secret")
			(root / "client/link.txt").symlink_to(root / "secret.txt")
			(root / "client/valid.txt").write_text("valid")
			(root / "client/internal.txt").symlink_to(root / "client/valid.txt")
			(root / "client/linked-directory").symlink_to(root / "client", target_is_directory=True)
			with patch.object(sources, "get_build_directory", return_value=root):
				self.assertIsNone(sources.resolve_build_file({}, "../secret.txt"))
				self.assertIsNone(sources.resolve_build_file({}, "link.txt"))
				self.assertIsNone(sources.resolve_build_file({}, "internal.txt"))
				self.assertIsNone(sources.resolve_build_file({}, "linked-directory/valid.txt"))
				self.assertEqual(sources.resolve_build_file({}, "valid.txt"), root / "client/valid.txt")

	def test_get_site_sources(self):
		"""Do not inspect hooks from apps absent from the current site."""
		with (
			patch.object(frappe, "get_installed_apps", return_value=["bmu_core"]),
			patch.object(frappe, "get_hooks", return_value=[]) as hooks,
			patch.object(frappe, "get_app_path", return_value="/apps/bmu_core/bmu_core"),
		):
			self.assertEqual(sources.get_site_sources(), [])
			hooks.assert_called_once_with("the_frappe_docs_sources", app_name="bmu_core")

	def test_render_legacy_redirect(self):
		"""Preserve nested pages and queries without accepting the wrong app owner."""
		source = dict(app="bmu_core", slug="guide")
		with (
			patch.object(sources, "get_site_sources", return_value=[source]),
			patch.object(
				frappe,
				"local",
				frappe._dict(
					request=frappe._dict(
						path="/docs/source/bmu_core/guide/tags/tree",
						query_string=b"scope=guide&x=1",
					)
				),
			),
		):
			response = sources.DocsSourceRenderer("docs").render()
			self.assertEqual(response.status_code, 301)
			self.assertEqual(
				response.headers["Location"],
				"/desk/the-frappe-docs/docs-viewer/guide?doc=%2Ftags%2Ftree%3Fscope%3Dguide%26x%3D1",
			)
			frappe.local.request.path = "/docs/source/wrong_app/guide/tags/tree"
			self.assertEqual(sources.DocsSourceRenderer("docs").render().status_code, 404)

	def test_get_site_sources_conflict(self):
		"""Check installed owners at runtime and include an incoming app before installation."""
		with (
			patch.object(frappe, "get_installed_apps", return_value=["first"]),
			patch.object(frappe, "get_hooks", return_value=[]),
			patch.object(frappe, "get_app_path", return_value="/apps/demo/demo"),
			patch.object(
				sources, "validate_sources", side_effect=lambda app, *_: [dict(app=app, slug="guide")]
			),
		):
			self.assertEqual(sources.get_site_sources(), [dict(app="first", slug="guide")])
			with self.assertRaisesRegex(ValueError, "guide: first and second"):
				sources.validate_install_sources("second")
			with patch.object(frappe, "get_installed_apps", return_value=["first", "second"]):
				with self.assertRaisesRegex(ValueError, "guide: first and second"):
					sources.get_site_sources()

	def test_get_sources(self):
		"""Separate Desk routes from protected asset URLs for built sources."""
		with (
			patch.object(
				sources, "get_site_sources", return_value=[dict(app="bmu_core", slug="guide", title="Guide")]
			),
			patch.object(sources, "can_access_source", return_value=True),
			patch.object(sources, "is_built", return_value=True),
			patch.object(frappe, "local", frappe._dict(response=frappe._dict())),
		):
			self.assertEqual(sources.get_sources()[0]["desk_url"], "/desk/the-frappe-docs/docs-viewer/guide")
			self.assertEqual(sources.get_sources()[0]["asset_base"], "/docs-assets/guide")
