import { time } from "console";
import { test, expect } from "../../fixtures/auth-fixture";
import { generateTestUserData, openCreateAccountLegacyLink, populateLocalStorageWithCredentials } from "../../utils/auth-helpers";
import { BASE_URL, ELEMENT_URL, env, INVITED_EMAIL_DOMAIN, STANDARD_EMAIL_DOMAIN } from "../../utils/config";
import { getLatestVerificationCode, waitForMessage } from "../../utils/mailpit";
import { getMasUserByEmail } from "../../utils/mas-admin";
import path from "path";
import { ClientServerApi, Credentials } from "../../utils/api";

test.describe.serial("Minimal scenario", () => {
  
  test.setTimeout(60_000);

  const external_user = generateTestUserData(INVITED_EMAIL_DOMAIN);
  const agent_user = generateTestUserData(STANDARD_EMAIL_DOMAIN);
  const invitee1 = generateTestUserData(STANDARD_EMAIL_DOMAIN);
  const invitee2 = generateTestUserData(STANDARD_EMAIL_DOMAIN);
  let verificationCode;

  test.beforeAll(async ({browser, screenChecker }) => { 
    // Set timeout for this hook.
    test.setTimeout(60000);
    
    const context = await browser.newContext();
    const page = await context.newPage();

    //creer compte agent 
    await page.goto(ELEMENT_URL);
    await page.getByRole('link', { name: 'Créer un compte' }).click();
    await page.getByRole('textbox', { name: 'Votre adresse mail' }).fill(agent_user.email);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('textbox', { name: 'Adresse mail' }).fill(agent_user.email);
    await page.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill(agent_user.password);
    await page.getByRole('textbox', { name: 'Confirmer le mot de passe' }).fill(agent_user.password);
    await page.getByRole('button', { name: 'S’inscrire' }).click();
    
    //cliquer sur le lien du mail pour valider l'inscription
    const tab = await openCreateAccountLegacyLink(context, screenChecker, agent_user.email);
    await expect(tab.getByText('Votre email a été validé')).toBeVisible();
    await tab.close();


    //await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });
    //configurer la sauvegarde

    // grant access to clipboard (you can also set this in the playwright.config.ts file)
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await screenChecker(page, "#/home")
    
    //configurer la sauvegarde (only possible at first connexion)
    await page.getByRole('button', { name: 'Avatar' }).click();
    await page.getByRole('tab', { name: 'Messages chiffrés' }).click();
    await page.getByRole('button', { name: 'Configurer la sauvegarde' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Copier et continuer' }).click();

    const handle = await page.evaluateHandle(() => navigator.clipboard.readText());
    const clipboardContent = await handle.jsonValue();
    console.log(`verification code : ${clipboardContent}`);
    verificationCode = clipboardContent;

    await page.getByRole('textbox', { name: 'Saisir le code de vérification' }).press('Meta+v');// paste text from clipboard
    await page.getByRole('button', { name: 'Terminer la configuration' }).click();
    await page.getByRole('button', { name: 'Terminé' }).click();
    await page.getByRole('button', { name: 'Fermer la boîte de dialogue' }).click();

    await screenChecker(page, "#/home")

    await page.getByRole('button', { name: 'OK' }).click();
    await page.getByRole('button', { name: 'OK' }).click();

    await page.close();


   });


  test("creer salon privé", async ({
    page,    
    context,
    screenChecker,
    request
  }) => {
    const invitee1_search_name = "olivier test1";
    const invitee1_display_name = "Olivier Test1";

    const invitee2_email = "testeur@agent2.tchap.incubateur.net"; // TODO : ensure that invitee exists in the environment
    const invitee2_display_name = "Testeur [Incubateur]";

    //login with agent_user
    await page.goto(ELEMENT_URL);
    await page.getByRole('link', { name: 'Se connecter' }).click();
    await page.getByRole('textbox', { name: 'Votre adresse mail' }).fill(agent_user.email);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('textbox', { name: 'Adresse mail' }).fill(agent_user.email);
    await page.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill(agent_user.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.getByRole('button', { name: 'Ignorer la vérification pour' }).click();
    await page.getByRole('button', { name: 'Je ferai la vérification plus' }).click();
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });

    const room_name = "Salon privé";

    //creer salon privé
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByText('Nouveau salon').click();
    await page.getByRole('textbox', { name: 'Nom' }).fill(room_name);
    await page.getByRole('button', { name: 'Créer un nouveau salon' }).click();
    
    //vérfier les parametres du salon privé
    await page.locator('button').filter({ hasText: room_name }).click();
    await page.getByRole('menuitem', { name: 'Paramètres' }).click();
    await page.getByText('Vie privée').click();
    //expect(await page.getByRole('switch', { name: 'Chiffré' })).toBeDisabled();
    await page.getByRole('button', { name: 'Fermer la boîte de dialogue' }).click();

    //inviter agents by name
    await page.getByRole('button', { name: 'Personnes' }).click();
    await page.getByRole('button', { name: 'Inviter', exact: true }).click();
    await page.getByRole('textbox', { name: 'Rechercher' }).fill(invitee1_search_name);
    await page.getByText(invitee1_display_name).first().click();
    await page.getByRole('button', { name: 'Inviter' }).click();
    await expect(page.getByTestId('virtuoso-item-list').getByText(invitee1_display_name)).toBeVisible();

    //inviter agents by email    
    await page.getByRole('button', { name: 'Inviter dans ce salon' }).click();
    await page.getByRole('textbox', { name: 'Rechercher' }).fill(invitee2_email);
    await page.getByRole('button', { name: 'Inviter' }).click();
    await expect(page.getByTestId('virtuoso-item-list').getByText(invitee2_display_name)).toBeVisible();

    //envoyer fichier png
    await page
          .locator(".mx_MessageComposer_actions input[type='file']")
          .setInputFiles(path.join(__dirname, "../../sample-files/element.png"));

    await page.getByRole("button", { name: "Envoyer" }).click()
    await page.getByRole('link', { name: 'element.png' }).click();
    await page.getByRole('button', { name: 'Fermer' }).click();

    //envoyer fichier vérolé
    await page
      .locator(".mx_MessageComposer_actions input[type='file']")
      .setInputFiles(path.join(__dirname, "../../sample-files/eicar.com"));
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await page.getByRole('listitem').filter({ hasText: /^Contenu bloqué$/ })

    await page.close();
  })

  test('register external user', async ({context, screenChecker, browser,  startTchapRegisterWithEmail, page }) => {
    

    //login with agent_user
    await page.goto(ELEMENT_URL);
    await page.getByRole('link', { name: 'Se connecter' }).click();
    await page.getByRole('textbox', { name: 'Votre adresse mail' }).fill(agent_user.email);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('textbox', { name: 'Adresse mail' }).fill(agent_user.email);
    await page.getByRole('textbox', { name: 'Mot de passe', exact: true }).fill(agent_user.password);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await page.getByRole('button', { name: 'Ignorer la vérification pour' }).click();
    await page.getByRole('button', { name: 'Je ferai la vérification plus' }).click();
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });

    await page.getByRole('button', { name: 'OK' }).click();
    await page.getByRole('button', { name: 'Ignorer' }).click();//notifications
    await page.getByRole('button', { name: 'OK' }).click();
   
    //creer salon privé ouvert aux externes
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByText('Nouveau salon').click();
    await page.getByLabel('Créer un salon').click();
    await page.getByRole('radio', { name: 'Salon ouvert aux externes' });
    await page.getByRole('textbox', { name: 'Nom' }).fill('Salon ouvert aux externes');
    await page.getByRole('button', { name: 'Créer un nouveau salon' }).click();

    //inviter agent externe
    await page.getByRole('button', { name: 'Personnes' }).click();
    await page.getByRole('button', { name: 'Inviter dans ce salon' }).click();
    await page.getByRole('textbox', { name: 'Rechercher' }).fill(external_user.email);
    await page.getByRole('button', { name: 'Inviter' }).click();
    //await expect(page.getByTestId('virtuoso-item-list').getByText(external_user.username)).toBeVisible();

    const context2  = await browser.newContext();
    const page_ext = await context2.newPage();
  
    //invitation takes time to be available
    const {message, content} = await waitForMessage(external_user.email , 20000, "Invitation");

    //register user on ext01 (with MAS)
    await startTchapRegisterWithEmail(page_ext, external_user.email);

    await expect(page_ext.locator('input[name="email"]')).toHaveValue(external_user.email);
    
    await page_ext.locator('input[name="password"]').fill(external_user.password);
    await page_ext.locator('input[name="password_confirm"]').fill(external_user.password);

    //wait for password-confirm matching confirmation
    await page_ext.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field    
    await expect(page_ext.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click({clickCount:2}); //2 clicks works better than one

    let verificationCode  = await getLatestVerificationCode(external_user.email);
    await page_ext.locator('input[name="code"]').fill(verificationCode);
    await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();

    //await screen(page, '#/home'); does not work with waitFor "networkidle"
    //await expect(page.locator('h1').filter({ hasText: /Bienvenue.*\[Tchapgouv\]/ })).toBeVisible({ timeout: 20000 });
    await page_ext.waitForSelector(".mx_MatrixChat", { timeout: 20000 });

    //rejoindre le salon
    await page_ext.locator('div').filter({ hasText: /^Salon ouvert aux externes$/ }).first().click();
    await page_ext.getByRole('button', { name: 'Accepter' }).click();
    expect(await page_ext.getByText('a créé ce salon. C’est le début de')).toBeVisible();

    //ne peut pas créer de salon
    await page_ext.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page_ext.getByText('Nouveau salon').click();
    await page_ext.getByRole('textbox', { name: 'Nom' }).fill('test');
    await page_ext.getByRole('button', { name: 'Créer un nouveau salon' }).click();
    expect(await page_ext.getByText('En tant qu\'invité externe,')).toBeVisible();
    await page_ext.getByRole('button', { name: 'OK' }).click();

    await page_ext.close();

    //TODO : ne peut pas utiliser l'annuaire
    //TODO : ne peut pas accéder aux salons publics
  });






})