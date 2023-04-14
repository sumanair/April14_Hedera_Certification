const {
  Client,
  PrivateKey,
  AccountCreateTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  Hbar,
  KeyList,
} = require('@hashgraph/sdk');
require('dotenv').config();

//Grab your Hedera testnet account ID and private key from your .env file
const {
  CLIENT_ID,
  CLIENT_PRIVATE_KEY,
  ACCOUNT1_PRIVATE_KEY,
  ACCOUNT2_PRIVATE_KEY,
  ACCOUNT3_PRIVATE_KEY,
  ACCOUNT4_ID,
} = process.env;

const main = async () => {
  const client = await getClient();

  //Creating key objects and extracting public keys
  const key1 = PrivateKey.fromString(ACCOUNT1_PRIVATE_KEY).publicKey;
  const key2 = PrivateKey.fromString(ACCOUNT2_PRIVATE_KEY).publicKey;
  const key3 = PrivateKey.fromString(ACCOUNT3_PRIVATE_KEY).publicKey;

  //Creating array of multi sig account owners
  const keys = [key1, key2, key3];

  //Create a key list with 3 keys and require 2 signatures
  const keyList = new KeyList(keys, 2);

  //Create a multi signature account with 20 Hbar starting balance
  const multiSigAccountID = await createMultiSigAccount(keyList);

  //Logging initial balances
  await accountBalance(multiSigAccountID);
  await accountBalance(ACCOUNT4_ID);

  // Creating a Transaction to send 10 HBAR to ACCOUNT4_ID from MultiSig account
  const transaction = new TransferTransaction()
    .addHbarTransfer(multiSigAccountID, Hbar.fromString(`-10`))
    .addHbarTransfer(ACCOUNT4_ID, Hbar.fromString('10'))
    .freezeWith(client);

  //Signing the transaction with only ACCOUNT1_PRIVATE_KEY
  const singleSignedTxn = await transaction.sign(
    PrivateKey.fromString(ACCOUNT1_PRIVATE_KEY)
  );

  //Sign with the client operator key to pay for the transaction and submit to a Hedera network
  const txResponse = await singleSignedTxn.execute(client);

  //Trying to get the receipt of the transaction
  try {
    await txResponse.getReceipt(client);
  } catch (err) {
    //Logging the error
    console.error('\nThe transaction errored with message ' + err.status.toString());
    console.error('\nError:' + err.toString());
  }

  process.exit();
};

//To create client object
const getClient = async () => {
  // If we weren't able to grab it, we should throw a new error
  if (CLIENT_ID == null || CLIENT_PRIVATE_KEY == null) {
    throw new Error(
      'Environment variables CLIENT_ID and CLIENT_PRIVATE_KEY must be present'
    );
  }

  // Create our connection to the Hedera network
  return Client.forTestnet().setOperator(CLIENT_ID, CLIENT_PRIVATE_KEY);
};

const createMultiSigAccount = async (keys) => {
  const client = await getClient();
  const multiSigAccount = await new AccountCreateTransaction()
    .setKey(keys)
    .setInitialBalance(Hbar.fromString('20'))
    .execute(client);

  // Get the new account ID
  const getReceipt = await multiSigAccount.getReceipt(client);
  const multiSigAccountID = getReceipt.accountId;

  console.log('\nThe Multi Signature Account ID is: ' + multiSigAccountID);
  return multiSigAccountID;
};

const accountBalance = async (accountID) => {
  const client = await getClient();
  //Check the account's balance
  const getBalance = await new AccountBalanceQuery()
    .setAccountId(accountID)
    .execute(client);

  console.log(
    `\nBalance of ${accountID}: ` + getBalance.hbars.toTinybars() + ' tinybars.'
  );
};

main();
