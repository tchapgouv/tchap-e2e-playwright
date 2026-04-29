import { test, expect } from '../../fixtures/auth-fixture';
import { getExternalInvitationEmail } from '../../utils/mailpit';
import { TchapAppPage } from '../../utils/TchapAppPage';
import { createEncryptedPrivateRoom } from '../minimal/minimal-scenario.spec';

test.describe('Invite external', () => {
  test('should allow us to create a private room with name and invite an external member', async ({
    page,
    authenticatedUser,
    screenChecker,
  }) => {
    console.log('authenticatedUser', authenticatedUser);
    const roomName = 'Test room private 1';

    await createEncryptedPrivateRoom(page, roomName);

    // Click on the room header to open right panel
    await page.locator('button').filter({ hasText: roomName }).click();

    await page.getByRole('menuitem', { name: 'Inviter' }).click();
    const externalEmail = 'test-invite@yopext.tchap.incubateur.net';

    // Enter in field the email adresse et press space or enter
    await page.getByTestId('invite-dialog-input-wrapper').fill(externalEmail);

    // Should display warning message
    expect(await page.getByText('Vous allez inviter des')).toBeInViewport();

    // Removing the external email input should remove the warning message
    await page.getByRole('button', { name: 'Supprimer' }).click();

    expect(await page.getByText('Vous allez inviter des')).not.toBeInViewport();

    // ReEnter in field the email adresse et press space or enter
    await page.getByTestId('invite-dialog-input-wrapper').fill(externalEmail);

    // finalize the invite by clicking the button
    await page.getByRole('button', { name: 'Inviter' }).click();

    // a Modal should display another warning
    expect(await page.getByText('En invitant un partenaire')).toBeInViewport();
    // accept the invit anyway
    await page.getByTestId('dialog-primary-button').click();

    // should have badge invité externe present now
    expect(await page.getByTestId('right-panel').getByText('Invités externes')).toBeInViewport();

    // Should have new invitee in list of people
    await page.getByRole('menuitem', { name: 'Personnes' }).click();
    expect(await page.getByTestId('virtuoso-item-list').getByText('Invité')).toBeInViewport();

    // External user should have received email notification
    const receviedEmail = await getExternalInvitationEmail(externalEmail);
    console.log('receviedEmail', receviedEmail);
  });
});
