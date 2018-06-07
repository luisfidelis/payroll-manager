pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract Token is StandardToken {
    
    string public name = "SomeToken";
    string public symbol = "SYMBOL";
    uint public decimals;
    uint public INITIAL_SUPPLY;

} 