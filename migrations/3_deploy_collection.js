var DexTradingWithCollection = artifacts.require("./DexTradingWithCollection.sol");
var beneficiary = '';
var dexag = '';
var basisPoints = 0;

module.exports = function(deployer) {
  deployer.deploy(DexTradingWithCollection, beneficiary, dexag, basisPoints);
};