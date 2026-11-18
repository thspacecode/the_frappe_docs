frappe.provide("the_frappe_docs");

the_frappe_docs.make_viewer = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Documentation"),
		single_column: true,
	});
	const container = document.createElement("div");
	container.className = "desk-docs-directory";
	page.main.append(container);

	let unmount;
	let load_generation = 0;
	wrapper.unload_sources = function () {
		load_generation++;
		if (unmount) unmount();
		unmount = null;
	};
	wrapper.load_sources = async function () {
		wrapper.unload_sources();
		const generation = load_generation;
		const slug = frappe.get_route()[1];
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
			if (generation !== load_generation) return;
			const sources = response.message || [];
			if (!slug) {
				container.replaceChildren();
				container.classList.remove("desk-docs-embedded");
				wrapper.classList.remove("desk-docs-fullscreen");
				container.setAttribute("aria-busy", "false");
				if (!sources.length) {
					container.textContent = __(
						"No documentation sources are available for your account."
					);
				}
				const list = document.createElement("ul");
				for (const source of sources) {
					const row = document.createElement("li");
					const link = document.createElement("a");
					link.href = source.desk_url;
					link.textContent = source.title;
					row.append(link);
					list.append(row);
				}
				container.append(list);
				return;
			}
			const source = sources.find((entry) => entry.slug === slug);
			if (!source) {
				show_error(__("This documentation source is not available for your account."));
				return;
			}
			page.set_title(source.title);
			container.classList.add("desk-docs-embedded");
			wrapper.classList.add("desk-docs-fullscreen");
			const host = document.createElement("div");
			host.className = "desk-docs-host";
			const shadow = host.attachShadow({ mode: "open" });
			const stylesheet = document.createElement("link");
			stylesheet.rel = "stylesheet";
			stylesheet.href = `${source.asset_base}/assets/desk/desk.css`;
			const styled = new Promise((resolve, reject) => {
				stylesheet.onload = resolve;
				stylesheet.onerror = reject;
			});
			shadow.append(stylesheet);
			container.append(host);
			const [frontend] = await Promise.all([
				import(`${source.asset_base}/assets/desk/desk.js`),
				styled,
			]);
			if (generation !== load_generation) return;
			unmount = frontend.mount(host, source.desk_url);
			status.remove();
			container.setAttribute("aria-busy", "false");
		} catch {
			if (generation !== load_generation) return;
			show_error(__("Could not load documentation sources. Use Refresh to try again."));
		}
	};
	const observer = new MutationObserver(() => {
		if (wrapper.classList.contains("hide") || wrapper.style.display === "none") {
			wrapper.unload_sources();
		}
	});
	observer.observe(wrapper, { attributes: true, attributeFilter: ["class", "style"] });
	const removal = new MutationObserver(() => {
		if (wrapper.isConnected) return;
		wrapper.unload_sources();
		observer.disconnect();
		removal.disconnect();
	});
	removal.observe(document.body, { childList: true, subtree: true });
	page.set_secondary_action(__("Refresh"), () => wrapper.load_sources(), "refresh");
};
