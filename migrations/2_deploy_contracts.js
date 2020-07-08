// var SimpleStorage = artifacts.require("./SimpleStorage.sol");
var AddressMapper = artifacts.require("./AddressMapper.sol");
var InsuranceFactory = artifacts.require("./InsuranceFactory.sol");

module.exports = function(deployer) {
  // deployer.deploy(SimpleStorage);
  deployer.deploy(AddressMapper);
  deployer.deploy(InsuranceFactory);
};
