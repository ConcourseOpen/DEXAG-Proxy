var DexTradingWithCollection = artifacts.require("./DexTradingWithCollection.sol");
var beneficiary = '0x0000000000000000000000000000000000000000';
var dexag = '0x0000000000000000000000000000000000000000';
var basisPoints = 10;

module.exports = function(deployer) {
  deployer.deploy(DexTradingWithCollection, beneficiary, dexag, basisPoints);
};