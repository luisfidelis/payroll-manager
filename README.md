# Payroll Manager

A simple payroll manager. 

#### NOTE: This repository is not intended to be used on mainnet. Be careful :)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Build Status](https://travis-ci.org/luisfidelis/payroll-manager.svg?branch=master)](https://travis-ci.org/luisfidelis/payroll-manager)

## Table of Contents

* [Contracts](#contracts)
* [Setup](#setup)
* [Limitations and possible features](#limitations-and-possible-features)

## Contracts

### [PayrollManager.sol](https://github.com/luisfidelis/payroll-manager/tree/master/contracts/payroll/PayrollManager.sol)

Owners can:
* Add or remove employees;
* Manage employees salaries;
* Check payroll burnrate;
  
Employees can:
* Allocate their salaries in allowed ERC20 tokens;
* Update account addresses;
* Withdraw salaries monthly;

### [EURToken.sol](https://github.com/luisfidelis/payroll-manager/tree/master/contracts/token/EURToken.sol)

Payroll base currency.

## Setup

Install [Node v8.9.1^](https://nodejs.org/en/download/releases/)

Install project dependencies:
```
$ npm install
```
Compile contracts:
```
$ npm run compile
```
Run migrations:
```
$ npm run migrate
```

The script ```scripts/test.sh``` creates a local network and calls Truffle's tests.

Type
```
$ npm test
```
for running tests.

[Truffle console](https://truffle.readthedocs.io/en/beta/getting_started/console/) can be used to interact with PayrollManager. For example:

```
$ truffle console --network dev
```

```
truffle(custom)> PayrollManager.deployed(); // ...
```

## Limitations and possible features

* Deal with Date/Time in Solidity is a way far from an optimized and precise solution. A trusty Oracle can be added to retrieve dates
and optimize employee's time locks treatment.

* The Oracle responsible for updating token exchange rates is just illustrative. Solutions such as Oraclize can be used for integrating 
the Smart Contract with a real-world API and fetch token rates correctly.

* Solidity tests will be necessary in the future, when considering functions with non-trivial returns. This is a limit of JavaScript
tests.

* The solution was built to distribute employee's salary in ERC20 Tokens: partially in EUR and other tokens,
completaly in EUR or in other tokens. The possibility for including ETHER in the distribution would be great.