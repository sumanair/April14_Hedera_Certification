const {
  Client,
  ContractExecuteTransaction,
  PrivateKey,
  ContractCreateFlow,
  ContractFunctionParameters,
  ContractDeleteTransaction,
} = require("@hashgraph/sdk");

require("dotenv").config();

const { hethers } = require("@hashgraph/hethers");
const abicoder = new hethers.utils.AbiCoder();

let contractCompiled = require("../build/contracts/CertificationC1.json");

const bytecode = contractCompiled.bytecode;

const { CLIENT_ID, CLIENT_PRIVATE_KEY, ACCOUNT1_ID } = process.env;

let contractId;

async function main() {
  try {
    await deployContract();
    await executeContract();
    await deleteContract();
    // to show error for contract not exist
    await executeContract();
    process.exit();
  } catch (err) {
    console.log("Error :" + err);
  }
}

async function deployContract() {
  try {
    console.log("============= Deploy contract ===============");

    let client = await getClient();
    const contractCreate = new ContractCreateFlow()
      .setGas(100000)
      .setBytecode(bytecode)
      .setAdminKey(PrivateKey.fromString(CLIENT_PRIVATE_KEY));

    //Sign the transaction with the client operator key and submit to a Hedera network
    const txResponse = contractCreate.execute(client);

    //Get the receipt of the transaction
    const receipt = (await txResponse).getReceipt(client);

    //Get the new contract ID
    contractId = (await receipt).contractId;

    console.log("The new contract ID is " + contractId);
  } catch (err) {}
}

async function executeContract() {
  try {
    let client = await getClient();
    console.log(
      "\n ================== Calling Function  to execute from contract ====================="
    );

    console.log("Contract Id: " + contractId);
    //Create the transaction to update the contract message
    
    const contractExecTx1 = new ContractExecuteTransaction()
      .setContractId(contractId) //Set the ID of the contract
      .setGas(100000) //Set the gas for the contract call
      .setFunction(
        "function1",
        new ContractFunctionParameters().addUint16(5).addUint16(6)
      );
    //Submit the transaction to a Hedera network and store the response
    const contractCallResult = await contractExecTx1.execute(client);

    const record = await contractCallResult.getRecord(client);

    const encodedResult1 =
      "0x" + record.contractFunctionResult.bytes.toString("hex");

    const result1 = abicoder.decode(["uint16"], encodedResult1);

    console.log("Function 1 Output :", result1[0]);
  } catch (err) {
    console.log("Error in execute transaction : " + err);
  }
}

async function deleteContract() {
  try {
    console.log(
      "\n=================  Calling Delete Contract ========================"
    );
    let client = await getClient();
    //Create the transaction
    const transaction = new ContractDeleteTransaction()
      .setContractId(contractId)
      .setTransferAccountId(ACCOUNT1_ID)
      .freezeWith(client);

    //Sign with the admin key on the contract
    const signTx = await transaction.sign(
      PrivateKey.fromString(CLIENT_PRIVATE_KEY)
    );

    //Sign the transaction with the client operator's private key and submit to a Hedera network
    const txResponse = await signTx.execute(client);

    //Get the receipt of the transaction
    const receipt = await txResponse.getReceipt(client);

    //Get the transaction consensus status
    const transactionStatus = receipt.status;

    console.log(
      "The Error contract transaction consensus status is " +
        transactionStatus.toString()
    );
  } catch (err) {
    console.log("Error in delete contract : " + err);
  }
}

//To create client object
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
