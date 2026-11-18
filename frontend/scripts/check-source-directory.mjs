// Pass this function to playwright-cli run-code after signing in.
export default async function checkSourceDirectory(page) {
  const directory = await page.evaluate(
    () => `${location.origin}/desk/the-frappe-docs/docs-viewer`
  );
  const endpoint = "**/api/method/the_frappe_docs.sources.get_sources";
  try {
    await page.route(endpoint, (route) =>
      route.fulfill({
        json: {
          message: [
            {
              slug: "guide-one",
              title: "Guide One",
              desk_url: "/desk/the-frappe-docs/docs-viewer/guide-one",
              asset_base: "/docs-assets/guide-one",
            },
            {
              slug: "guide-two",
              title: "Guide Two",
              desk_url: "/desk/the-frappe-docs/docs-viewer/guide-two",
              asset_base: "/docs-assets/guide-two",
            },
          ],
        },
      })
    );
    await page.goto(directory);
    for (const [title, slug] of [
      ["Guide One", "guide-one"],
      ["Guide Two", "guide-two"],
    ]) {
      const link = page.getByRole("link", { name: title, exact: true });
      await link.waitFor();
      if (!(await link.getAttribute("href")).endsWith(`/docs-viewer/${slug}`))
        throw new Error("Incorrect generic source route");
    }
    await page.unroute(endpoint);
    await page.route(endpoint, (route) =>
      route.fulfill({ json: { message: [] } })
    );
    await page.reload();
    await page
      .getByText("No documentation sources are available for your account.", {
        exact: true,
      })
      .waitFor();
    await page.goto(`${directory}/not-installed`);
    await page
      .getByText(
        "This documentation source is not available for your account.",
        { exact: true }
      )
      .waitFor();
  } finally {
    await page.unroute(endpoint);
    await page.goto(directory);
  }
}
