var DexTradingWithCollection = artifacts.require("./DexTradingWithCollection.sol");
var beneficiary = '0x5AEacDAaEc7C52e11799eFC756E6B89Cb3a32C3B';
var dexag = '0xE3f5EA1e1212E02039Ec2dF87e567Ba1c79f3A03';
var basisPoints = 250;

module.exports = function(deployer) {
  deployer.deploy(DexTradingWithCollection, beneficiary, dexag, basisPoints);
};