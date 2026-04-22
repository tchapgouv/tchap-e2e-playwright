import { test, expect } from '../../fixtures/auth-fixture';
import {
  generateRoomName,
  generateTestUserData,
  openResetPasswordEmail,
} from '../../utils/auth-helpers';
import {
  ELEMENT_URL,
  INVITED_EMAIL_DOMAIN,
  STANDARD_EMAIL_DOMAIN,
  USE_MAS,
} from '../../utils/config';
import { getLatestVerificationCode, waitForMessage } from '../../utils/mailpit';
import path from 'path';
import { Page } from '@playwright/test';

//this scenario is one big test to cover all the scenario on a not MAS synapse (dev02 - a) and one MAS synapse (ext01 - e)

// Helper function to create a public room
async function createPublicRoom(page: Page, roomName: string): Promise<string> {
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Nouveau salon', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nom' }).fill(roomName);
  await page.locator('.tc_TchapCreateRoomDialog')
    .locator('.tc_TchapRoomTypeSelector_RadioButton_title')
    .getByText('Salon public')
    .click();
  await page.getByRole('button', { name: 'Créer un nouveau salon' }).click();
  await expect(page.locator('button').filter({ hasText: roomName })).toBeVisible();

  // Write in the public room
  await page
    .locator('.mx_BasicMessageComposer')
    .getByRole('textbox')
    .fill('message non chiffré');
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByRole('status', { name: 'Votre message a été envoyé' })).toBeVisible();

  return roomName;
}

// Helper function to create an encrypted private room
async function createEncryptedPrivateRoom(page: Page, roomName: string): Promise<string> {
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByText('Nouveau salon').click();
  await page.getByRole('textbox', { name: 'Nom' }).fill(roomName);
  await page
    .locator('.tc_TchapCreateRoomDialog')
    .locator('.tc_TchapRoomTypeSelector_RadioButton_title')
    .getByText('Salon privé sécurisé', { exact: true } )
    .click();
  await page.getByRole('button', { name: 'Créer un nouveau salon' }).click();

  // Write in the encrypted private room
  await page.locator('.mx_BasicMessageComposer').getByRole('textbox').fill('message chiffré');
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByRole('status', { name: 'Votre message a été envoyé' })).toBeVisible();

  // Verify parameters
  await page.locator('button').filter({ hasText: roomName }).click();
  await page.getByRole('menuitem', { name: 'Paramètres' }).click();
  await page.getByText('Vie privée').click();
  await expect(page.getByRole('radio', { name: 'salon privé' })).toBeChecked();
  await page.getByRole('button', { name: 'Fermer la boîte de dialogue' }).click();

  return roomName;
}

// Helper function to create an unencrypted private room
async function createUnencryptedPrivateRoom(page: Page, roomName: string): Promise<string> {
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByText('Nouveau salon').click();
  await page.getByRole('textbox', { name: 'Nom' }).fill(roomName);
  await page
    .locator('.tc_TchapCreateRoomDialog')
    .locator('.tc_TchapRoomTypeSelector_RadioButton_title')
    .getByText('Salon privé', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Créer un nouveau salon' }).click();

  // Write in the unencrypted private room
  await expect(page.locator('button').filter({ hasText: 'Non chiffré' })).toBeVisible();
  await expect(page.getByText('Le chiffrement de bout en bout n')).toBeVisible();
  await page.locator('.mx_BasicMessageComposer').getByRole('textbox').fill('message non chiffré');
  await page.getByRole('button', { name: 'Envoyer le message' }).click();
  await expect(page.getByRole('status', { name: 'Votre message a été envoyé' })).toBeVisible();

  // Verify parameters
  await page.locator('button').filter({ hasText: roomName }).click();
  await page.getByRole('menuitem', { name: 'Paramètres' }).click();
  await page.getByText('Vie privée').click();
  await expect(page.getByRole('radio', { name: 'salon privé' })).toBeChecked();
  await page.getByRole('button', { name: 'Fermer la boîte de dialogue' }).click();

  return roomName;
}

// Helper function to create an external private room
async function createExternalPrivateRoom(page: Page, roomName: string = 'Salon ouvert aux externes'): Promise<string> {
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByText('Nouveau salon').click();
  await page.getByLabel('Créer un salon').click();
  await page
    .locator('.tc_TchapCreateRoomDialog')
    .locator('.tc_TchapRoomTypeSelector_RadioButton_title')
    .getByText('Salon privé sécurisé avec externes')
    .click();
  await page.getByRole('textbox', { name: 'Nom' }).fill(roomName);
  await page.getByRole('button', { name: 'Créer un nouveau salon' }).click();

  return roomName;
}

test.describe
  .serial('Minimal scenario', () => {
    test.setTimeout(120_000);

    const external_user = generateTestUserData(INVITED_EMAIL_DOMAIN);
    const agent_user = generateTestUserData(STANDARD_EMAIL_DOMAIN);
    /*
     * tested:
     * creer compte agent
     * creer salon privé
     * creer salon privé non chiffré
     * creer salon public
     * creer salon privé ouverts aux externes
     * inviter un externe
     * envoyer fichier, fichier vérolé
     * activer la sauvegarde
     * vérifier qu'un externe ne peut pas créer de salon, ne peut pas chercher un forum
     * se déconnecter
     * reset mot de passe
     * TODO :  A. exporter les participants de la room
     * TODO : A. expirer le compte, vérifier que les clients affichent un truc cohérent,
     */

    test('internal user', async ({ page, context, screenChecker, browser }) => {
      const invitee1_search_name = 'olivier test1'; // TODO : ensure that invitee exists in the environment
      const invitee1_display_name = 'Olivier Test1'; // TODO : ensure that invitee exists in the environment

      const invitee2_email = 'testeur@agent2.tchap.incubateur.net'; // TODO : ensure that invitee exists in the environment
      const invitee2_display_name = 'Testeur [Incubateur]'; // TODO : ensure that invitee exists in the environment

      const public_room_name = generateRoomName('Forum');
      const room_name = generateRoomName('Salon Privé_');
      const room_name_uncrypted = generateRoomName('Salon Privé Non Chiffré_');

      // Grant clipboard permissions to browser context
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      //create account
      await page.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'load' });
      await screenChecker(page, '#/welcome');
      await page.getByRole('link').filter({ hasText: 'Créer un compte' }).click();

      await screenChecker(page, '#/email-precheck-sso');
      await page.locator('input').fill(agent_user.email);
      await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

      await screenChecker(page, '/register');
      await page.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' }).click();
      await screenChecker(page, '/register/password');
      await expect(page.locator('input[name="email"]')).toHaveValue(agent_user.email);

      await page.locator('input[name="password"]').fill(agent_user.password);
      await page.locator('input[name="password_confirm"]').fill(agent_user.password);

      //wait for password-confirm matching confirmation
      await page.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
      //await expect(page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
      await page.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 3 }); //2 clicks works better than one

      await screenChecker(page, '/verify-email');
      const verificationCode3 = await getLatestVerificationCode(agent_user.email);
      await page.locator('input[name="code"]').fill(verificationCode3);
      await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

      await screenChecker(page, '/consent');
      await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

      //await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});
      await page.waitForSelector('.mx_MatrixChat', { timeout: 20000 });

      //configurer la sauvegarde
      await screenChecker(page, '#/home');

      //configurer la sauvegarde (only possible at first connexion)
      await page.getByRole('button', { name: 'Avatar' }).click();
      await page.getByRole('tab', { name: 'Messages chiffrés' }).click();
      await page.getByRole('button', { name: 'Configurer la sauvegarde' }).click();
      await page.getByRole('button', { name: 'Continuer' }).click();
      await page.getByRole('button', { name: 'Copier et continuer' }).click();

      const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
      const clipboardContent = await handle.jsonValue();
      console.log(`verification code : ${clipboardContent}`);
      const verificationCode = clipboardContent;

      //fill the recupration code from the clipboard content
      await page
        .getByRole('textbox', { name: 'Saisir le code de vérification' })
        .fill(verificationCode);
      await page.getByRole('button', { name: 'Terminer la configuration' }).click();
      await page.getByRole('button', { name: 'Terminé' }).click();
      await page.getByRole('button', { name: 'Fermer la boîte de dialogue' }).click();

      await screenChecker(page, '#/home');

      //creer salon public
      await createPublicRoom(page, public_room_name);

      //chercher salon public
      await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Rejoindre un salon public', exact: true }).click();
      await page.getByRole('textbox', { name: 'Rechercher' }).fill(public_room_name);
      await expect(page.getByLabel('Suggestions').getByText(public_room_name)).toBeVisible();
      await page.getByRole('textbox', { name: 'Rechercher' }).press('Escape');

      //creer salon privé
      await createEncryptedPrivateRoom(page, room_name);

      //creer salon privé non chiffré
      await createUnencryptedPrivateRoom(page, room_name_uncrypted);


      //inviter agents by name
      await page.getByRole('button', { name: 'Personnes' }).click();
      await page.getByRole('button', { name: 'Inviter', exact: true }).click();
      await page.getByRole('textbox', { name: 'Rechercher' }).fill(invitee1_search_name);
      await page.getByText(invitee1_display_name).first().click();
      await page.getByRole('button', { name: 'Inviter' }).click();
      await expect(
        page.getByTestId('virtuoso-item-list').getByText(invitee1_display_name)
      ).toBeVisible();

      //inviter agents by email
      await page.getByRole('button', { name: 'Inviter dans ce salon' }).click();
      await page.getByRole('textbox', { name: 'Rechercher' }).fill(invitee2_email);
      await page.getByRole('button', { name: 'Inviter' }).click();
      await expect(
        page.getByTestId('virtuoso-item-list').getByText(invitee2_display_name)
      ).toBeVisible();

      //envoyer fichier png
      await page
        .locator(".mx_MessageComposer_actions input[type='file']")
        .setInputFiles(path.join(__dirname, '../../sample-files/element.png'));

      await page.getByRole('button', { name: 'Envoyer' }).click();
      await page.getByRole('link', { name: 'element.png' }).click();
      await page.getByRole('button', { name: 'Fermer' }).click();

      //envoyer fichier vérolé
      await page
        .locator(".mx_MessageComposer_actions input[type='file']")
        .setInputFiles(path.join(__dirname, '../../sample-files/eicar.com'));
      await page.getByRole('button', { name: 'Envoyer' }).click();
      await page.getByRole('listitem').filter({ hasText: /^Contenu bloqué$/ });

      //creer salon privé ouvert aux externes
      await createExternalPrivateRoom(page);

      //inviter agent externe
      await page.getByRole('button', { name: 'Personnes' }).click();
      await page.getByRole('button', { name: 'Inviter dans ce salon' }).click();
      await page.getByRole('textbox', { name: 'Rechercher' }).fill(external_user.email);
      await page.getByRole('button', { name: 'Inviter' }).click();
      //await expect(page.getByTestId('virtuoso-item-list').getByText(external_user.username)).toBeVisible();
      await expect(
        page.getByRole('option', { name: external_user.email.split('@')[0] })
      ).toBeVisible(); //just the localpart of the emailawait page.getByRole('option', { name: 'user.local_1775742819448_6984' }).click();

      //disconnect
      await page.getByRole('button', { name: 'Avatar' }).click();
      await page.getByRole('button', { name: 'Se déconnecter' }).click();
      await page
        .locator('#mx_Dialog_Container')
        .getByRole('button', { name: 'Se déconnecter' })
        .click();
      //reset passsword
      await page.getByRole('link', { name: 'Se connecter' }).click();
      await page.getByRole('textbox', { name: 'Votre adresse mail' }).fill(agent_user.email);
      await page.getByRole('button', { name: 'Continuer' }).click();
      await page.getByRole('link', { name: 'Mot de passe oublié' }).click();
      await page.getByRole('textbox', { name: 'Adresse mail' }).fill(agent_user.email);
      await page.getByRole('button', { name: 'Continuer' }).click();

      //await openResetPasswordEmailLegacy(context, screenChecker, agent_user.email);
      const resetPwdPage = await openResetPasswordEmail(context, screenChecker, agent_user.email);

      const newPassword = agent_user.password + '4';
      await resetPwdPage.locator('input[name="new_password"]').fill(newPassword);
      await resetPwdPage.locator('input[name="new_password_again"]').fill(newPassword);
      await resetPwdPage.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
      await expect(
        resetPwdPage.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
      ).toBeVisible();
      await resetPwdPage
        .getByRole('button')
        .filter({ hasText: 'Sauvegarder et continuer' })
        .click({ clickCount: 2 });

      //new tab is redirected back to MAS welcome page
      await expect(
        resetPwdPage.getByRole('link').filter({ hasText: 'Continuer dans Tchap' })
      ).toBeVisible();
    });

    test('external user', async ({ page, context, screenChecker, browser }) => {
 

      const context_ext = await browser.newContext();
      const page_ext = await context_ext.newPage();

      //invitation takes time to be available
      const { message, content } = await waitForMessage(external_user.email, 40000, 'Invitation');
      console.log('Invitation received for user, but sydent is a bit slow, so wait 10 seconds');
      await page_ext.waitForTimeout(10000);

      //register user on ext01 (with MAS)
      await page_ext.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'load' });
      await screenChecker(page_ext, '#/welcome');
      await page_ext.getByRole('link').filter({ hasText: 'Créer un compte' }).click();

      await screenChecker(page_ext, '#/email-precheck-sso');
      await page_ext.locator('input').fill(external_user.email);
      await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();

      await screenChecker(page_ext, '/register');
      await page_ext
        .getByRole('button')
        .filter({ hasText: 'Continuer avec mon adresse mail' })
        .click();

      await expect(page_ext.locator('input[name="email"]')).toHaveValue(external_user.email);

      await page_ext.locator('input[name="password"]').fill(external_user.password);
      await page_ext.locator('input[name="password_confirm"]').fill(external_user.password);

      //wait for password-confirm matching confirmation
      await page_ext.locator('body').click({ position: { x: 0, y: 0 } }); //unfocus field
      await expect(
        page_ext.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })
      ).toBeVisible();
      await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click({ clickCount: 2 }); //2 clicks works better than one

      await screenChecker(page_ext, '/verify-email');
      const verificationCode2 = await getLatestVerificationCode(external_user.email);
      await page_ext.locator('input[name="code"]').fill(verificationCode2);
      await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();
      await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();

      await page_ext.waitForSelector('.mx_MatrixChat', { timeout: 20000 });

      //rejoindre le salon
      await page_ext
        .locator('div')
        .filter({ hasText: /^Salon ouvert aux externes$/ })
        .first()
        .click();
      await page_ext.getByRole('button', { name: 'Accepter' }).click();
      await expect(await page_ext.getByText('a créé ce salon. C’est le début de')).toBeVisible();

      //ne peut pas créer de salon
      await page_ext.getByRole('button', { name: 'Ajouter', exact: true }).click();
      await page_ext.getByText('Nouveau salon').click();
      await page_ext.getByRole('textbox', { name: 'Nom' }).fill('test');
      await screenChecker(page_ext, '#/room');
      await page_ext.getByRole('button', { name: 'Créer un nouveau salon' }).click();
      await screenChecker(page_ext, '#/room');
      await expect(await page_ext.getByText("En tant qu'invité externe,")).toBeVisible();
      await page_ext.getByRole('button', { name: 'OK' }).click();

      //ne peut pas trouver le salon public
      //TODO
    });
  });
