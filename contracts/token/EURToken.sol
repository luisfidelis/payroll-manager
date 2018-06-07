pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract EURToken is StandardToken {
    
    string public name = "Euro";
    string public symbol = "EUR";
    uint public decimals = 18;
    uint public INITIAL_SUPPLY = 1000000000 * (10**decimals);

    constructor() public {
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
    }
} 