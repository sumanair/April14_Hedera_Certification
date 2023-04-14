const {
  TokenCreateTransaction,
  Client,
  TokenType,
  TokenSupplyType,
  AccountBalanceQuery,
  PrivateKey,
  Wallet,

  AccountId,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenInfoQuery,
  PublicKey,
  TokenGrantKycTransaction,
} = require("@hashgraph/sdk");

require("dotenv").config();

//Grab the Hedera testnet account ID and private key from your .env file
const {
  CLIENT_ID,
  CLIENT_PRIVATE_KEY,
  ACCOUNT1_ID,
  ACCOUNT1_PRIVATE_KEY,
  ACCOUNT2_ID,
  ACCOUNT2_PRIVATE_KEY,
  ACCOUNT3_ID,
  ACCOUNT3_PRIVATE_KEY,
} = process.env;

// Create Wallet instances for the accounts
const clientUser = new Wallet(CLIENT_ID, CLIENT_PRIVATE_KEY);

const supplyUser = new Wallet(ACCOUNT2_ID, ACCOUNT2_PRIVATE_KEY);

const adminUser = new Wallet(ACCOUNT1_ID, ACCOUNT1_PRIVATE_KEY);

const kycUser = new Wallet(ACCOUNT1_ID, ACCOUNT1_PRIVATE_KEY);

const treasuryUser = new Wallet(ACCOUNT2_ID, ACCOUNT2_PRIVATE_KEY);

let tokenId;


async function main() {
  //Token Creation
  console.log(`\n =========Token Creation =========`);
  const tokenId = await createToken(
    ACCOUNT1_PRIVATE_KEY,
    ACCOUNT2_PRIVATE_KEY
  );

  //Print Token Details
  console.log(`\n =========Token Details =========`);
  await tokenInfo(tokenId);

  //Token Association By Account3
  console.log(`\n =========Token Association =========`);
  await assocTokens(tokenId, ACCOUNT3_ID, ACCOUNT3_PRIVATE_KEY);

  //Token Transfer
  console.log(`\n =========Token Transfer Before Granting Kyc =========`);
  await transferToken(
    tokenId,
    ACCOUNT2_ID,
    ACCOUNT2_PRIVATE_KEY,
    ACCOUNT3_ID,
    1299
  );

  //Grant Kyc to Account 3
  console.log(`\n =========Granting Kyc =========`);
  await grantKyc(tokenId, ACCOUNT1_ID, ACCOUNT1_PRIVATE_KEY, ACCOUNT3_ID);

  //Token Transfer
  console.log(`\n =========Token Transfer After Granting Kyc =========`);
  await transferToken(
    tokenId,
    ACCOUNT2_ID,
    ACCOUNT2_PRIVATE_KEY,
    ACCOUNT3_ID,
    1299
  );

  process.exit();
}

const createToken = async (adminKey, treasuryKey) => {
  try {
    const client = await getClient();

    //Create the token creation transaction
    const transaction = new TokenCreateTransaction()
      .setTokenName("Token_KYC")
      .setTokenSymbol("TKYC")
      .setTokenType(TokenType.FungibleCommon)
      .setTreasuryAccountId(treasuryUser.accountId)
      .setSupplyType(TokenSupplyType.Finite)
      .setInitialSupply(100000)
      .setMaxSupply(100000)
      .setDecimals(2)
      .setAdminKey(adminUser.publicKey)
      .setSupplyKey(supplyUser.publicKey)
      .setKycKey(kycUser.publicKey)
      .freezeWith(client);

    //Sign the transaction : account 1 is admin and account 2 is treasury
    const signTxAdmin = await transaction.sign(PrivateKey.fromString(adminKey));

    const signTx = await signTxAdmin.sign(PrivateKey.fromString(treasuryKey));

    //Submit to a Hedera network
    const txResponse = await signTx.execute(client);

    //Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    console.log(`The token create transaction status is: ${receipt.status} \n`);

    //Get the token ID from the receipt
    tokenId = receipt.tokenId;

    console.log("The new token ID is " + tokenId + "\n");
    return tokenId;
  } catch (err) {
    console.log("Error in associate token :" + err);
  }
};

const assocTokens = async (tokenId, account, pvtKey) => {
  try {
    const client = await getClient();

    //Create the token associate transaction
    //and sign with the receiver private key of the token
    const associateBuyerTx = await new TokenAssociateTransaction()
      .setAccountId(account)
      .setTokenIds([tokenId])
      .freezeWith(client)
      .sign(PrivateKey.fromString(pvtKey));

    //Submit the transaction to a Hedera network
    const associateUserTxSubmit = await associateBuyerTx.execute(client);

    //Request the receipt of the transaction
    const associateUserRx = await associateUserTxSubmit.getReceipt(client);

    //Get the transaction consensus status
    console.log(
      `Token association with the other account: ${associateUserRx.status} \n`
    );
  } catch (err) {
    console.log("Error in associate token :" + err);
  }
};

const transferToken = async (
  tokenId,
  sender,
  senderPvtKey,
  receiver,
  amount
) => {
  const client = await getClient();

  //Create the transfer transaction
  try {
    const transaction = new TransferTransaction()
      .addTokenTransfer(tokenId, sender, -amount)
      .addTokenTransfer(tokenId, receiver, amount)
      .freezeWith(client);

    //Sign with the supply private key of the token
    const signTx = await transaction.sign(PrivateKey.fromString(senderPvtKey));

    //Submit the transaction to a Hedera network
    const txResponse = await signTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    const transactionStatus = receipt.status;
    console.log(
      "The transaction consensus status " + transactionStatus.toString()
    );
    console.log("The transaction Id " + txResponse.transactionId.toString());

    await queryBalance(sender, tokenId);
    await queryBalance(receiver, tokenId);
  } catch (err) {
    //Logging the error
    console.error(
      "\nThe transaction errored with message " + err.status.toString()
    );
    console.error("\nError:" + err.toString());
  }
};

async function grantKyc(tokenId, user, userPvtKey, anotherAccountId) {
  try {
    const client = await getClient();

    //Create the pause transaction
    const transaction = await new TokenGrantKycTransaction()
      .setAccountId(anotherAccountId)
      .setTokenId(tokenId)
      .freezeWith(client);

    //Sign with the supply private key of the token
    const signTx = await transaction.sign(PrivateKey.fromString(userPvtKey));

    //Submit the transaction to a Hedera network
    const txResponse = await signTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    const transactionStatus = receipt.status;

    console.log(
      "The grant Kyc transaction consensus status " +
        transactionStatus.toString()
    );
  } catch (err) {
    console.log("Error in grant KYC :" + err);
  }
}

async function tokenInfo(tokenId) {
  try {
    const client = await getClient();

    console.log(`Searching for the token ${tokenId}`);

    //Returns the info for the specified TOKEN_ID
    const ftInfos = await new TokenInfoQuery()
      .setTokenId(tokenId)
      .execute(client);

    console.log("The name of the token is: " + ftInfos.name);
    console.log("The symbol of the token is: " + ftInfos.symbol);
    console.log("The totalsupply of the token is: " + ftInfos.totalSupply);
    console.log(
      "Current owner: " + new AccountId(ftInfos.treasuryAccountId).toString()
    );
    console.log("Current admin: " + new PublicKey(ftInfos.adminKey).toString());
  } catch (err) {
    console.log("Error in getting token info :" + err);
  }
}

async function queryBalance(user, tokenId) {
  try {
    const client = await getClient();

    //Create the query
    const balanceQuery = new AccountBalanceQuery().setAccountId(user);

    //Sign with the client operator private key and submit to a Hedera network
    const tokenBalance = await balanceQuery.execute(client);

    console.log(
      `- Balance of account ${user}: ${tokenBalance.tokens._map.get(
        tokenId.toString()
      )} unit(s) of token ${tokenId}`
    );
  } catch (err) {
    console.log("Error in querying balance :" + err);
  }
}

//To create client object
async function getClient() {
  try {
    // If we weren't able to grab it, we should throw a new error
    if (CLIENT_ID == null || CLIENT_PRIVATE_KEY == null) {
      throw new Error(
        "Environment variables CLIENT_ID and CLIENT_PRIVATE_KEY must be present"
      );
    }

    // Create our connection to the Hedera network
    return Client.forTestnet().setOperator(CLIENT_ID, CLIENT_PRIVATE_KEY);
  } catch (err) {
    console.log("Error in getting client :" + err);
  }
}

main();
