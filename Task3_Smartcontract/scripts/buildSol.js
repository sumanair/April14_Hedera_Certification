const fs = require('fs');
const solc = require('solc');
const path = require("path");

const contractPath = path.resolve(__dirname, "../contracts/certificationC3.sol");

const contractSource = fs.readFileSync(contractPath, 'utf8');

const contractBuildPath = path.resolve(__dirname, "../build/contracts/CertificationC1.json");

const input = {
    language: 'Solidity',
    sources: {
        'certificationC3.sol': {
            content: contractSource,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
    },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    console.error(output.errors);
    process.exit(1);
}

//const contractName = Object.keys(output.contracts)[0];
//console.log(contractName);
const bytecode = JSON.stringify(output.contracts, null, 2);
console.log(bytecode);

fs.writeFileSync(contractBuildPath, bytecode);
