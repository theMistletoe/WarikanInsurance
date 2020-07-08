pragma solidity >=0.4.21 <0.7.0;
import "./provableAPI_0.5.sol";
import "./AddressMapper.sol";

contract WarikanInsurance is usingProvable {

    address payable public assessor = address(0);
    address[] private participants;
    mapping(address => bool) approvalList;
    uint256 public depositTotalAmount = 0;
    address public refundTarget = address(0);

    address public addressMapper;
    bool public hasBeenAcceptedByAssessor = false;

    event Deposited(address indexed _depositor, uint _depositedValue);
    event Challenged(address _challenger);
    event Required(string _insuranceContract, address requirer);

    event LogNewProvableQuery(string description);
    event LogResult(string result);

    constructor(address _addressMapper) public {
        addressMapper = _addressMapper;
        // ここmsg.senderがFactoryになったわ
        // joinToInsurance();
    }

    modifier onlyRefundTarget {
        require(msg.sender == refundTarget);
        _;
    }

    function joinToInsurance() public {
        participants.push(msg.sender);
        approvalList[msg.sender] = false;
    }

    function getParticipants() public view returns (address[] memory) {
        uint participantsNumber = participants.length;
        address[] memory _tempArray = new address[](participantsNumber);
        _tempArray = participants;
        return _tempArray;
    }

    function poolDeposit() external payable {
        depositTotalAmount += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function getPooledDeposit() public view returns (uint) {
        uint balance = address(this).balance;
        return balance;
    }

    function challengeRefund() external {
        require (refundTarget == address(0));
        refundTarget = msg.sender;
        approveChallenge();
        emit Challenged(msg.sender);
    }

    function approveChallenge() public {
        require (refundTarget != address(0));
        approvalList[msg.sender] = true;
    }

    function hasBeenBuiltConsensus() public view returns (bool) {
        if (hasBeenAcceptedByAssessor) return true;
        
        for(uint i = 0; i < participants.length; i++) {
            if(approvalList[participants[i]]== false) {
                return false;
            }
        }
        return true;
    }

    function withdraw() external {
        require (refundTarget != address(0));
        require (refundTarget == msg.sender);
        require(hasBeenBuiltConsensus());

        uint256 refundAmount = depositTotalAmount;
        depositTotalAmount = 0;

        if (assessor == address(0)) {
            msg.sender.transfer(refundAmount);
        } else {
            assessor.transfer(calcRewardAmount(refundAmount));
            msg.sender.transfer(refundAmount - calcRewardAmount(refundAmount));
        }
    }

    function requireAssessment() public onlyRefundTarget {
        // catched by monitoring server.
        emit Required(addressToString(address(this)), msg.sender);
    }

    function __callback(bytes32 myid, string memory result) public {
        if (msg.sender != provable_cbAddress()) revert();

        bytes memory tempEmptyStringTest = bytes(result); // Uses memory
        if (tempEmptyStringTest.length == 0) {
            revert();
        } else {
            setAssessor(AddressMapper(addressMapper).getAddress(result));
            acceptedByAssessor();
            emit LogResult(result);
        }
    }

    function fetchAssessmentResult() public payable {
        if (provable_getPrice("computation") > address(this).balance) {
            emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee");
        } else {
            emit LogNewProvableQuery("Provable query was sent, standing by for the answer...");
            // TODO change endpoint to consortium node
            provable_query("URL", "json(https://raw.githubusercontent.com/theMistletoe/sample-json-api/master/first).data.assessor");
        }
    }

    function fetchAssessmentResult_() public payable {
        if (provable_getPrice("computation") > address(this).balance) {
            emit LogNewProvableQuery("Provable query was NOT sent, please add some ETH to cover for the query fee");
        } else {
            emit LogNewProvableQuery("Provable query was sent, standing by for the answer...");
            // TODO change endpoint to consortium node
            provable_query("URL", 'json(http://ec2-34-233-208-74.compute-1.amazonaws.com:5000/query).assessor', strConnect('{"insuranceAddress": "', addressToString(address(this)), '"}'));
        }
    }

    function setAssessor(address payable _assessor) internal {
        assessor = _assessor;
    }

    function acceptedByAssessor() internal {
        hasBeenAcceptedByAssessor = true;
    }

    function calcRewardAmount(uint256 _totalAmount) internal pure returns (uint256) {
        return _totalAmount / 10;
    }

    function strConnect(string memory _str1, string memory _str2, string memory _str3) private pure returns (string memory) {

        // string memory str1 = "abc";
        // string memory str2 = "def";
        bytes memory strbyte1 = bytes(_str1);
        bytes memory strbyte2 = bytes(_str2);
        bytes memory strbyte3 = bytes(_str3);

        bytes memory str = new bytes(strbyte1.length + strbyte2.length + strbyte3.length);

        uint8 point = 0;

        for(uint8 j = 0; j < strbyte1.length;j++){
            str[point] = strbyte1[j];
            point++;
        }
        for(uint8 k = 0; k < strbyte2.length;k++){
            str[point] = strbyte2[k];
            point++;
        }
        for(uint8 j = 0; j < strbyte3.length;j++){
            str[point] = strbyte3[j];
            point++;
        }
        return string(str);
    }

    function addressToString(address _addr) public pure returns(string memory) {
        bytes32 value = bytes32(uint256(_addr));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}