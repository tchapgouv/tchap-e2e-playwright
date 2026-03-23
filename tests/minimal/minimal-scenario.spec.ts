
import { test, expect } from "../../fixtures/auth-fixture";
import { generateRoomName, generateTestUserData, openCreateAccountLegacyLink, openResetPasswordEmailLegacy,  } from "../../utils/auth-helpers";
import { ELEMENT_URL, INVITED_EMAIL_DOMAIN, STANDARD_EMAIL_DOMAIN, USE_MAS } from "../../utils/config";
import { getLatestVerificationCode, waitForMessage } from "../../utils/mailpit";
import path from "path";

//this scenario is one big test to cover all the scenario on a not MAS synapse (dev02 - a) and one MAS synapse (ext01 - e)





test.describe.serial("Minimal scenario", () => {
  
  test.setTimeout(180_000);

  const external_user = generateTestUserData(INVITED_EMAIL_DOMAIN);
  const agent_user = generateTestUserData(STANDARD_EMAIL_DOMAIN);
/*
 * tested:
 * creer compte agent 
 * creer salon privé
 * creer forum public
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
  
  

  test("test all", async ({
    page,    
    context,
    screenChecker,
    browser
  }) => {



    const invitee1_search_name = "olivier test1";// TODO : ensure that invitee exists in the environment
    const invitee1_display_name = "Olivier Test1";// TODO : ensure that invitee exists in the environment

    const invitee2_email = "testeur@agent2.tchap.incubateur.net"; // TODO : ensure that invitee exists in the environment
    const invitee2_display_name = "Testeur [Incubateur]";// TODO : ensure that invitee exists in the environment

    const public_room_name = generateRoomName("Forum");
    const room_name = generateRoomName("Salon Privé_");

    // Grant clipboard permissions to browser context
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
 
    //creer compte agent without MAS
    if(!USE_MAS){
      console.log("do not use MAS")

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
    }else{
      console.log("use MAS")

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
      await page.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field    
      //await expect(page.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
      await page.getByRole('button').filter({ hasText: 'Continuer' }).click({clickCount:3}); //2 clicks works better than one

      await screenChecker(page, '/verify-email');
      let verificationCode  = await getLatestVerificationCode(agent_user.email);
      await page.locator('input[name="code"]').fill(verificationCode);
      await page.getByRole('button').filter({ hasText: 'Continuer' }).click();

      await screenChecker(page, '/consent');
      await page.getByRole('button').filter({ hasText: 'Continuer' }).click();
    }
      

    //await expect(page.locator('text=Bienvenue')).toBeVisible({timeout: 20000});
    await page.waitForSelector(".mx_MatrixChat", { timeout: 20000 });

    //configurer la sauvegarde
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
    const verificationCode = clipboardContent;

    //fill the recupration code from the clipboard content
    await page.getByRole('textbox', { name: 'Saisir le code de vérification' }).fill(verificationCode);
    await page.getByRole('button', { name: 'Terminer la configuration' }).click();
    await page.getByRole('button', { name: 'Terminé' }).click();
    await page.getByRole('button', { name: 'Fermer la boîte de dialogue' }).click();

    await screenChecker(page, "#/home")

    //await page.getByRole('button', { name: 'OK' }).click();
    //await page.getByRole('button', { name: 'OK' }).click();


    //creer salon public
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await page.getByRole("menuitem", { name: "Nouveau salon", exact: true }).click();
    const dialog = page.locator(".tc_TchapCreateRoomDialog");
    await page.getByRole('textbox', { name: 'Nom' }).fill(public_room_name);
    await dialog
      .locator(".tc_TchapRoomTypeSelector_RadioButton_title")
      .getByText("Forum")
      .click();
    await dialog.getByRole("button", { name: "Créer un nouveau salon" }).click();
    await expect(page.locator('button').filter({ hasText: public_room_name })).toBeVisible();
    
    //ecrire dans le salon public
    await page.locator('.mx_BasicMessageComposer')
      .getByRole('textbox')
      .fill('message non chiffré');
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByRole('status', { name: 'Votre message a été envoyé' })).toBeVisible();



    //chercher salon public
    /*
    bug in preprod
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await page.getByRole("menuitem", { name: "Rejoindre un forum", exact: true }).click();
    await page.getByRole('textbox', { name: 'Rechercher' }).fill(public_room_name);
    await expect(page.getByLabel('Suggestions').getByText(public_room_name)).toBeVisible();
    await page.getByRole('textbox', { name: 'Rechercher' }).press('Escape');
    */

    //creer salon privé
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page.getByText('Nouveau salon').click();
    await page.getByRole('textbox', { name: 'Nom' }).fill(room_name);
    await page.getByRole('button', { name: 'Créer un nouveau salon' }).click();

    //ecrire dans le salon privé
    await page.locator('.mx_BasicMessageComposer')
      .getByRole('textbox')
      .fill('message chiffré');
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByRole('status', { name: 'Votre message a été envoyé' })).toBeVisible();
    
    //vérfier les parametres du salon privé
    await page.locator('button').filter({ hasText: room_name }).click();
    await page.getByRole('menuitem', { name: 'Paramètres' }).click();
    await page.getByText('Vie privée').click();
    await expect(page.getByRole('switch', { name: 'Chiffré' })).toBeDisabled();
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

    //disconnect
    await page.getByRole('button', { name: 'Avatar' }).click();
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await page.locator('#mx_Dialog_Container').getByRole('button', { name: 'Se déconnecter' }).click();
    //reset passsword
    await page.getByRole('link', { name: 'Se connecter' }).click();
    await page.getByRole('textbox', { name: 'Votre adresse mail' }).fill(agent_user.email);
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Mot de passe oublié ?' }).click();
    await page.getByRole('textbox', { name: 'Adresse mail' }).fill(agent_user.email);
    await page.getByRole('button', { name: 'Envoyer le mail' }).click();

    await openResetPasswordEmailLegacy(context, screenChecker, agent_user.email);

    const new_password = agent_user.password + '4';
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('textbox', { name: 'Nouveau mot de passe', exact: true }).fill(new_password);
    await page.getByRole('textbox', { name: 'Confirmer le nouveau mot de' }).fill(new_password);
    await page.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();
    await page.getByRole('button', { name: 'Retourner à l’écran de' }).click();//back to login


    const context_ext  = await browser.newContext();
    const page_ext = await context_ext.newPage();
  
    //invitation takes time to be available
    const {message, content} = await waitForMessage(external_user.email , 20000, "Invitation");

    //register user on ext01 (with MAS)
    await page_ext.goto(`${ELEMENT_URL}/#/welcome`, { waitUntil: 'load' });
    await screenChecker(page_ext, '#/welcome');
    await page_ext.getByRole('link').filter({ hasText: 'Créer un compte' }).click();

    await screenChecker(page_ext, '#/email-precheck-sso');
    await page_ext.locator('input').fill(external_user.email);
    await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await screenChecker(page_ext, '/register');
    await page_ext.getByRole('button').filter({ hasText: 'Continuer avec mon adresse mail' }).click();

    await expect(page_ext.locator('input[name="email"]')).toHaveValue(external_user.email);
    
    await page_ext.locator('input[name="password"]').fill(external_user.password);
    await page_ext.locator('input[name="password_confirm"]').fill(external_user.password);

    //wait for password-confirm matching confirmation
    await page_ext.locator("body").click({ position: { x: 0, y: 0 } }); //unfocus field    
    await expect(page_ext.locator('span').filter({ hasText: 'Les mots de passe correspondent.' })).toBeVisible();
    await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click({clickCount:2}); //2 clicks works better than one

    const verificationCode2  = await getLatestVerificationCode(external_user.email);
    await page_ext.locator('input[name="code"]').fill(verificationCode2);
    await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();
    await page_ext.getByRole('button').filter({ hasText: 'Continuer' }).click();

    await page_ext.waitForSelector(".mx_MatrixChat", { timeout: 20000 });

    //rejoindre le salon
    await page_ext.locator('div').filter({ hasText: /^Salon ouvert aux externes$/ }).first().click();
    await page_ext.getByRole('button', { name: 'Accepter' }).click();
    await expect(await page_ext.getByText('a créé ce salon. C’est le début de')).toBeVisible();

    //ne peut pas créer de salon
    await page_ext.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page_ext.getByText('Nouveau salon').click();
    await page_ext.getByRole('textbox', { name: 'Nom' }).fill('test');
    await screenChecker(page_ext, '#/room')
    await page_ext.getByRole('button', { name: 'Créer un nouveau salon' }).click();
    await screenChecker(page_ext, '#/room')
    await expect(await page_ext.getByText('En tant qu\'invité externe,')).toBeVisible();
    await page_ext.getByRole('button', { name: 'OK' }).click();


    //ne peut pas trouver le salon public
    /*
    await page_ext.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await page_ext.getByRole('menuitem', { name: 'Rejoindre un forum', exact: true }).click();
    await page_ext.getByRole('textbox', { name: 'Rechercher' }).fill(public_room_name);
    await expect(page_ext.getByLabel('Suggestions').getByText(public_room_name)).toHaveCount(0);
    await page_ext.getByRole('textbox', { name: 'Rechercher' }).press('Escape');
    */
  })
})