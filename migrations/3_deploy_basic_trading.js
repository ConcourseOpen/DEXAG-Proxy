var BasicTrading = artifacts.require("./BasicTrading.sol");

module.exports = function(deployer) {
  deployer.deploy(BasicTrading);
};