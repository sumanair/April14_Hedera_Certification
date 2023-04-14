const {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  AccountId,
  PrivateKey,
} = require("@hashgraph/sdk");
require("dotenv").config();

//Grab your Hedera testnet account ID and private key from your .env file

const { ACCOUNT1_ID, ACCOUNT1_PRIVATE_KEY } = process.env;

//Main function
async function main() {
  // create a new topic to submit message
  console.log("\n ========== create a new topic to submit message ========== ");
  const topicId = await createTopic();
  console.log(`Topic id : ${topicId}`);

  //Creating a delay before subscribing
  console.log("\n ========== Creating a delay before subscribing ========== ");
  await new Promise((resolve) => setTimeout(resolve, 5000));
  console.log("5000 millseconds elapsed");

  //Subscribing to the topic
  console.log("\n ========== Subscribing to the topic ========== ");
  await subscribeTopic(topicId.toString());

  //Calculate current time
  console.log("\n ========== Calculate current time ========== ");
  const currentTime = new Date().toUTCString();
  console.log(`currentTime : ${currentTime}`);

  //Submitting message to the topic
  console.log("\n ========== Submitting message to the topic ========== ");
  await submitMsg(topicId, currentTime);

  process.exit();
}

//To create a topic and return the topic ID
async function createTopic() {
  try {
    const client = await getClient();

    //Create a new topic
    let txResponse = await new TopicCreateTransaction().execute(client);

    //Get the receipt of the transaction
    let receipt = await txResponse.getReceipt(client);

    console.log(`Topic ${receipt.topicId} created`);

    //Grab the new topic ID from the receipt
    return receipt.topicId;
  } catch (err) {
    console.log("Error in topic creation : " + err);
  }
}

//To subscribe a topic and console the incoming messages
async function subscribeTopic(topicId) {
  try {
    const client = await getClient();

    //Create the query to subscribe to a topic
    new TopicMessageQuery()
      .setTopicId(topicId)
      .setStartTime(0)
      .subscribe(client, null, (message) => {
        let messageAsString = Buffer.from(message.contents, "utf8").toString();
        console.log(
          `${message.consensusTimestamp.toDate()} Received: ${messageAsString}`
        );
      });
  } catch (err) {
    console.log("Error in subscribe topic : " + err);
  }
}

//To submit a message to the topic
async function submitMsg(topicId, message) {
  try {
    const client = await getClient();

    // Send one message
    const sendResponse = await new TopicMessageSubmitTransaction({
      topicId,
      message,
    }).execute(client);

    //Get the receipt of the transaction
    const getReceipt = await sendResponse.getReceipt(client);

    //Get the status of the transaction
    const transactionStatus = getReceipt.status;
    console.log(
      "The message transaction status: " + transactionStatus.toString()
    );

    return true;
  } catch (err) {
    console.log("Error in Submit Message : " + err);
  }
}

async function getClient() {
  // If we weren't able to grab it, we should throw a new error
  if (ACCOUNT1_ID == null || ACCOUNT1_PRIVATE_KEY == null ) {
    throw new Error(
      "Environment variables ACCOUNT1_ID and ACCOUNT1_PRIVATE_KEY must be present"
    );
  }

  // Create our connection to the Hedera network
  return Client.forTestnet().setOperator(
    AccountId.fromString(ACCOUNT1_ID),
    PrivateKey.fromString(ACCOUNT1_PRIVATE_KEY)
  );
}

main();
