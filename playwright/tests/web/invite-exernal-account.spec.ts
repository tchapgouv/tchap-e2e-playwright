import { test, expect } from "../../fixtures/auth-fixture";
import { ElementAppPage } from "../../pages/ElementAppPage";
import { generateTestUserData, TestUser } from "../../utils/auth-helpers";
import { env, INVITED_EMAIL_DOMAIN } from "../../utils/config";

test.describe("Invite external account", () => {
  
  test("should allow us to invite an external account", async ({
    page,
    authenticatedUser
  }) => {
    console.log("authenticatedUser", authenticatedUser);
    const name = "Test room private external 1";
    const external_account:TestUser = generateTestUserData(INVITED_EMAIL_DOMAIN);

    await page.getByRole("button", { name: "Ajouter", exact:true}).click();

    await page.getByRole("menuitem", { name: "Nouveau salon", exact: true}).click();
    const dialog = page.locator(".tc_TchapCreateRoomDialog");

    // Fill name
    await dialog.getByRole("textbox").fill(name);

    // Select public room option
    await dialog
      .locator(".tc_TchapRoomTypeSelector_RadioButton_title")
      .getByText("Salon ouvert aux externes")
      .click();

    // Submit
    await dialog
      .getByRole('button', { name: 'Créer un nouveau salon' })
      .click();
    
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

    //invite people
    const app = new ElementAppPage(page);
  
  });


});


