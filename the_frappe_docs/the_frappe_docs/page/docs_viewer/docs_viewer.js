frappe.provide("the_frappe_docs");

// {% include "the_frappe_docs/public/js/docs_viewer.js" %}

frappe.pages["docs-viewer"].on_page_load = function (wrapper) {
	the_frappe_docs.make_viewer(wrapper);
};

frappe.pages["docs-viewer"].on_page_show = function (wrapper) {
	return wrapper.load_sources();
};
