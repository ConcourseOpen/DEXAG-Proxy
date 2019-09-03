var Trading = artifacts.require("./Trading.sol");
var beneficiary = '0x0000000000000000000000000000000000000000';
var proveq = '0x0000000000000000000000000000000000000000';
var fee = 0;

module.exports = function(deployer) {
  deployer.deploy(Trading, beneficiary, proveq, fee);
};