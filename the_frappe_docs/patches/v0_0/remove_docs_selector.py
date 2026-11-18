import frappe


def execute():
	"""Remove the retired Desk selector and its sidebar link."""
	if frappe.db.exists("Sidebar", "The Frappe Docs"):
		sidebar = frappe.get_doc("Sidebar", "The Frappe Docs")
		for row in list(sidebar.items):
			if row.link_type == "Page" and row.link_to == "docs-sources":
				sidebar.remove(row)
		sidebar.save()
	if frappe.db.exists("Page", "docs-sources"):
		frappe.delete_doc("Page", "docs-sources")
