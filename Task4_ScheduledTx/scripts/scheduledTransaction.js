const {
  Client,
  TransferTransaction,
  ScheduleDeleteTransaction,
  PrivateKey,
  ScheduleInfoQuery,
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  Hbar,
  AccountId,
  Timestamp,
} = require("@hashgraph/sdk");

require("dotenv").config();
const {
  CLIENT_ID,
  CLIENT_PRIVATE_KEY,
  ACCOUNT1_ID,
  ACCOUNT1_PRIVATE_KEY,
  ACCOUNT2_ID,
} = process.env;

async function main() {
  // Create a transfer schedule
  const scheduleId = await createScheduleTransfer();
  // Delete the schedule transaction before execution
  await deleteSchedule(scheduleId);
  // Schedule transaction info
  await getScheduleInfo(scheduleId);
  // Try and Execute the schedule transaction with signature
  await executeSchedule(scheduleId);
  process.exit();
}

async function createScheduleTransfer() {
  try {
    console.log(
      "\n============== create schedule transaction ==================="
    );
    let client = await getClient();
    // Create a transaction to schedule
    const transaction = new TransferTransaction()
      .addHbarTransfer(
        AccountId.fromString(ACCOUNT1_ID),
        Hbar.fromString("-2")
      )
      .addHbarTransfer(
        AccountId.fromString(ACCOUNT2_ID),
        Hbar.fromString("2")
      );
    console.log("Created a tranfer transaction without any signatures");

    // Schedule a transaction without signing the transfer
    const scheduleTransaction = new ScheduleCreateTransaction()
      .setScheduledTransaction(transaction)
      // Make each transaction unique
      .setScheduleMemo(
        `Scheduled Transaction From Account 1 to Account 2 on ${new Date().toISOString()}`
      )
      .setAdminKey(PrivateKey.fromString(CLIENT_PRIVATE_KEY))
      .freezeWith(client);
    console.log("Creating a schedule transaction for the transfer");

    // Sign the scheduled transaction
    const signTx = await scheduleTransaction.sign(
      PrivateKey.fromString(CLIENT_PRIVATE_KEY)
    );

    //Sign with the account 1 key and submit the transaction to a Hedera network
    const txResponse = await signTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the schedule ID
    const scheduleId = receipt.scheduleId;
    console.log(`Schedule transaction is created ${scheduleId}`);
    return scheduleId;
  } catch (err) {
    console.log("Error in create schedule transaction :" + err);
  }
}

async function deleteSchedule(scheduleId) {
  try {
    console.log(
      "\n============== Delete scheduled transaction ==================="
    );
    let client = await getClient();
    // Create a delete schedule transaction with schedule id
    const scheduleTransaction = new ScheduleDeleteTransaction({
      scheduleId,
    }).freezeWith(client);

    // Sign with the account 1 key and submit the delete transaction to a Hedera network
    const signTx = await scheduleTransaction.sign(
      PrivateKey.fromString(CLIENT_PRIVATE_KEY)
    );
    const txResponse = await signTx.execute(client);

    //Request the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the schedule ID
    console.log(
      `Schedule transaction  ${scheduleId} is deleted ${receipt.status}`
    );
  } catch (err) {
    console.log("Error in delete schedule transaction :" + err);
  }
}

async function getScheduleInfo(scheduleId) {
  try {
    console.log(
      "\n============== Get schedule transaction info ==================="
    );
    let client = await getClient();
    const info = await new ScheduleInfoQuery()
      .setScheduleId(scheduleId)
      .execute(client);
    console.log("Scheduled Transaction Details");
    console.log("ScheduleId :", scheduleId.toString());
    console.log("Memo : ", info.scheduleMemo);
    console.log(
      "Created by : ",
      new AccountId(info.creatorAccountId).toString()
    );
    console.log("Payed by : ", new AccountId(info.payerAccountId).toString());
    console.log(
      "Expiration time : ",
      new Timestamp(info.expirationTime).toDate()
    );
  } catch (err) {
    console.log("Error in retrieving schedule info :" + err);
  }
}

async function executeSchedule(scheduleId) {
  try {
    console.log(
      "\n==================== Execute Schedule Transaction ==========================="
    );
    let client = await getClient();
    // Get the schedule transaction
    const transaction = new ScheduleSignTransaction({
      scheduleId,
    }).freezeWith(client);
    // Sign the transaction with required key
    const signTx = await transaction.sign(
      PrivateKey.fromString(ACCOUNT1_PRIVATE_KEY)
    );
    const txResponse = await signTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    console.log(
      `Schedule Transaction ${scheduleId} status is ${receipt.status}`
    );
  } catch (error) {
    console.log(`Failed to execute transaction ${error.message}`);
  }
}

async function getClient() {
  // If we weren't able to grab it, we should throw a new error
  if (CLIENT_ID == null || CLIENT_PRIVATE_KEY == null) {
    throw new Error(
      "Environment variables CLIENT_ID and CLIENT_PRIVATE_KEY must be present"
    );
  }

  // Create our connection to the Hedera network
  return Client.forTestnet().setOperator(CLIENT_ID, CLIENT_PRIVATE_KEY);
}

main();
