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
		"""Check source access before reading pages or nested assets, without a database."""
		source = dict(app="bmu_core", slug="guide", path="docs", allow_guest=False)
		with tempfile.TemporaryDirectory() as directory:
			root = Path(directory)
			(root / "client/assets").mkdir(parents=True)
			(root / "client/index.html").write_text("private document")
			(root / "client/assets/search.js").write_text("private search data")
			(root / "source.json").write_text(json.dumps(source))
			with (
				patch.object(sources, "get_site_sources", return_value=[source]),
				patch.object(sources, "get_build_directory", return_value=root),
				patch.object(frappe, "get_installed_apps", return_value=["bmu_core"]),
				patch.object(frappe, "session", frappe._dict(user="Guest")),
			):
				for suffix in ("", "/assets/search.js"):
					with (
						self.subTest(suffix=suffix),
						patch.object(
							frappe,
							"local",
							frappe._dict(request=frappe._dict(path=f"/docs/source/bmu_core/guide{suffix}")),
						),
					):
						response = sources.DocsSourceRenderer("docs").render()
						self.assertEqual(response.status_code, 403)
						self.assertNotIn(b"private", response.data)
						self.assertEqual(response.headers["Cache-Control"], "private, no-store")
				with (
					patch.object(frappe, "session", frappe._dict(user="Administrator")),
					patch.object(
						frappe,
						"local",
						frappe._dict(
							request=frappe._dict(path="/docs/source/bmu_core/guide/assets/search.js")
						),
					),
				):
					self.assertEqual(sources.DocsSourceRenderer("docs").render().data, b"private search data")
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
					frappe._dict(request=frappe._dict(path="/docs/source/bmu_core/public/assets/guide.js")),
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
			with patch.object(sources, "get_build_directory", return_value=root):
				self.assertIsNone(sources.resolve_build_file({}, "../secret.txt"))
				self.assertIsNone(sources.resolve_build_file({}, "link.txt"))

	def test_get_site_sources(self):
		"""Do not inspect hooks from apps absent from the current site."""
		with (
			patch.object(frappe, "get_installed_apps", return_value=["bmu_core"]),
			patch.object(frappe, "get_hooks", return_value=[]) as hooks,
			patch.object(frappe, "get_app_path", return_value="/apps/bmu_core/bmu_core"),
		):
			self.assertEqual(sources.get_site_sources(), [])
			hooks.assert_called_once_with("the_frappe_docs_sources", app_name="bmu_core")
