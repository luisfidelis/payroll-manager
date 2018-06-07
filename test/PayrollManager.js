
const BigNumber = web3.BigNumber
const should = require("chai")
    .use(require("chai-as-promised"))
    .should()
const expect = require("chai").expect
const eur = require("./helpers/ether")

// --- Handled contracts
const PayrollManager = artifacts.require("./payroll/PayrollManager.sol")
const EURToken = artifacts.require("./token/EURToken.sol")

// Contracts
let payroll = null
let eurToken = null
let oracle = null

// Agents
let owner = null
let employee_1 = { yearlyEURSalary : eur(120000) }
let employee_2 = { yearlyEURSalary : eur(240000) }
let employee_3 = { yearlyEURSalary : eur(320000) }

// useful variables
let employeesAdded = 0

let token_1 = { rate: 1 }
let token_2 = { rate: 2 }
let token_3 = { rate: 3 }

contract("PayrollManager", async accounts => {

    before( async () => {

        owner = accounts[0]
        employee_1.account = accounts[1]
        employee_2.account = accounts[2]
        employee_3.account = accounts[3]
        oracle = accounts[4]

        let token = await EURToken.new({ from: owner })
        token_1.address = token.address
        token = await EURToken.new({ from: owner })
        token_2.address = token.address
        token = await EURToken.new({ from: owner })
        token_3.address = token.address
        
        eurToken = await EURToken.new({ from: owner })
        payroll = await PayrollManager.new(eurToken.address, oracle, { from: owner })

    })

    context('Add employee', () => {
        
        it("should only allow add a new employee by the owner", async () => {
            await payroll.addEmployee(
                employee_1.account,
                [token_1.address],
                employee_1.yearlyEURSalary,
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny a new employee with an invalid address", async () => {
            await payroll.addEmployee(
                "0x0",
                [token_1.address],
                employee_1.yearlyEURSalary,
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should add a new employee", async () => {
            const { logs } = await payroll.addEmployee(
                employee_1.account,
                [token_1.address],
                employee_1.yearlyEURSalary,
                { from: owner }
            )
            const event = logs.find(e => e.event === "LogEmployeeAdded")
            const args = event.args
            expect(args).to.include.all.keys([ "accountAddress", "employeeId", "initialYearlyEURSalary" ])
            assert.equal(args.accountAddress, employee_1.account, "Employee's account must be registered")
            assert.equal(args.employeeId.toNumber(), 1, "The employee must be the first employee" )
            assert.equal(args.initialYearlyEURSalary.toNumber(), employee_1.yearlyEURSalary.toNumber(), "The yearly salary must be the expected")
            employee_1.id = args.employeeId
            employee_1.allowedTokens = [token_1.address]
            employeesAdded++
        })

        it("should deny add an employee with an existing account", async () => {
            await payroll.addEmployee(
                employee_1.account,
                [token_1.address],
                employee_1.yearlyEURSalary,
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

    })

    context('Retrieve employee', () => {
        
        it("should only allow retrieve employee by the owner", async () => {
            await payroll.getEmployee(
                employee_1.id,
                { from: employee_2.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny retrieve an invalid employee", async () => {
            await payroll.getEmployee(
                employeesAdded+1,
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should retrieve the employee", async () => {
            const employee = await payroll.getEmployee(
                employee_1.id,
                { from: owner }
            )
            expect(employee).to.have.length(7);
            assert.equal(employee[0], employee_1.account, "The retrieved employee must be the first employee") // account
            assert.equal(employee[1].toNumber(), employee_1.yearlyEURSalary.toNumber(), "The retrieved employee must be correct")
            assert.equal(employee[2][0], employee_1.allowedTokens[0], "The retrieved employee must be correct")
            assert.equal(employee[4].toNumber(), 0, "The employee shouldn't have allocation time lock" )
        })

    })

    context('Change employee salary', () => {
        
        it("should only allow update employee's salary by the owner", async () => {
            await payroll.setEmployeeSalary(
                employee_1.id,
                employee_1.yearlyEURSalary.times(2),
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny update an invalid employee", async () => {
            await payroll.setEmployeeSalary(
                employeesAdded+1,
                employee_1.yearlyEURSalary.times(2),
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should update employee's salary", async () => {
            const { logs } = await payroll.setEmployeeSalary(
                employee_1.id,
                employee_1.yearlyEURSalary.times(2),
                { from: owner }
            )
            const event = logs.find(e => e.event === "LogEmployeeSalaryChanged")
            const args = event.args
            expect(args).to.include.all.keys([ "employeeId", "yearlyEURSalary" ])
            assert.equal(args.employeeId.toNumber(), employee_1.id.toNumber(), "The first employee must be updated")
            assert.equal(args.yearlyEURSalary.toNumber(), employee_1.yearlyEURSalary.times(2).toNumber(), "The salary must be updated correctly" )
            employee_1.yearlyEURSalary = employee_1.yearlyEURSalary.times(2)
        })

    })

    context('Remove employee', () => {
        
        before( async () => {
            const { logs } = await payroll.addEmployee(
                employee_2.account,
                [token_1.address, token_2.address],
                employee_2.yearlyEURSalary,
                { from: owner }
            )
            const event = logs.find(e => e.event === "LogEmployeeAdded")
            employee_2.id = event.args.employeeId
            employeesAdded++;
        })

        it("should only allow remove employee by the owner", async () => {
            await payroll.removeEmployee(
                employee_2.id,
                { from: employee_2.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny remove an invalid employee", async () => {
            await payroll.removeEmployee(
                employeesAdded+1,
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should remove the employee", async () => {
            const { logs } = await payroll.removeEmployee(
                employee_2.id,
                { from: owner }
            )
            const event = logs.find(e => e.event === "LogEmployeeRemoved")
            const args = event.args
            expect(args).to.include.all.keys([ "employeeId" ])
            assert.equal(args.employeeId.toNumber(), employee_2.id.toNumber(), "The second employee must be removed")
            employee_2.id = null
        })

    })

    
    context('Retrieve payroll burn rate', () => {
        
        before( async () => {
            let { logs } = await payroll.addEmployee(
                employee_2.account,
                [token_1.address, token_2.address],
                employee_2.yearlyEURSalary,
                { from: owner }
            )
            let event = logs.find(e => e.event === "LogEmployeeAdded")
            employee_2.id = event.args.employeeId
            employee_2.allowedTokens = [token_1.address, token_2.address]

            const transaction = await payroll.addEmployee(
                employee_3.account,
                [token_1.address, token_2.address, token_3.address],
                employee_3.yearlyEURSalary,
                { from: owner }
            )
            event = transaction.logs.find(e => e.event === "LogEmployeeAdded")
            employee_3.id = event.args.employeeId
            employee_3.allowedTokens = [token_1.address, token_2.address, token_3.address]

            employeesAdded += 2;
        })

        it("should only allow calculate burn rate by the owner", async () => {
            await payroll.calculatePayrollBurnrate({
                from: employee_1.account 
            }).should.be.rejectedWith("VM Exception")
        })

        it("should calculate burn rate", async () => {
            const burnRate = await payroll.calculatePayrollBurnrate({ from: owner })
            const expectedBurnRate = employee_1.yearlyEURSalary.plus(employee_2.yearlyEURSalary.plus(employee_3.yearlyEURSalary)).div(12)
            assert.equal(burnRate.toNumber(), expectedBurnRate, "The burn rate must be calculated correctly") 
        })

    })

    context('Retrieve number of active owners', () => {
        
        it("should only allow retrieve employees count by the owner", async () => {
            await payroll.getEmployeeCount({
                from: employee_1.account 
            }).should.be.rejectedWith("VM Exception")
        })

        it("should retrieve the number of active employees", async () => {
            const count = await payroll.getEmployeeCount({ from: owner })
            assert.equal(count.toNumber(), 3, "The number of active employees must be correct") 
        })

    })

    context('Change employee account', () => {
        
        it("should deny change employee's account by non-employee", async () => {
            await payroll.changeAccount(
                accounts[5],
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny change employee's account with an invalid value", async () => {
            await payroll.changeAccount(
                "0x0",
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny change employee's account with a wallet beeing used", async () => {
            await payroll.changeAccount(
                employee_2.account,
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should change employee's account", async () => {
            const { logs } = await payroll.changeAccount(
                accounts[5],
                { from: employee_1.account }
            )
            const event = logs.find(e => e.event === "LogAccountChanged")
            const args = event.args
            expect(args).to.include.all.keys([ "employeeId", "account" ])
            assert.equal(args.employeeId.toNumber(), employee_1.id.toNumber(), "The first employee must be updated")
            assert.equal(args.account, accounts[5], "The account must be updated correctly" )
            employee_1.account = accounts[5]
        })

    })

    context('Allocate salary in tokens', () => {
        
        it("should deny allocate salary by non-employee", async () => {
            await payroll.determineAllocation(
                [token_1.address],
                [5000],
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny allocate salary in not allowed tokens", async () => {
            await payroll.determineAllocation(
                [token_2.address],
                [5000],
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny allocate salary in tokens without its values", async () => {
            await payroll.determineAllocation(
                [token_1.address],
                [],
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny surpass distribution over 100%", async () => {
            await payroll.determineAllocation(
                [token_1.address],
                [10001],
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should allocate salary in tokens", async () => {
            const { logs } = await payroll.determineAllocation(
                [token_1.address],
                [5000],
                { from: employee_1.account }
            )
            const event = logs.find(e => e.event === "LogSalaryAllocationChanged")
            const args = event.args
            expect(args).to.include.all.keys([ "employeeId", "tokens", "distribution", "timestamp" ])
            assert.equal(args.employeeId.toNumber(), employee_1.id.toNumber(), "The first employee must be updated")
            assert.equal(args.tokens, token_1.address, "The salary must be allocated correctly" )
            assert.equal(args.distribution, 5000, "The salary must be allocated correctly" )

            const employee = await payroll.getEmployee(
                employee_1.id,
                { from: owner }
            )
            const MONTH = await payroll.MONTH()
            const expectedTimelock = args.timestamp.plus(MONTH.times(6))
            assert.equal(employee[4].toNumber(), expectedTimelock.toNumber(), "The employee should have 6 months time lock" )

            employee_1.tokens = args.tokens
            employee_1.distribution = args.distribution
            employee_1.allocationTimelock = employee[4]
        })  
        
        it("should deny allocate salary before the time lock", async () => {
            await payroll.determineAllocation(
                [token_1.address],
                [6000],
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })
        
    })



})
