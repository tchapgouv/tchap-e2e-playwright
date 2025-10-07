import { test, expect } from "../../fixtures/auth-fixture";

test.describe("Create Room", () => {

  test("should allow us to create a public room with name, topic & address set", async ({
    page,
    authenticatedUser
  }) => {
    console.log("authenticatedUser", authenticatedUser);
    const name = "Test room 1";
    const topic = "This room is dedicated to this test and this test only!";

    await page
      .getByRole("button", { name: "Add room", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "New room", exact: true })
      .click();
    const dialog =  page.locator(".mx_CreateRoomDialog");
    // Fill name & topic
    await dialog.getByRole("textbox", { name: "Name" }).fill(name);
    await dialog.getByRole("textbox", { name: "Topic" }).fill(topic);
    // Change room to public
    await dialog.getByRole("button", { name: "Room visibility" }).click();
    await dialog.getByRole("option", { name: "Public room" }).click();
    // Fill room address
    await dialog
      .getByRole("textbox", { name: "Room address" })
      .fill("test-room-1");
    // Submit
    await dialog.getByRole("button", { name: "Create room" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/#/room/#test-room-1:${authenticatedUser.homeServer}`)
    );
    const header = page.locator(".mx_RoomHeader");
    await expect(header).toContainText(name);
  });
});

// test with Mas user mode of connexion
