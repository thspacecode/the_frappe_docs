// Pass this function to playwright-cli run-code after signing in.
export default async function checkDeskBrowser(page) {
  const desk = await page.evaluate(
    () => `${location.origin}/desk/the-frappe-docs/docs-bmu-core`
  );
  await page.goto(desk);
  await page.getByRole("heading", { name: "The Docs", exact: true }).waitFor();
  if (await page.locator(".desk-docs-directory iframe").count())
    throw new Error("Desk must not use an iframe");
  await page
    .getByRole("button", { name: "Search documentation", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  if (
    !(await page.evaluate(
      () =>
        !!document
          .querySelector(".desk-docs-host")
          .shadowRoot.querySelector("[role=dialog]")
    ))
  ) {
    throw new Error("Search dialog escaped the shadow root");
  }
  await page.getByRole("combobox").fill("Setting Up");
  await page.keyboard.press("Enter");
  await page
    .getByRole("heading", { name: "Setting Up", exact: true })
    .waitFor();
  if (page.url() !== desk) throw new Error("React changed the Desk URL");
  // Inject plain anchors to exercise Markdown-style links without editing source content.
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.textContent = "Check relative document link";
    link.href = "./hello-world?scope=team#hello-world";
    document
      .querySelector(".desk-docs-host")
      .shadowRoot.querySelector("section")
      .append(link);
  });
  await page
    .getByRole("link", { name: "Check relative document link" })
    .click();
  await page
    .getByRole("heading", { name: "Hello World", exact: true })
    .first()
    .waitFor();
  if (page.url() !== desk) throw new Error("Markdown link left Desk");

  await page.getByRole("link", { name: "List", exact: true }).click();
  await page
    .getByRole("heading", { name: "Filter documents", exact: true })
    .waitFor();
  await page.evaluate(() => window.frappe.set_route("List", "User"));
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".desk-docs-host")
        .shadowRoot.querySelector(".desk-docs-body")
  );
  await page.evaluate(() => window.frappe.set_route("docs-bmu-core"));
  await page.getByRole("heading", { name: "The Docs", exact: true }).waitFor();
}
