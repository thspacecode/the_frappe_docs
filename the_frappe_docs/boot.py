from the_frappe_docs.sources import get_available_sources


def boot_session(bootinfo):
	"""Replace the generic viewer link with accessible source links for this session."""
	for sidebar in (bootinfo.get("module_sidebars") or {}).values():
		if sidebar.get("app") != "the_frappe_docs":
			continue
		items = []
		for item in sidebar.get("items", []):
			if item.get("link_type") == "Page" and item.get("link_to") == "docs-viewer":
				for source in get_available_sources():
					items.append(
						{
							**item,
							"label": source["title"],
							"link_to": f"docs-viewer/{source['slug']}",
							"route_options": None,
							"key": f"docs-source:{source['slug']}",
						}
					)
			else:
				items.append(item)
		sidebar["items"] = items
