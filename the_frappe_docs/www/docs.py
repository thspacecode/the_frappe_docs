import frappe

from the_frappe_docs.sources import get_sources

no_cache = 1


def get_context(context):
	context.sources = get_sources()
	context.is_guest = frappe.session.user == "Guest"
	frappe.local.response.headers = {"Cache-Control": "private, no-store", "Vary": "Cookie, Host"}
