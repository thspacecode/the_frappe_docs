frappe.provide("the_frappe_docs");

// {% include "the_frappe_docs/public/js/docs_viewer.js" %}

frappe.pages["docs-bmu-core"].on_page_load = function (wrapper) {
	the_frappe_docs.make_viewer(wrapper, "bmu-core");
};

frappe.pages["docs-bmu-core"].on_page_show = function (wrapper) {
	return wrapper.load_sources();
};
