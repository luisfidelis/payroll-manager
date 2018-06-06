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
    mapping(uint => Employee) private employees;
    mapping(address => uint) private accounts;
    uint public totalEmployees;

    /**
     * Types   
     */
    Struct Employee {
        address account;
        uint256 yearlyEURSalary;
        address[] allowedTokens;
        bool active;
    }
    
    /**
     * Events   
     */
    event LogEmployeeAdded(address accountAddress, uint employeeId, uint256 initialYearlyEURSalary);
    event LogEmployeeSalaryChanged(uint indexed employeeId, uint256 yearlyEURSalary);
    event LogEmployeeRemoved(uint employeeId);
    event LogFundsAdded(uint amount);
    event LogSalaryAllocationChanged(uint indexed employeeId, address[] tokens, uint256[] distribution);
    
    /**
     * Modifiers   
     */
    modifier onlyEmployee(){
        require(isEmployee(msg.sender), "The user isn't an employee");
        _;
    }

    modifier onlyActiveEmployee(uint employeeId){
        require(totalEmployees >= employeeId && employeeId > uint(0), "The employee doesn't exists");
        require(employees[employeeId].active, "The employee is inactive");
        _;
    } 

    /**
     * @dev Supply funds to the contract
     */ 
    function addFunds()
        onlyOwner
        payable
        external
    {   
        emit LogFundsAdded(msg.value);
    }

    
    /**
     * @dev Add an employee
     * @param account                   Account used for payment
     * @param allowedTokens             Tokens allowed for allocating the salary
     * @param initialYearlyEURSalary    Yearly EUR salary
     */ 
    function addEmployee(address account, address[] allowedTokens, uint256 initialYearlyEURSalary)
        onlyOwner
        external
    {   
        require(!isEmployee(account), "The account is already an employee");
        Employee employee = Employee(account, initialYearlyEURSalary, allowedTokens, true);
        totalEmployees = totalEmployees.sum(1);
        employees[totalEmployees] = employee;
        accounts[account] = totalEmployees;
        emit LogEmployeeAdded(account, totalEmployees, initialYearlyEURSalary);
    }

    /**
     * @dev Update employee's yearly EUR Salary
     * @param employeeId        Employee identifier/index
     * @param yearlyEURSalary   Yearly EUR salary
     */ 
    function setEmployeeSalary(uint employeeId, uint256 yearlyEURSalary)
        onlyOwner
        onlyActiveEmployee(employeeId)
        external
    {
        employees[employeeId].yearlyEURSalary = yearlyEURSalary;
        emit LogEmployeeSalaryChanged(employeeId, yearlyEURSalary);
    }

    /**
     * @dev Remove an active employee
     * @param employeeId  Employee identifier/index 
     */ 
    function removeEmployee(uint employeeId)
        onlyOwner
        onlyActiveEmployee(employeeId)
        external
    {   
        address account = employees[employeeId].account;
        delete accounts[account];
        delete employees[employeeId];
        emit LogEmployeeRemoved(employeeId);
    }

    /**
     * @dev Retrieves the number of active employees
     * @return Number of active employees
     */ 
    function getEmployeeCount() 
        onlyOwner
        view
        public  
        returns (uint activeOwners)
    {   
        for(uint index = 1; index <= totalEmployees; index++){
            if(employees[index].active){
                activeOwners++;
            }
        }
    }

    /**
     * @dev Retrieves employee's infos
     * @param employeeId  Employee identifier/index 
     */ 
    function getEmployee(uint256 employeeId) 
        onlyOwner
        onlyActiveEmployee(employeeId)
        view 
        public
        returns (address, uint256, address[])
    {
        Employee employee = employees[employeeId];
        return (employee.account, employee.yearlyEURSalary, employee.allowedTokens);
    } 

    /**
     * @dev Calculates Monthly EUR amount spent in salaries
     * @param employeeId  Employee identifier/index 
     */ 
    function calculatePayrollBurnrate() 
        onlyOwner
        view 
        returns (uint256 burnRate) 
    {
        for(uint index = 1; index <= totalEmployees; index++){
            if(employees[index].active){
                burnRate = burnRate.sum(employees[index].yearlyEURSalary.div(12));
            }
        }
    }
    
    

    /**
     * @dev Checks if an address matches an active employee
     * @param employeeId  Employee identifier/index 
     */ 
    function isEmployee(address employeeAccount) 
        view 
        internal
        returns(bool) 
    {
        return employees[accounts[employeeAccount]].active;
    }
}