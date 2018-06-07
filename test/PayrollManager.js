
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

contract("PayrollManager", async accounts => {

    before( async () => {

        owner = accounts[0]
        employee_1.account = accounts[1]
        employee_2.account = accounts[2]
        employee_3.account = accounts[3]
        oracle = accounts[4]

        eurToken = await EURToken.new({ from: owner })
        payroll = await PayrollManager.new(eurToken.address, oracle, { from: owner })

    })

    context('Add employee', () => {
        
        it("should only allow add a new employee by the owner", async () => {
            await payroll.addEmployee(
                employee_1.account,
                [],
                employee_1.yearlyEURSalary,
                { from: employee_1.account }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should deny a new employee with an invalid address", async () => {
            await payroll.addEmployee(
                "0x0",
                [],
                employee_1.yearlyEURSalary,
                { from: owner }
            ).should.be.rejectedWith("VM Exception")
        })

        it("should add a new employee", async () => {
            const { logs } = await payroll.addEmployee(
                employee_1.account,
                [],
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
            employeesAdded++
        })

        it("should deny add an employee with an existing account", async () => {
            await payroll.addEmployee(
                employee_1.account,
                [],
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
            assert.equal(employee[4].toNumber(), 0, "The employee shouldn't have allocation time lock" )
        })

    })

    context('Change employee salary', () => {
        
        it("should only allow update employee's salary by the owner", async () => {
            await payroll.setEmployeeSalary(
                employee_2.account,
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
                [],
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
                [],
                employee_2.yearlyEURSalary,
                { from: owner }
            )
            let event = logs.find(e => e.event === "LogEmployeeAdded")
            employee_2.id = event.args.employeeId

            const transaction = await payroll.addEmployee(
                employee_3.account,
                [],
                employee_3.yearlyEURSalary,
                { from: owner }
            )
            event = transaction.logs.find(e => e.event === "LogEmployeeAdded")
            employee_3.id = event.args.employeeId

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



})
