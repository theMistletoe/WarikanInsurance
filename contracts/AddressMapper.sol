pragma solidity >=0.4.21 <0.7.0;

contract AddressMapper {

    mapping(string => address payable) addressMap;

    // TODO remove
    constructor() public {
        addressMap["Sumitomo Life"] = 0x017fd2dd0E8040dE1292395464887F0b92D7C851;
    }

    function getAddress(string calldata _key) external view returns (address payable) {
        return addressMap[_key];
    }

    function setAddressRelation(string calldata _key, address payable _value) external {
        addressMap[_key] = _value;
    }
}