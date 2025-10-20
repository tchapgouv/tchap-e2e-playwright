import { test, expect } from "../../fixtures/auth-fixture";
import { env } from "../../utils/config";

test.describe("Create Room", () => {

  test("should allow us to create a public room with name", async ({
    page,
    authenticatedUser
  }) => {
    // Listen for all console logs
    page.on("console", (msg) => console.log(msg.text()));

    const name = "Test room public 1";

    await page.getByRole("button", { name: "Add room", exact: true }).click();

    await page.getByRole("menuitem", { name: "New room", exact: true }).click();
    const dialog = page.locator(".tc_TchapCreateRoomDialog");

    // Fill name
    await dialog.getByRole("textbox").fill(name);

    // Select public room option
    await dialog
      .locator(".tc_TchapRoomTypeSelector_RadioButton_title")
      .getByText("Public room")
      .click();

    // Submit
    await dialog.getByRole("button", { name: "Create New Room" }).click();

    // In local test An error dialog should appear first complaining about wss socket and SSL certificate error
    // So not really working locally
    if (env == "local") {
      await page.getByRole("button").getByText("OK").click();
    } else {
      // Takes some time to appear
      await page.waitForSelector(".mx_NewRoomIntro", { timeout: 10000 });

      await expect(page).toHaveURL(
        new RegExp(
          `/#/room/#test-room-public-1:${authenticatedUser.homeServer}`
        )
      );
      const header = page.locator(".mx_RoomHeader");

      await expect(header).toContainText(name);
      await expect(header).toHaveClass(".mx_DecoratedRoomAvatar_icon_forum");
    }
  });

  test("should allow us to create a private room with name", async ({
    page,
    authenticatedUser
  }) => {
    console.log("authenticatedUser", authenticatedUser);
    const name = "Test room private 1";

    await page.getByRole("button", { name: "Add room", exact: true }).click();

    await page.getByRole("menuitem", { name: "New room", exact: true }).click();
    const dialog = page.locator(".tc_TchapCreateRoomDialog");

    // Fill name
    await dialog.getByRole("textbox").fill(name);

    // Select public room option
    await dialog
      .locator(".tc_TchapRoomTypeSelector_RadioButton_title")
      .getByText("Private room", { exact: true })
      .click();

    // Submit
    await dialog.getByRole("button", { name: "Create New Room" }).click();

    // In local test An error dialog should appear first complaining about wss socket and SSL certificate error
    // So not really working locally
    if (env == "local") {
      await page.getByRole("button").getByText("OK").click();
    } else {
      // Takes some time
      await page.waitForSelector(".mx_NewRoomIntro", { timeout: 10000 });

      await expect(page).toHaveURL(
        new RegExp(
          `/#/room/#test-room-private-1:${authenticatedUser.homeServer}`
        )
      );
      const header = page.locator(".mx_RoomHeader");

      await expect(header).toContainText(name);
      await expect(header).toHaveClass(".mx_DecoratedRoomAvatar_icon_private");
    }
  });
  
  test("should allow us to create a private room with external with name", async ({
    page,
    authenticatedUser
  }) => {
    console.log("authenticatedUser", authenticatedUser);
    const name = "Test room private external 1";

    await page.getByRole("button", { name: "Add room", exact: true }).click();

    await page.getByRole("menuitem", { name: "New room", exact: true }).click();
    const dialog = page.locator(".tc_TchapCreateRoomDialog");

    // Fill name
    await dialog.getByRole("textbox").fill(name);

    // Select public room option
    await dialog
      .locator(".tc_TchapRoomTypeSelector_RadioButton_title")
      .getByText("Private room open to external users")
      .click();

    // Submit
    await dialog.getByRole("button", { name: "Create New Room" }).click();

    // In local test An error dialog should appear first complaining about wss socket and SSL certificate error
    // So not really working locally
    if (env == "local") {
      await page.getByRole("button").getByText("OK").click();
    } else {
      // Takes some time
      await page.waitForSelector(".mx_NewRoomIntro", { timeout: 10000 });

      await expect(page).toHaveURL(
        new RegExp(
          `/#/room/#test-room-private-external-1:${authenticatedUser.homeServer}`
        )
      );
      const header = page.locator(".mx_RoomHeader");

      await expect(header).toContainText(name);
      await expect(header).toHaveClass(".mx_DecoratedRoomAvatar_icon_external");
    }
  });
});

