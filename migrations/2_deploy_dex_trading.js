var DexTrading = artifacts.require("./DexTrading.sol");

module.exports = function(deployer) {
  deployer.deploy(DexTrading);
};