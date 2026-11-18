import copy
import unittest
from unittest.mock import patch

import frappe

from the_frappe_docs.boot import boot_session


class TestDocsBoot(unittest.TestCase):
	def test_boot_session(self):
		"""Generate source-specific labels and URLs without changing stored sidebar rows."""
		generic = dict(type="Link", label="Documentation", link_type="Page", link_to="docs-viewer")
		other = dict(type="Link", label="Other", link_type="Page", link_to="other-page")
		bootinfo = frappe._dict(
			module_sidebars={
				"The Frappe Docs": dict(app="the_frappe_docs", items=[generic, other]),
				"Other App": dict(app="other", items=[generic]),
			}
		)
		original = copy.deepcopy(generic)
		with patch(
			"the_frappe_docs.boot.get_available_sources",
			return_value=[
				dict(
					slug="bmu-core", title="BMU Core", desk_url="/desk/the-frappe-docs/docs-viewer/bmu-core"
				),
				dict(
					slug="hr-guide", title="HR Guide", desk_url="/desk/the-frappe-docs/docs-viewer/hr-guide"
				),
			],
		):
			boot_session(bootinfo)
		items = bootinfo.module_sidebars["The Frappe Docs"]["items"]
		self.assertEqual([item["label"] for item in items], ["BMU Core", "HR Guide", "Other"])
		self.assertEqual(items[0]["link_to"], "docs-viewer/bmu-core")
		self.assertEqual(items[1]["link_to"], "docs-viewer/hr-guide")
		self.assertEqual(items[0]["link_type"], "Page")
		self.assertNotEqual(items[0]["key"], items[1]["key"])
		self.assertEqual(generic, original)
		self.assertEqual(bootinfo.module_sidebars["Other App"]["items"], [generic])

	def test_boot_session_empty(self):
		"""Remove the generic link when no sources are accessible and tolerate absent sidebars."""
		bootinfo = frappe._dict(
			module_sidebars={
				"The Frappe Docs": dict(
					app="the_frappe_docs", items=[dict(link_type="Page", link_to="docs-viewer")]
				)
			}
		)
		with patch("the_frappe_docs.boot.get_available_sources", return_value=[]):
			boot_session(bootinfo)
			boot_session(frappe._dict())
		self.assertEqual(bootinfo.module_sidebars["The Frappe Docs"]["items"], [])
