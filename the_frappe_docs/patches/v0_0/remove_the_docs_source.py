import frappe


def execute():
	"""Remove the retired documentation source's Desk navigation."""
	if frappe.db.exists("Sidebar", "The Frappe Docs"):
		sidebar = frappe.get_doc("Sidebar", "The Frappe Docs")
		for row in list(sidebar.items):
			if row.link_type == "Page" and row.link_to == "docs-the-docs":
				sidebar.remove(row)
		sidebar.save()
	if frappe.db.exists("Page", "docs-the-docs"):
		frappe.delete_doc("Page", "docs-the-docs")
