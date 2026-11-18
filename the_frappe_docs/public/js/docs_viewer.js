frappe.provide("the_frappe_docs");

the_frappe_docs.make_viewer = function (wrapper, slug) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Documentation"),
		single_column: true,
	});
	const container = document.createElement("div");
	container.className = "desk-docs-directory";
	page.main.append(container);

	wrapper.load_sources = async function () {
		container.replaceChildren();
		container.classList.add("desk-docs-embedded");
		wrapper.classList.add("desk-docs-fullscreen");
		container.setAttribute("aria-busy", "true");
		page.set_title(__("Documentation"));
		const status = document.createElement("div");
		status.className = "desk-docs-loading";
		status.setAttribute("role", "status");
		status.setAttribute("aria-label", __("Loading documentation"));
		const spinner = document.createElement("span");
		spinner.className = "desk-docs-spinner";
		spinner.setAttribute("aria-hidden", "true");
		status.append(spinner);
		container.append(status);
		const show_error = (message) => {
			container.setAttribute("aria-busy", "false");
			wrapper.classList.remove("desk-docs-fullscreen");
			container.classList.remove("desk-docs-embedded");
			status.className = "text-muted";
			status.removeAttribute("aria-label");
			status.textContent = message;
		};
		try {
			const response = await frappe.call({
				method: "the_frappe_docs.sources.get_sources",
			});
			const sources = response.message || [];
			const source = sources.find((entry) => entry.slug === slug);
			if (!source) {
				show_error(__("This documentation source is not available for your account."));
				return;
			}
			page.set_title(source.title);
			container.classList.add("desk-docs-embedded");
			wrapper.classList.add("desk-docs-fullscreen");
			const frame = document.createElement("iframe");
			frame.className = "desk-docs-frame";
			frame.title = source.title;
			frame.src = source.url;
			frame.addEventListener(
				"load",
				() => {
					const background = frame.contentDocument
						? frame.contentWindow.getComputedStyle(frame.contentDocument.body)
								.backgroundColor
						: "";
					if (background && background !== "rgba(0, 0, 0, 0)") {
						container.style.setProperty("--desk-docs-background", background);
					}
					status.remove();
					container.setAttribute("aria-busy", "false");
				},
				{ once: true }
			);
			container.append(frame);
		} catch {
			show_error(__("Could not load documentation sources. Use Refresh to try again."));
		}
	};
	page.set_secondary_action(__("Refresh"), () => wrapper.load_sources(), "refresh");
};
