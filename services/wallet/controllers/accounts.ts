import { HttpResponse } from "../lib/models/httpResponse";
import * as Joi from "joi";
import { SilaWallet } from "../lib/models/wallet";
import { BankAccount } from "../lib/models/bank";
import * as Bank from "../lib/controllers/sila";
import { parseAndValidate } from "../lib/handlers/bodyParser";

// POST Body format validator
const schema = Joi.object().keys({
  name: Joi.string().required(),
  mask: Joi.string().required(),
  institution: Joi.string().required(),
  type: Joi.string().required(),
  public_token: Joi.string().required()
});

async function link({
  body: bodyUnvalidated,
  requestContext: {
    authorizer: { principalId: userId }
  }
}) {
  try {
    // Parse and validate payload
    const body = parseAndValidate(bodyUnvalidated, schema);

    // Check to make sure that a SILA account has been created alreadyj
    const wallet: any = await SilaWallet.query().findOne({
      active: true,
      app_users_id: userId
    });

    // Attempt to link the account w/ SILA
    const publicToken = body.public_token;
    const handle = wallet.handle;
    const linkAccount = await Bank.linkAccount(handle, publicToken, body.name);
    if (!linkAccount || linkAccount.status != "SUCCESS") {
      console.log("Account link error: ", linkAccount);
      throw Error("Failed to link account");
    }
    // Untested
    var trx;
    try {
      trx = await SilaWallet.transaction.start(SilaWallet.knex());
      // Set all of the other bank accounts to not be the default
      await BankAccount.query(trx)
        .patch({ is_default: false } as any)
        .where({ sila_wallet_handle: handle });
      // Add the new bank account (will be default)
      await BankAccount.query(trx).insert({
        name: body.name,
        mask: body.mask,
        institution: body.institution,
        type: body.type,
        sila_wallet_handle: handle
      } as any);
      // Make sure the wallet now knows that bank linked is true
      await SilaWallet.query(trx)
        .patch({ bank_linked: true } as any)
        .where({ handle: handle });
      trx.commit();
    } catch (err) {
      trx.rollback();
      throw err;
    }

    return new HttpResponse(200);
  } catch (err) {
    console.log("Account link error: ", err);
    return new HttpResponse(400, err.message);
  }
}

async function get({
  requestContext: {
    authorizer: { principalId: userId }
  }
}) {
  try {
    const bankAccounts = await BankAccount.query()
      .select(["name", "mask", "institution", "type", "is_default"])
      .join(
        "sila_wallet",
        "sila_wallet.handle",
        "bank_account.sila_wallet_handle"
      )
      .where({ "sila_wallet.app_users_id": userId });

    return new HttpResponse(200, "", { accounts: bankAccounts });
  } catch (err) {
    console.log("Account retreive Error: ", err);
    return new HttpResponse(400, err.message);
  }
}

export { link, get };
