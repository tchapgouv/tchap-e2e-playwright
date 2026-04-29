import { test, expect } from '../../fixtures/auth-fixture';
import { env } from '../../utils/config';
import { getExternalInvitationEmail } from '../../utils/mailpit';

test.describe('Invite external', () => {
  test('should allow us to create a private room with name and invite an external member', async ({ page, authenticatedUser }) => {
    console.log("authenticatedUser", authenticatedUser);
    const roomName = "Test room private 1";

    await page.getByRole("button", { name: "Ajouter", exact: true }).click();

    await page
      .getByRole("menuitem", { name: "Nouveau salon", exact: true })
      .click();
    const dialog = page.locator(".tc_TchapCreateRoomDialog");

    // Fill name
    await dialog.getByRole("textbox").fill(roomName);

    // Select private room option
    await dialog
      .locator(".tc_TchapRoomTypeSelector_RadioButton_title")
      .getByText("Salon privé sécurisé", { exact: true })
      .click();

    // Submit
    await dialog
      .getByRole("button", { name: "Créer un nouveau salon" })
      .click();

    // Click on the room header to open right panel
    page.locator("button").filter({ hasText: roomName }).click();

    page.getByRole("menuitem", { name: "Inviter" }).click();
    const externalEmail = "test-invite@yopext.tchap.incubateur.net";

    // Enter in field the email adresse et press space or enter
    page.getByTestId("invite-dialog-input-wrapper").fill(externalEmail);

    // Should display warning message
    expect(page.getByText("Vous allez inviter des")).toBeInViewport();

    // Removing the external email input should remove the warning message
    page.getByRole("button", { name: "Supprimer" }).click();

    expect(page.getByText("Vous allez inviter des")).not.toBeInViewport();
    
    // ReEnter in field the email adresse et press space or enter
    page.getByTestId("invite-dialog-input-wrapper").fill(externalEmail);

    // finalize the invite by clicking the button
    page.getByRole("button", { name: "Inviter" }).click();

    // a Modal should display another warning
    expect(page.getByText("En invitant un partenaire")).toBeInViewport();
    // accept the invit anyway
    page.getByTestId("dialog-primary-button").click();

    // should have badge invité externe present now
    expect(page.getByTestId("right-panel").getByText("Invités externes")).toBeInViewport();

    // Should have new invitee in list of people 
    page.getByRole("menuitem", { name: "Personnes" }).click();
    expect(page.getByTestId("virtuoso-item-list").getByText("Invité")).toBeInViewport();

    // External user should have received email notification
    const receviedEmail = await getExternalInvitationEmail(externalEmail);
    console.log("receviedEmail", receviedEmail);
  });

});
