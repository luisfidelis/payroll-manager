pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ERC20/StandardToken.sol";

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
    mapping(address => uint256) private rates;
    uint public totalEmployees;
    address public eurToken;

    /**
     * Types   
     */
    Struct Employee {
        address account;
        uint256 yearlyEURSalary;
        address[] allowedTokens;
        address[] tokens;
        uint256[] distribution;
        uint256 paydayTimelock;
        uint256 allocationTimelock;
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
    event LogAccountChanged(uint indexed employeeId, address account);
    event LogSalaryWithdrawal(uint indexed employeeId, uint256 timestamp);
    
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
     * @param _eurToken Address of EUR Token
     */  
    constructor(address _eurToken) {
        eurToken = _eurToken;
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
        require(account != address(0), "The account is an invalid address");
        require(!isEmployee(account), "The account is already an employee");
        Employee employee = Employee(account, initialYearlyEURSalary, allowedTokens, now.add(30 days),,,true);
        totalEmployees = totalEmployees.add(1);
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
     * @return Amount spent 
     */ 
    function calculatePayrollBurnrate() 
        onlyOwner
        view 
        returns (uint256 burnRate) 
    {
        for(uint index = 1; index <= totalEmployees; index++){
            if(employees[index].active){
                burnRate = burnRate.add(employees[index].yearlyEURSalary);
            }
        }
        if(burnRate > 0){
            burnRate = burnRate.div(12);
        }
    }
    
    /**
     * @dev Calculates days until the contract can run out of funds
     * @return Days count
     */ 
    // function calculatePayrollRunway() 
    //     onlyOwner
    //     view 
    //     returns (uint256 runWay)
    // {

    // }

    /**
     * @dev Allocates salary in tokens
     * @param tokens          Token addresses
     * @param distribution    Distribution values. Value range: (0%) 0 ~ 10000 (100%)
     */ 
    function determineAllocation(address[] tokens, uint256[] distribution)
        onlyEmployee
        external
    {
        Employee employee = employees[accounts[msg.sender]];
        require(now.sub(employee.allocationTimelock) >= 0, "The employee is time locked for allocations"); 
        require(tokens.length == distribution.length, "Token list length doesn't matches distribution length");
        uint256 totalDistribution;
        for(uint index = 0; index < tokens.length; index++){
            require(isAllowed(tokens[index], employee.allowedTokens), "A token is not allowed");
            totalDistribution.add(distribution[index]);
        }
        require(totalDistribution <= 10000, "The distribution exceeds 100%");
        employee.tokens = tokens;
        employee.distribution = distribution;
        employee.allocationTimelock = now.add((1 year).div(2));
        emit LogSalaryAllocationChanged(accounts[msg.sender], tokens, distribution);
    }

    /**
     * @dev Withdraws employee salary
     */ 
    function payday()
        onlyEmployee
        external
    {
        Employee employee = employees[accounts[msg.sender]];
        require(now.sub(employee.paydayTimelock) >= 0, "The employee is time locked for withdrawal");
        employee.paydayTimelock = now.add(30 days);
        uint256 monthlySalary = employee.yearlyEURSalary.div(12); 
        uint256 distributed;
        for(uint index = 0; index < employee.tokens; index++){
            if(employee.distribution[index] != 0){
                address token = employee.tokens[index];
                require(rates[token] != 0, "Missing token rate");
                uint256 distribution = employee.distribution[index];
                StandardToken(token).transfer(msg.sender, rates[token].mul(monthlySalary.mul(distribution).div(10000)));
                distributed.add(employee.distribution[index]);
            }
        }
        if(distributed < 10000){
            StandardToken(eurToken).transfer(monthlySalary.mul((10000.sub(distributed)).div(10000));
        }
        emit LogSalaryWithdrawal(accounts[msg.sender], now);
    }

    /**
     * @dev Updates employee account
     * @param account New account address
     */ 
    function changeAccount(address account)
        onlyEmployee
        external
    {
        require(account != address(0), "The account is an invalid address");
        require(!isEmployee(account), "The account is already an employee");
        Employee employee = employees[accounts[msg.sender]];
        employee.account = account;
        accounts[account] = accounts[msg.sender];
        delete accounts[msg.sender];
        emit LogAccountChanged(accounts[account], account);
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

    
    /**
     * @dev Checks if an token is allowed
     * @param token         Token address
     * @param allowedTokens Allowed tokens
     * @return allowance
     */ 
    function isAllowed(address token, address[] allowedTokens) 
        pure 
        internal
        returns(bool) 
    {
        for(uint index = 0; index < allowedTokens; index++) {
            if(allowedTokens[index] == token){
                return true;
            }
        }
        return false;
    }

}