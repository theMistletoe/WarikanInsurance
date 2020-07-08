pragma solidity >=0.4.21 <0.7.0;
import './WarikanInsurance.sol';

contract InsuranceFactory {

    address public owner;
    mapping(address => address) public insurances;

    address public addressMapper;

    event Created(
        address indexed creator,
        address insurance
    );

    constructor() public {
        owner = msg.sender;
    }

    function createInsurance() public {
        WarikanInsurance newInsurance = new WarikanInsurance(addressMapper);
        insurances[msg.sender] = address(newInsurance);
        emit Created(msg.sender, address(newInsurance));
    }

    // TODO set addressMapper
    function setAddressMapper(address _addressMapper) public {
        addressMapper = _addressMapper;
    }

}