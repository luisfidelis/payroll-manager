pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Payroll Manager 
 * @dev Responsible for managing employees and their salaries 
 */
contract PayrollManager is Ownable {
    
    /**
     * Add safety checks for uint operations
     */
    using SafeMath for uint256;
    
    /**
     * Storage
     */
    mapping(address => uint256) private employeesId;

    uint256 public totalEmployees;

    address public token;

    Struct Employee {
        uint256 employeeId;
        uint256 yearlyEURSalary;

    }
    
    /**
     * Events   
     */
    event LogEmployeeAdded(address accountAddress, uint256 initialYearlyEURSalary);
    event LogEmployeeSalaryChanged(uint256 employeeId, uint256 yearlyEURSalary);
    event LogEmployeeRemoved(uint256 employeeId);
    event LogFundsAdded(uint256 amount);
    event LogSalaryAllocationChanged(uint256 employeeId, address[] tokens, uint256[] distribution);
    
    /**
     * Modifiers   
     */
    modifier onlyEmployee(){
        require(, "The user isn't an employee");
        _;
    }

    // /* OWNER ONLY */
    // function addEmployee(address accountAddress, address[] allowedTokens, uint256 initialYearlyEURSalary);
    // function setEmployeeSalary(uint256 employeeId, uint256 yearlyEURSalary);
    // function removeEmployee(uint256 employeeId);
 
    // function addFunds() payable;
    // function scapeHatch();
    // // function addTokenFunds()? // Use approveAndCall or ERC223 tokenFallback
 
    // function getEmployeeCount() constant returns (uint256);
    // function getEmployee(uint256 employeeId) constant returns (address employee); // Return all important info too
 
    // function calculatePayrollBurnrate() constant returns (uint256); // Monthly EUR amount spent in salaries
    // function calculatePayrollRunway() constant returns (uint256); // Days until the contract can run out of funds
 
    // /* EMPLOYEE ONLY */
    // function determineAllocation(address[] tokens, uint256[] distribution); // only callable once every 6 months
    // function payday(); // only callable once a month
 
    // /* ORACLE ONLY */
    // function setExchangeRate(address token, uint256 EURExchangeRate); // uses decimals from token
}