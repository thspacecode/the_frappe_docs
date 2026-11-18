import frappe


def execute():
	"""Replace the retired source-specific navigation with the generic viewer."""
	if frappe.db.exists("Sidebar", "The Frappe Docs"):
		sidebar = frappe.get_doc("Sidebar", "The Frappe Docs")
		for row in sidebar.items:
			if row.link_type == "Page" and row.link_to == "docs-bmu-core":
				row.link_to = "docs-viewer"
				row.label = "Documentation"
		sidebar.save()
	if frappe.db.exists("Page", "docs-bmu-core"):
		frappe.delete_doc("Page", "docs-bmu-core")
