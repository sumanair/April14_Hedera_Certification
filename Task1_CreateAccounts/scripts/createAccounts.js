const {
    Client,
    PrivateKey,
    AccountCreateTransaction,
    AccountBalanceQuery,
    Hbar,
  } = require("@hashgraph/sdk");
  require("dotenv").config();
  
  //Grab the Hedera testnet account ID and private key from the .env file
  const myAccountId = process.env.CLIENT_ID;
  const myPrivateKey = process.env.CLIENT_PRIVATE_KEY;

  //Grab the number of accounts to be created from the .env file
  const noOfAccounts = process.env.NUM_OF_ACCOUNTS;

  // Account creation function
  async function createAccount(client, count) {
    //Create new keys
    const newAccountPrivateKey = PrivateKey.generateED25519();
    const newAccountPublicKey = newAccountPrivateKey.publicKey;
  
    //Create a new account with 200 HBar starting balance
    const newAccount = await new AccountCreateTransaction()
      .setKey(newAccountPublicKey)
      .setInitialBalance(new Hbar(200))
      .execute(client);
  
    // Get the new account ID
    const getReceipt = await newAccount.getReceipt(client);
    const newAccountId = getReceipt.accountId;
  
    console.log(`ACCOUNT${count}_ID=${newAccountId}`);
    console.log(`ACCOUNT${count}_PRIVATE_KEY=${newAccountPrivateKey}`);
    console.log(`ACCOUNT${count}_PUBLIC_KEY=${newAccountPublicKey}`);

    await accountBalance(newAccountId, client);
  
  }

  async function accountBalance(newAccountId, client) {
    try {
      const accountBalance = await new AccountBalanceQuery()
        .setAccountId(newAccountId)
        .execute(client);
      console.log(`Account ${newAccountId} balance = ${accountBalance.hbars.toTinybars()} tinybars`);
    } catch (error) {
      console.error(`Error fetching account balance for account ${newAccountId}:`, error.message);
    }
  }
  
  async function main() {
    
    // Check if myAccountId and myPrivateKey are valid
    if (!myAccountId || !myPrivateKey) {
      console.error("Invalid account ID or private key");
      process.exit(1);
    }

    // Create our connection to the Hedera network
    const client = Client.forTestnet();
  
    try {
      client.setOperator(myAccountId, myPrivateKey);
    } catch (error) {
      console.error("Error setting operator account:", error.message);
      process.exit(1);
    }
  
    // Creating the accounts
    console.log(`------ Creating ${noOfAccounts} accounts -----`)
    for (let i = 0; i < noOfAccounts; i++) {
      await createAccount(client, i + 1);
    }
  
    client.close();
    process.exit();
  }
  
  main();
  