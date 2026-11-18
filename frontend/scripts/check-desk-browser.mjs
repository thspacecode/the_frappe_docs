// Pass this function to playwright-cli run-code after signing in.
export default async function checkDeskBrowser(page) {
  const desk = await page.evaluate(
    () => `${location.origin}/desk/the-frappe-docs/docs-viewer/bmu-core`
  );
  await page.goto(desk);
  await page.getByRole("heading", { name: "The Docs", exact: true }).waitFor();
  const borders = await page.evaluate(() => {
    const root = document.querySelector(".desk-docs-host").shadowRoot;
    return [
      root.querySelector("header"),
      root.querySelector(".border-b"),
      root.querySelector(".divide-y > li"),
    ].every(
      (element) =>
        getComputedStyle(element).borderBottomWidth === "1px" &&
        getComputedStyle(element).borderBottomStyle === "solid"
    );
  });
  if (!borders) throw new Error("Documentation separator lines are missing");
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
  if (
    (await page.evaluate(() =>
      new URL(location.href).searchParams.get("doc")
    )) !== "/p/setting-up"
  )
    throw new Error("Search did not save the document route");
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
  const documentUrl = page.url();
  const documentRoute = await page.evaluate(() => ({
    path: new URL(location.href).searchParams.get("doc"),
    hash: location.hash,
  }));
  if (
    documentRoute.path !== "/p/hello-world?scope=team" ||
    documentRoute.hash !== "#hello-world"
  )
    throw new Error("Document query or heading was lost");
  await page.reload();
  await page
    .getByRole("heading", { name: "Hello World", exact: true })
    .first()
    .waitFor();
  if (page.url() !== documentUrl)
    throw new Error("Refresh lost the document URL");

  await page.getByRole("link", { name: "List", exact: true }).click();
  await page
    .getByRole("heading", { name: "Filter documents", exact: true })
    .waitFor();
  await page.goBack();
  await page
    .getByRole("heading", { name: "Hello World", exact: true })
    .first()
    .waitFor();
  if (page.url() !== documentUrl) throw new Error("Back lost the document URL");
  await page.goForward();
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
  await page.evaluate(() => window.frappe.set_route("docs-viewer", "bmu-core"));
  await page.getByRole("heading", { name: "The Docs", exact: true }).waitFor();
}
