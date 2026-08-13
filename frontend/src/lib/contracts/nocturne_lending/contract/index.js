import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.16.0');

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

class _ReserveParams_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))));
  }
  fromValue(value_0) {
    return {
      collateralFactor: _descriptor_0.fromValue(value_0),
      baseRate: _descriptor_0.fromValue(value_0),
      slope1: _descriptor_0.fromValue(value_0),
      slope2: _descriptor_0.fromValue(value_0),
      kink: _descriptor_0.fromValue(value_0),
      reserveFactor: _descriptor_0.fromValue(value_0),
      liquidationThreshold: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.collateralFactor).concat(_descriptor_0.toValue(value_0.baseRate).concat(_descriptor_0.toValue(value_0.slope1).concat(_descriptor_0.toValue(value_0.slope2).concat(_descriptor_0.toValue(value_0.kink).concat(_descriptor_0.toValue(value_0.reserveFactor).concat(_descriptor_0.toValue(value_0.liquidationThreshold)))))));
  }
}

const _descriptor_2 = new _ReserveParams_0();

const _descriptor_3 = __compactRuntime.CompactTypeBoolean;

const _descriptor_4 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_3.alignment().concat(_descriptor_4.alignment().concat(_descriptor_4.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_3.fromValue(value_0),
      left: _descriptor_4.fromValue(value_0),
      right: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_3.toValue(value_0.is_left).concat(_descriptor_4.toValue(value_0.left).concat(_descriptor_4.toValue(value_0.right)));
  }
}

const _descriptor_5 = new _Either_0();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_4.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_4.toValue(value_0.bytes);
  }
}

const _descriptor_6 = new _ContractAddress_0();

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.userSupplied) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named userSupplied');
    }
    if (typeof(witnesses_0.userBorrowed) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named userBorrowed');
    }
    if (typeof(witnesses_0.userLastSupplyIndex) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named userLastSupplyIndex');
    }
    if (typeof(witnesses_0.userLastBorrowIndex) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named userLastBorrowIndex');
    }
    if (typeof(witnesses_0.setUserPosition) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named setUserPosition');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      initialize: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`initialize: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const initialTimestamp_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('initialize',
                                     'argument 1 (as invoked from Typescript)',
                                     'nocturne_lending.compact line 37 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(initialTimestamp_0) === 'bigint' && initialTimestamp_0 >= 0n && initialTimestamp_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('initialize',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'nocturne_lending.compact line 37 char 1',
                                     'Uint<0..18446744073709551616>',
                                     initialTimestamp_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(initialTimestamp_0),
            alignment: _descriptor_1.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._initialize_0(context,
                                            partialProofData,
                                            initialTimestamp_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      verify_division(context, ...args_1) {
        return { result: pureCircuits.verify_division(...args_1), context };
      },
      compute_utilization(context, ...args_1) {
        return { result: pureCircuits.compute_utilization(...args_1), context };
      },
      compute_borrow_rate(context, ...args_1) {
        return { result: pureCircuits.compute_borrow_rate(...args_1), context };
      },
      compute_supply_rate(context, ...args_1) {
        return { result: pureCircuits.compute_supply_rate(...args_1), context };
      },
      rescale_balance(context, ...args_1) {
        return { result: pureCircuits.rescale_balance(...args_1), context };
      },
      accrue_interest: (...args_1) => {
        if (args_1.length !== 14) {
          throw new __compactRuntime.CompactError(`accrue_interest: expected 14 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const timeDelta_0 = args_1[1];
        const utilizationQuotient_0 = args_1[2];
        const utilizationRemainder_0 = args_1[3];
        const slope1Quotient_0 = args_1[4];
        const slope1Remainder_0 = args_1[5];
        const slope2Quotient_0 = args_1[6];
        const slope2Remainder_0 = args_1[7];
        const supplyRateQuotient_0 = args_1[8];
        const supplyRateRemainder_0 = args_1[9];
        const borrowIndexIncrementQuotient_0 = args_1[10];
        const borrowIndexIncrementRemainder_0 = args_1[11];
        const supplyIndexIncrementQuotient_0 = args_1[12];
        const supplyIndexIncrementRemainder_0 = args_1[13];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 1 (as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(timeDelta_0) === 'bigint' && timeDelta_0 >= 0n && timeDelta_0 <= 18446744073709551615n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..18446744073709551616>',
                                     timeDelta_0)
        }
        if (!(typeof(utilizationQuotient_0) === 'bigint' && utilizationQuotient_0 >= 0n && utilizationQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     utilizationQuotient_0)
        }
        if (!(typeof(utilizationRemainder_0) === 'bigint' && utilizationRemainder_0 >= 0n && utilizationRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     utilizationRemainder_0)
        }
        if (!(typeof(slope1Quotient_0) === 'bigint' && slope1Quotient_0 >= 0n && slope1Quotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 4 (argument 5 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     slope1Quotient_0)
        }
        if (!(typeof(slope1Remainder_0) === 'bigint' && slope1Remainder_0 >= 0n && slope1Remainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 5 (argument 6 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     slope1Remainder_0)
        }
        if (!(typeof(slope2Quotient_0) === 'bigint' && slope2Quotient_0 >= 0n && slope2Quotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 6 (argument 7 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     slope2Quotient_0)
        }
        if (!(typeof(slope2Remainder_0) === 'bigint' && slope2Remainder_0 >= 0n && slope2Remainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 7 (argument 8 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     slope2Remainder_0)
        }
        if (!(typeof(supplyRateQuotient_0) === 'bigint' && supplyRateQuotient_0 >= 0n && supplyRateQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 8 (argument 9 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     supplyRateQuotient_0)
        }
        if (!(typeof(supplyRateRemainder_0) === 'bigint' && supplyRateRemainder_0 >= 0n && supplyRateRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 9 (argument 10 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     supplyRateRemainder_0)
        }
        if (!(typeof(borrowIndexIncrementQuotient_0) === 'bigint' && borrowIndexIncrementQuotient_0 >= 0n && borrowIndexIncrementQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 10 (argument 11 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     borrowIndexIncrementQuotient_0)
        }
        if (!(typeof(borrowIndexIncrementRemainder_0) === 'bigint' && borrowIndexIncrementRemainder_0 >= 0n && borrowIndexIncrementRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 11 (argument 12 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     borrowIndexIncrementRemainder_0)
        }
        if (!(typeof(supplyIndexIncrementQuotient_0) === 'bigint' && supplyIndexIncrementQuotient_0 >= 0n && supplyIndexIncrementQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 12 (argument 13 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     supplyIndexIncrementQuotient_0)
        }
        if (!(typeof(supplyIndexIncrementRemainder_0) === 'bigint' && supplyIndexIncrementRemainder_0 >= 0n && supplyIndexIncrementRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('accrue_interest',
                                     'argument 13 (argument 14 as invoked from Typescript)',
                                     'nocturne_lending.compact line 178 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     supplyIndexIncrementRemainder_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(timeDelta_0).concat(_descriptor_0.toValue(utilizationQuotient_0).concat(_descriptor_0.toValue(utilizationRemainder_0).concat(_descriptor_0.toValue(slope1Quotient_0).concat(_descriptor_0.toValue(slope1Remainder_0).concat(_descriptor_0.toValue(slope2Quotient_0).concat(_descriptor_0.toValue(slope2Remainder_0).concat(_descriptor_0.toValue(supplyRateQuotient_0).concat(_descriptor_0.toValue(supplyRateRemainder_0).concat(_descriptor_0.toValue(borrowIndexIncrementQuotient_0).concat(_descriptor_0.toValue(borrowIndexIncrementRemainder_0).concat(_descriptor_0.toValue(supplyIndexIncrementQuotient_0).concat(_descriptor_0.toValue(supplyIndexIncrementRemainder_0))))))))))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))))))))))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._accrue_interest_0(context,
                                                 partialProofData,
                                                 timeDelta_0,
                                                 utilizationQuotient_0,
                                                 utilizationRemainder_0,
                                                 slope1Quotient_0,
                                                 slope1Remainder_0,
                                                 slope2Quotient_0,
                                                 slope2Remainder_0,
                                                 supplyRateQuotient_0,
                                                 supplyRateRemainder_0,
                                                 borrowIndexIncrementQuotient_0,
                                                 borrowIndexIncrementRemainder_0,
                                                 supplyIndexIncrementQuotient_0,
                                                 supplyIndexIncrementRemainder_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      deposit: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`deposit: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const rescaleQuotient_0 = args_1[2];
        const rescaleRemainder_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('deposit',
                                     'argument 1 (as invoked from Typescript)',
                                     'nocturne_lending.compact line 235 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('deposit',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'nocturne_lending.compact line 235 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(rescaleQuotient_0) === 'bigint' && rescaleQuotient_0 >= 0n && rescaleQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('deposit',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'nocturne_lending.compact line 235 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleQuotient_0)
        }
        if (!(typeof(rescaleRemainder_0) === 'bigint' && rescaleRemainder_0 >= 0n && rescaleRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('deposit',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'nocturne_lending.compact line 235 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleRemainder_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0).concat(_descriptor_0.toValue(rescaleQuotient_0).concat(_descriptor_0.toValue(rescaleRemainder_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._deposit_0(context,
                                         partialProofData,
                                         amount_0,
                                         rescaleQuotient_0,
                                         rescaleRemainder_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      withdraw: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`withdraw: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const rescaleQuotient_0 = args_1[2];
        const rescaleRemainder_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('withdraw',
                                     'argument 1 (as invoked from Typescript)',
                                     'nocturne_lending.compact line 260 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'nocturne_lending.compact line 260 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(rescaleQuotient_0) === 'bigint' && rescaleQuotient_0 >= 0n && rescaleQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'nocturne_lending.compact line 260 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleQuotient_0)
        }
        if (!(typeof(rescaleRemainder_0) === 'bigint' && rescaleRemainder_0 >= 0n && rescaleRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('withdraw',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'nocturne_lending.compact line 260 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleRemainder_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0).concat(_descriptor_0.toValue(rescaleQuotient_0).concat(_descriptor_0.toValue(rescaleRemainder_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._withdraw_0(context,
                                          partialProofData,
                                          amount_0,
                                          rescaleQuotient_0,
                                          rescaleRemainder_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      borrow: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`borrow: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const rescaleQuotient_0 = args_1[2];
        const rescaleRemainder_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('borrow',
                                     'argument 1 (as invoked from Typescript)',
                                     'nocturne_lending.compact line 288 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('borrow',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'nocturne_lending.compact line 288 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(rescaleQuotient_0) === 'bigint' && rescaleQuotient_0 >= 0n && rescaleQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('borrow',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'nocturne_lending.compact line 288 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleQuotient_0)
        }
        if (!(typeof(rescaleRemainder_0) === 'bigint' && rescaleRemainder_0 >= 0n && rescaleRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('borrow',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'nocturne_lending.compact line 288 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleRemainder_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0).concat(_descriptor_0.toValue(rescaleQuotient_0).concat(_descriptor_0.toValue(rescaleRemainder_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._borrow_0(context,
                                        partialProofData,
                                        amount_0,
                                        rescaleQuotient_0,
                                        rescaleRemainder_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      repay: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`repay: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const amount_0 = args_1[1];
        const rescaleQuotient_0 = args_1[2];
        const rescaleRemainder_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('repay',
                                     'argument 1 (as invoked from Typescript)',
                                     'nocturne_lending.compact line 315 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(amount_0) === 'bigint' && amount_0 >= 0n && amount_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('repay',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'nocturne_lending.compact line 315 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     amount_0)
        }
        if (!(typeof(rescaleQuotient_0) === 'bigint' && rescaleQuotient_0 >= 0n && rescaleQuotient_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('repay',
                                     'argument 2 (argument 3 as invoked from Typescript)',
                                     'nocturne_lending.compact line 315 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleQuotient_0)
        }
        if (!(typeof(rescaleRemainder_0) === 'bigint' && rescaleRemainder_0 >= 0n && rescaleRemainder_0 <= 340282366920938463463374607431768211455n)) {
          __compactRuntime.typeError('repay',
                                     'argument 3 (argument 4 as invoked from Typescript)',
                                     'nocturne_lending.compact line 315 char 1',
                                     'Uint<0..340282366920938463463374607431768211456>',
                                     rescaleRemainder_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(amount_0).concat(_descriptor_0.toValue(rescaleQuotient_0).concat(_descriptor_0.toValue(rescaleRemainder_0))),
            alignment: _descriptor_0.alignment().concat(_descriptor_0.alignment().concat(_descriptor_0.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._repay_0(context,
                                       partialProofData,
                                       amount_0,
                                       rescaleQuotient_0,
                                       rescaleRemainder_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      }
    };
    this.impureCircuits = {
      initialize: this.circuits.initialize,
      accrue_interest: this.circuits.accrue_interest,
      deposit: this.circuits.deposit,
      withdraw: this.circuits.withdraw,
      borrow: this.circuits.borrow,
      repay: this.circuits.repay
    };
    this.provableCircuits = {
      initialize: this.circuits.initialize,
      accrue_interest: this.circuits.accrue_interest,
      deposit: this.circuits.deposit,
      withdraw: this.circuits.withdraw,
      borrow: this.circuits.borrow,
      repay: this.circuits.repay
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('initialize', new __compactRuntime.ContractOperation());
    state_0.setOperation('accrue_interest', new __compactRuntime.ContractOperation());
    state_0.setOperation('deposit', new __compactRuntime.ContractOperation());
    state_0.setOperation('withdraw', new __compactRuntime.ContractOperation());
    state_0.setOperation('borrow', new __compactRuntime.ContractOperation());
    state_0.setOperation('repay', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(1n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(2n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(3n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(4n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(5n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue({ collateralFactor: 0n, baseRate: 0n, slope1: 0n, slope2: 0n, kink: 0n, reserveFactor: 0n, liquidationThreshold: 0n }),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(6n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_4.toValue(new Uint8Array(32)),
                                                                                              alignment: _descriptor_4.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _initialize_0(context, partialProofData, initialTimestamp_0) {
    __compactRuntime.assert(this._equal_0(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_7.toValue(2n),
                                                                                                                                alignment: _descriptor_7.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          0n),
                            'pool already initialized');
    __compactRuntime.assert(this._equal_1(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                    partialProofData,
                                                                                                    [
                                                                                                     { dup: { n: 0 } },
                                                                                                     { idx: { cached: false,
                                                                                                              pushPath: false,
                                                                                                              path: [
                                                                                                                     { tag: 'value',
                                                                                                                       value: { value: _descriptor_7.toValue(3n),
                                                                                                                                alignment: _descriptor_7.alignment() } }] } },
                                                                                                     { popeq: { cached: false,
                                                                                                                result: undefined } }]).value),
                                          0n),
                            'pool already initialized');
    const tmp_0 = 1000000n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(2n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_1 = 1000000n;
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(3n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(4n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(initialTimestamp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_2 = { collateralFactor: 7500n,
                    baseRate: 100n,
                    slope1: 900n,
                    slope2: 4000n,
                    kink: 8000n,
                    reserveFactor: 1000n,
                    liquidationThreshold: 8000n };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(5n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(tmp_2),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _userSupplied_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.userSupplied(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('userSupplied',
                                 'return value',
                                 'nocturne_lending.compact line 69 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _userBorrowed_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.userBorrowed(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('userBorrowed',
                                 'return value',
                                 'nocturne_lending.compact line 71 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _userLastSupplyIndex_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.userLastSupplyIndex(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('userLastSupplyIndex',
                                 'return value',
                                 'nocturne_lending.compact line 73 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _userLastBorrowIndex_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.userLastBorrowIndex(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('userLastBorrowIndex',
                                 'return value',
                                 'nocturne_lending.compact line 75 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _setUserPosition_0(context,
                     partialProofData,
                     newSupplied_0,
                     newBorrowed_0,
                     newLastSupplyIndex_0,
                     newLastBorrowIndex_0)
  {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.setUserPosition(witnessContext_0,
                                                                          newSupplied_0,
                                                                          newBorrowed_0,
                                                                          newLastSupplyIndex_0,
                                                                          newLastBorrowIndex_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 0 )) {
      __compactRuntime.typeError('setUserPosition',
                                 'return value',
                                 'nocturne_lending.compact line 77 char 1',
                                 '[]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _verify_division_0(numerator_0, denominator_0, quotient_0, remainder_0) {
    __compactRuntime.assert(denominator_0 > 0n, 'denominator must be non-zero');
    const num_0 = numerator_0;
    const den_0 = denominator_0;
    const quo_0 = quotient_0;
    const rem_0 = remainder_0;
    __compactRuntime.assert(__compactRuntime.addField(__compactRuntime.mulField(quo_0,
                                                                                den_0),
                                                      rem_0)
                            ===
                            num_0,
                            'division check failed');
    __compactRuntime.assert(remainder_0 < denominator_0,
                            'remainder out of range');
    return true;
  }
  _compute_utilization_0(totalBorrowed_0,
                         totalSupplied_0,
                         utilizationQuotient_0,
                         utilizationRemainder_0)
  {
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    if (this._equal_2(totalSupplied_0, 0n)) {
      return 0n;
    } else {
      const numerator_0 = totalBorrowed_0 * 10000n;
      __compactRuntime.assert(numerator_0 <= MAX_UINT128_0,
                              'totalBorrowed * SCALE overflow');
      const numerator128_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('nocturne_lending.compact line 105 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(numerator_0);
      __compactRuntime.assert(this._verify_division_0(numerator128_0,
                                                      totalSupplied_0,
                                                      utilizationQuotient_0,
                                                      utilizationRemainder_0),
                              'utilization division check failed');
      return utilizationQuotient_0;
    }
  }
  _compute_borrow_rate_0(utilization_0,
                         params_0,
                         slope1Quotient_0,
                         slope1Remainder_0,
                         slope2Quotient_0,
                         slope2Remainder_0)
  {
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    const kink_0 = params_0.kink;
    const baseRate_0 = params_0.baseRate;
    const slope1_0 = params_0.slope1;
    const slope2_0 = params_0.slope2;
    if (utilization_0 <= kink_0) {
      const util16_0 = ((t1) => {
                         if (t1 > 65535n) {
                           throw new __compactRuntime.CompactError('nocturne_lending.compact line 118 char 34: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                         }
                         return t1;
                       })(utilization_0);
      const numerator_0 = util16_0 * slope1_0;
      __compactRuntime.assert(numerator_0 <= MAX_UINT128_0,
                              'slope1 numerator overflow');
      const numerator128_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('nocturne_lending.compact line 121 char 41: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(numerator_0);
      __compactRuntime.assert(this._verify_division_0(numerator128_0,
                                                      kink_0,
                                                      slope1Quotient_0,
                                                      slope1Remainder_0),
                              'slope1 division check failed');
      return ((t1) => {
               if (t1 > 340282366920938463463374607431768211455n) {
                 throw new __compactRuntime.CompactError('nocturne_lending.compact line 123 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
               }
               return t1;
             })(baseRate_0 + slope1Quotient_0);
    } else {
      const diff_0 = (__compactRuntime.assert(utilization_0 >= kink_0,
                                              'result of subtraction would be negative'),
                      utilization_0 - kink_0);
      const denominator_0 = (__compactRuntime.assert(10000n >= kink_0,
                                                     'result of subtraction would be negative'),
                             10000n - kink_0);
      const diff16_0 = ((t1) => {
                         if (t1 > 65535n) {
                           throw new __compactRuntime.CompactError('nocturne_lending.compact line 127 char 34: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                         }
                         return t1;
                       })(diff_0);
      const numerator_1 = diff16_0 * slope2_0;
      __compactRuntime.assert(numerator_1 <= MAX_UINT128_0,
                              'slope2 numerator overflow');
      const numerator128_1 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('nocturne_lending.compact line 130 char 41: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(numerator_1);
      __compactRuntime.assert(this._verify_division_0(numerator128_1,
                                                      denominator_0,
                                                      slope2Quotient_0,
                                                      slope2Remainder_0),
                              'slope2 division check failed');
      const partial_0 = ((t1) => {
                          if (t1 > 340282366920938463463374607431768211455n) {
                            throw new __compactRuntime.CompactError('nocturne_lending.compact line 132 char 36: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                          }
                          return t1;
                        })(baseRate_0 + slope1_0);
      return ((t1) => {
               if (t1 > 340282366920938463463374607431768211455n) {
                 throw new __compactRuntime.CompactError('nocturne_lending.compact line 133 char 16: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
               }
               return t1;
             })(partial_0 + slope2Quotient_0);
    }
  }
  _compute_supply_rate_0(borrowRate_0,
                         utilization_0,
                         reserveFactor_0,
                         quotient_0,
                         remainder_0)
  {
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    const br16_0 = ((t1) => {
                     if (t1 > 65535n) {
                       throw new __compactRuntime.CompactError('nocturne_lending.compact line 139 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                     }
                     return t1;
                   })(borrowRate_0);
    const util16_0 = ((t1) => {
                       if (t1 > 65535n) {
                         throw new __compactRuntime.CompactError('nocturne_lending.compact line 140 char 30: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                       }
                       return t1;
                     })(utilization_0);
    const term_0 = (__compactRuntime.assert(10000n >= reserveFactor_0,
                                            'result of subtraction would be negative'),
                    10000n - reserveFactor_0);
    const term16_0 = ((t1) => {
                       if (t1 > 65535n) {
                         throw new __compactRuntime.CompactError('nocturne_lending.compact line 142 char 30: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 65535');
                       }
                       return t1;
                     })(term_0);
    const numerator_0 = br16_0 * util16_0 * term16_0;
    __compactRuntime.assert(numerator_0 <= MAX_UINT128_0,
                            'supply rate numerator overflow');
    const numerator128_0 = ((t1) => {
                             if (t1 > 340282366920938463463374607431768211455n) {
                               throw new __compactRuntime.CompactError('nocturne_lending.compact line 145 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                             }
                             return t1;
                           })(numerator_0);
    __compactRuntime.assert(this._verify_division_0(numerator128_0,
                                                    10000n * 10000n,
                                                    quotient_0,
                                                    remainder_0),
                            'supply rate division check failed');
    return quotient_0;
  }
  _rescale_balance_0(stored_0,
                     currentIndex_0,
                     lastIndex_0,
                     quotient_0,
                     remainder_0)
  {
    if (this._equal_3(lastIndex_0, 0n)
        ||
        this._equal_4(lastIndex_0, currentIndex_0))
    {
      return stored_0;
    } else {
      const storedField_0 = stored_0;
      const currentIndexField_0 = currentIndex_0;
      const product_0 = __compactRuntime.mulField(storedField_0,
                                                  currentIndexField_0);
      const product128_0 = ((t1) => {
                             if (t1 > 340282366920938463463374607431768211455n) {
                               throw new __compactRuntime.CompactError('nocturne_lending.compact line 161 char 35: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                             }
                             return t1;
                           })(product_0);
      __compactRuntime.assert(this._verify_division_0(product128_0,
                                                      lastIndex_0,
                                                      quotient_0,
                                                      remainder_0),
                              'rescale division check failed');
      return quotient_0;
    }
  }
  _accrue_interest_0(context,
                     partialProofData,
                     timeDelta_0,
                     utilizationQuotient_0,
                     utilizationRemainder_0,
                     slope1Quotient_0,
                     slope1Remainder_0,
                     slope2Quotient_0,
                     slope2Remainder_0,
                     supplyRateQuotient_0,
                     supplyRateRemainder_0,
                     borrowIndexIncrementQuotient_0,
                     borrowIndexIncrementRemainder_0,
                     supplyIndexIncrementQuotient_0,
                     supplyIndexIncrementRemainder_0)
  {
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    const SECONDS_PER_YEAR_0 = 31536000n;
    const INDEX_SCALE_0 = ((t1) => {
                            if (t1 > 340282366920938463463374607431768211455n) {
                              throw new __compactRuntime.CompactError('nocturne_lending.compact line 189 char 34: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                            }
                            return t1;
                          })(10000n * SECONDS_PER_YEAR_0);
    const currentSupplyIndex_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                           partialProofData,
                                                                                           [
                                                                                            { dup: { n: 0 } },
                                                                                            { idx: { cached: false,
                                                                                                     pushPath: false,
                                                                                                     path: [
                                                                                                            { tag: 'value',
                                                                                                              value: { value: _descriptor_7.toValue(2n),
                                                                                                                       alignment: _descriptor_7.alignment() } }] } },
                                                                                            { popeq: { cached: false,
                                                                                                       result: undefined } }]).value);
    const currentBorrowIndex_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                           partialProofData,
                                                                                           [
                                                                                            { dup: { n: 0 } },
                                                                                            { idx: { cached: false,
                                                                                                     pushPath: false,
                                                                                                     path: [
                                                                                                            { tag: 'value',
                                                                                                              value: { value: _descriptor_7.toValue(3n),
                                                                                                                       alignment: _descriptor_7.alignment() } }] } },
                                                                                            { popeq: { cached: false,
                                                                                                       result: undefined } }]).value);
    const currentTotalSupplied_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_7.toValue(0n),
                                                                                                                         alignment: _descriptor_7.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value);
    const currentTotalBorrowed_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_7.toValue(1n),
                                                                                                                         alignment: _descriptor_7.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value);
    const params_0 = _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_7.toValue(5n),
                                                                                                           alignment: _descriptor_7.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value);
    const utilization_0 = this._compute_utilization_0(currentTotalBorrowed_0,
                                                      currentTotalSupplied_0,
                                                      utilizationQuotient_0,
                                                      utilizationRemainder_0);
    const borrowRate_0 = this._compute_borrow_rate_0(utilization_0,
                                                     params_0,
                                                     slope1Quotient_0,
                                                     slope1Remainder_0,
                                                     slope2Quotient_0,
                                                     slope2Remainder_0);
    const supplyRate_0 = this._compute_supply_rate_0(borrowRate_0,
                                                     utilization_0,
                                                     params_0.reserveFactor,
                                                     supplyRateQuotient_0,
                                                     supplyRateRemainder_0);
    const bi_0 = currentBorrowIndex_0;
    const br_0 = borrowRate_0;
    const td_0 = timeDelta_0;
    const borrowProduct_0 = __compactRuntime.mulField(__compactRuntime.mulField(bi_0,
                                                                                br_0),
                                                      td_0);
    const borrowProduct128_0 = ((t1) => {
                                 if (t1 > 340282366920938463463374607431768211455n) {
                                   throw new __compactRuntime.CompactError('nocturne_lending.compact line 206 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                                 }
                                 return t1;
                               })(borrowProduct_0);
    __compactRuntime.assert(this._verify_division_0(borrowProduct128_0,
                                                    INDEX_SCALE_0,
                                                    borrowIndexIncrementQuotient_0,
                                                    borrowIndexIncrementRemainder_0),
                            'borrow index accrual check failed');
    const newBorrowIndex_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('nocturne_lending.compact line 208 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(currentBorrowIndex_0
                                +
                                borrowIndexIncrementQuotient_0);
    __compactRuntime.assert(currentBorrowIndex_0
                            <=
                            (__compactRuntime.assert(MAX_UINT128_0
                                                     >=
                                                     borrowIndexIncrementQuotient_0,
                                                     'result of subtraction would be negative'),
                             MAX_UINT128_0 - borrowIndexIncrementQuotient_0),
                            'borrow index overflow');
    const si_0 = currentSupplyIndex_0;
    const sr_0 = supplyRate_0;
    const supplyProduct_0 = __compactRuntime.mulField(__compactRuntime.mulField(si_0,
                                                                                sr_0),
                                                      td_0);
    const supplyProduct128_0 = ((t1) => {
                                 if (t1 > 340282366920938463463374607431768211455n) {
                                   throw new __compactRuntime.CompactError('nocturne_lending.compact line 215 char 39: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                                 }
                                 return t1;
                               })(supplyProduct_0);
    __compactRuntime.assert(this._verify_division_0(supplyProduct128_0,
                                                    INDEX_SCALE_0,
                                                    supplyIndexIncrementQuotient_0,
                                                    supplyIndexIncrementRemainder_0),
                            'supply index accrual check failed');
    const newSupplyIndex_0 = ((t1) => {
                               if (t1 > 340282366920938463463374607431768211455n) {
                                 throw new __compactRuntime.CompactError('nocturne_lending.compact line 217 char 37: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                               }
                               return t1;
                             })(currentSupplyIndex_0
                                +
                                supplyIndexIncrementQuotient_0);
    __compactRuntime.assert(currentSupplyIndex_0
                            <=
                            (__compactRuntime.assert(MAX_UINT128_0
                                                     >=
                                                     supplyIndexIncrementQuotient_0,
                                                     'result of subtraction would be negative'),
                             MAX_UINT128_0 - supplyIndexIncrementQuotient_0),
                            'supply index overflow');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(2n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newSupplyIndex_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(3n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(newBorrowIndex_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    const tmp_0 = ((t1) => {
                    if (t1 > 18446744073709551615n) {
                      throw new __compactRuntime.CompactError('nocturne_lending.compact line 223 char 35: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 18446744073709551615');
                    }
                    return t1;
                  })(_descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_7.toValue(4n),
                                                                                                           alignment: _descriptor_7.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     timeDelta_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(4n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                                              alignment: _descriptor_1.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _deposit_0(context,
             partialProofData,
             amount_0,
             rescaleQuotient_0,
             rescaleRemainder_0)
  {
    __compactRuntime.assert(amount_0 > 0n,
                            'deposit amount must be greater than zero');
    const currentSupplyIndex_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                           partialProofData,
                                                                                           [
                                                                                            { dup: { n: 0 } },
                                                                                            { idx: { cached: false,
                                                                                                     pushPath: false,
                                                                                                     path: [
                                                                                                            { tag: 'value',
                                                                                                              value: { value: _descriptor_7.toValue(2n),
                                                                                                                       alignment: _descriptor_7.alignment() } }] } },
                                                                                            { popeq: { cached: false,
                                                                                                       result: undefined } }]).value);
    const currentSupplied_0 = this._userSupplied_0(context, partialProofData);
    const currentBorrowed_0 = this._userBorrowed_0(context, partialProofData);
    const lastSupplyIndex_0 = this._userLastSupplyIndex_0(context,
                                                          partialProofData);
    const effectiveSupplied_0 = this._rescale_balance_0(currentSupplied_0,
                                                        currentSupplyIndex_0,
                                                        lastSupplyIndex_0,
                                                        rescaleQuotient_0,
                                                        rescaleRemainder_0);
    const newSupplied_0 = ((t1) => {
                            if (t1 > 340282366920938463463374607431768211455n) {
                              throw new __compactRuntime.CompactError('nocturne_lending.compact line 244 char 34: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                            }
                            return t1;
                          })(effectiveSupplied_0 + amount_0);
    this._setUserPosition_0(context,
                            partialProofData,
                            newSupplied_0,
                            currentBorrowed_0,
                            currentSupplyIndex_0,
                            this._userLastBorrowIndex_0(context,
                                                        partialProofData));
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_7.toValue(0n),
                                                                                                                         alignment: _descriptor_7.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_0
                             <=
                             (__compactRuntime.assert(MAX_UINT128_0 >= amount_0,
                                                      'result of subtraction would be negative'),
                              MAX_UINT128_0 - amount_0)),
                            'totalSupplied overflow');
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('nocturne_lending.compact line 250 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_7.toValue(0n),
                                                                                                           alignment: _descriptor_7.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _withdraw_0(context,
              partialProofData,
              amount_0,
              rescaleQuotient_0,
              rescaleRemainder_0)
  {
    __compactRuntime.assert(amount_0 > 0n,
                            'withdrawal amount must be greater than zero');
    const currentSupplyIndex_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                           partialProofData,
                                                                                           [
                                                                                            { dup: { n: 0 } },
                                                                                            { idx: { cached: false,
                                                                                                     pushPath: false,
                                                                                                     path: [
                                                                                                            { tag: 'value',
                                                                                                              value: { value: _descriptor_7.toValue(2n),
                                                                                                                       alignment: _descriptor_7.alignment() } }] } },
                                                                                            { popeq: { cached: false,
                                                                                                       result: undefined } }]).value);
    const currentSupplied_0 = this._userSupplied_0(context, partialProofData);
    const currentBorrowed_0 = this._userBorrowed_0(context, partialProofData);
    const lastSupplyIndex_0 = this._userLastSupplyIndex_0(context,
                                                          partialProofData);
    __compactRuntime.assert(amount_0 <= currentSupplied_0,
                            'withdrawal amount exceeds user supplied balance');
    __compactRuntime.assert(amount_0
                            <=
                            _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_7.toValue(0n),
                                                                                                                  alignment: _descriptor_7.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'withdrawal amount exceeds total supplied liquidity');
    const effectiveSupplied_0 = this._rescale_balance_0(currentSupplied_0,
                                                        currentSupplyIndex_0,
                                                        lastSupplyIndex_0,
                                                        rescaleQuotient_0,
                                                        rescaleRemainder_0);
    const newSupplied_0 = (__compactRuntime.assert(effectiveSupplied_0
                                                   >=
                                                   amount_0,
                                                   'result of subtraction would be negative'),
                           effectiveSupplied_0 - amount_0);
    this._setUserPosition_0(context,
                            partialProofData,
                            newSupplied_0,
                            currentBorrowed_0,
                            currentSupplyIndex_0,
                            this._userLastBorrowIndex_0(context,
                                                        partialProofData));
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_7.toValue(0n),
                                                                                                                         alignment: _descriptor_7.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_0 >= amount_0),
                            'totalSupplied underflow');
    let t_1;
    const tmp_0 = (t_1 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                   partialProofData,
                                                                                   [
                                                                                    { dup: { n: 0 } },
                                                                                    { idx: { cached: false,
                                                                                             pushPath: false,
                                                                                             path: [
                                                                                                    { tag: 'value',
                                                                                                      value: { value: _descriptor_7.toValue(0n),
                                                                                                               alignment: _descriptor_7.alignment() } }] } },
                                                                                    { popeq: { cached: false,
                                                                                               result: undefined } }]).value),
                   (__compactRuntime.assert(t_1 >= amount_0,
                                            'result of subtraction would be negative'),
                    t_1 - amount_0));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _borrow_0(context,
            partialProofData,
            amount_0,
            rescaleQuotient_0,
            rescaleRemainder_0)
  {
    __compactRuntime.assert(amount_0 > 0n,
                            'borrow amount must be greater than zero');
    const currentBorrowIndex_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                           partialProofData,
                                                                                           [
                                                                                            { dup: { n: 0 } },
                                                                                            { idx: { cached: false,
                                                                                                     pushPath: false,
                                                                                                     path: [
                                                                                                            { tag: 'value',
                                                                                                              value: { value: _descriptor_7.toValue(3n),
                                                                                                                       alignment: _descriptor_7.alignment() } }] } },
                                                                                            { popeq: { cached: false,
                                                                                                       result: undefined } }]).value);
    const currentSupplied_0 = this._userSupplied_0(context, partialProofData);
    const currentBorrowed_0 = this._userBorrowed_0(context, partialProofData);
    const lastBorrowIndex_0 = this._userLastBorrowIndex_0(context,
                                                          partialProofData);
    __compactRuntime.assert(currentSupplied_0 > 0n, 'no collateral supplied');
    const effectiveBorrowed_0 = this._rescale_balance_0(currentBorrowed_0,
                                                        currentBorrowIndex_0,
                                                        lastBorrowIndex_0,
                                                        rescaleQuotient_0,
                                                        rescaleRemainder_0);
    const newBorrowed_0 = ((t1) => {
                            if (t1 > 340282366920938463463374607431768211455n) {
                              throw new __compactRuntime.CompactError('nocturne_lending.compact line 299 char 34: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                            }
                            return t1;
                          })(effectiveBorrowed_0 + amount_0);
    this._setUserPosition_0(context,
                            partialProofData,
                            currentSupplied_0,
                            newBorrowed_0,
                            this._userLastSupplyIndex_0(context,
                                                        partialProofData),
                            currentBorrowIndex_0);
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_7.toValue(1n),
                                                                                                                         alignment: _descriptor_7.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_0
                             <=
                             (__compactRuntime.assert(MAX_UINT128_0 >= amount_0,
                                                      'result of subtraction would be negative'),
                              MAX_UINT128_0 - amount_0)),
                            'totalBorrowed overflow');
    const tmp_0 = ((t1) => {
                    if (t1 > 340282366920938463463374607431768211455n) {
                      throw new __compactRuntime.CompactError('nocturne_lending.compact line 305 char 28: cast from Field or Uint value to smaller Uint value failed: ' + t1 + ' is greater than 340282366920938463463374607431768211455');
                    }
                    return t1;
                  })(_descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                               partialProofData,
                                                                               [
                                                                                { dup: { n: 0 } },
                                                                                { idx: { cached: false,
                                                                                         pushPath: false,
                                                                                         path: [
                                                                                                { tag: 'value',
                                                                                                  value: { value: _descriptor_7.toValue(1n),
                                                                                                           alignment: _descriptor_7.alignment() } }] } },
                                                                                { popeq: { cached: false,
                                                                                           result: undefined } }]).value)
                     +
                     amount_0);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(1n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _repay_0(context,
           partialProofData,
           amount_0,
           rescaleQuotient_0,
           rescaleRemainder_0)
  {
    __compactRuntime.assert(amount_0 > 0n,
                            'repayment amount must be greater than zero');
    const currentBorrowIndex_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                           partialProofData,
                                                                                           [
                                                                                            { dup: { n: 0 } },
                                                                                            { idx: { cached: false,
                                                                                                     pushPath: false,
                                                                                                     path: [
                                                                                                            { tag: 'value',
                                                                                                              value: { value: _descriptor_7.toValue(3n),
                                                                                                                       alignment: _descriptor_7.alignment() } }] } },
                                                                                            { popeq: { cached: false,
                                                                                                       result: undefined } }]).value);
    const currentSupplied_0 = this._userSupplied_0(context, partialProofData);
    const currentBorrowed_0 = this._userBorrowed_0(context, partialProofData);
    const lastBorrowIndex_0 = this._userLastBorrowIndex_0(context,
                                                          partialProofData);
    __compactRuntime.assert(amount_0 <= currentBorrowed_0,
                            'repayment amount exceeds user borrowed balance');
    __compactRuntime.assert(amount_0
                            <=
                            _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                      partialProofData,
                                                                                      [
                                                                                       { dup: { n: 0 } },
                                                                                       { idx: { cached: false,
                                                                                                pushPath: false,
                                                                                                path: [
                                                                                                       { tag: 'value',
                                                                                                         value: { value: _descriptor_7.toValue(1n),
                                                                                                                  alignment: _descriptor_7.alignment() } }] } },
                                                                                       { popeq: { cached: false,
                                                                                                  result: undefined } }]).value),
                            'repayment amount exceeds total borrowed');
    const effectiveBorrowed_0 = this._rescale_balance_0(currentBorrowed_0,
                                                        currentBorrowIndex_0,
                                                        lastBorrowIndex_0,
                                                        rescaleQuotient_0,
                                                        rescaleRemainder_0);
    const newBorrowed_0 = (__compactRuntime.assert(effectiveBorrowed_0
                                                   >=
                                                   amount_0,
                                                   'result of subtraction would be negative'),
                           effectiveBorrowed_0 - amount_0);
    this._setUserPosition_0(context,
                            partialProofData,
                            currentSupplied_0,
                            newBorrowed_0,
                            this._userLastSupplyIndex_0(context,
                                                        partialProofData),
                            currentBorrowIndex_0);
    const MAX_UINT128_0 = 340282366920938463463374607431768211455n;
    let t_0;
    __compactRuntime.assert((t_0 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                             partialProofData,
                                                                                             [
                                                                                              { dup: { n: 0 } },
                                                                                              { idx: { cached: false,
                                                                                                       pushPath: false,
                                                                                                       path: [
                                                                                                              { tag: 'value',
                                                                                                                value: { value: _descriptor_7.toValue(1n),
                                                                                                                         alignment: _descriptor_7.alignment() } }] } },
                                                                                              { popeq: { cached: false,
                                                                                                         result: undefined } }]).value),
                             t_0 >= amount_0),
                            'totalBorrowed underflow');
    let t_1;
    const tmp_0 = (t_1 = _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                   partialProofData,
                                                                                   [
                                                                                    { dup: { n: 0 } },
                                                                                    { idx: { cached: false,
                                                                                             pushPath: false,
                                                                                             path: [
                                                                                                    { tag: 'value',
                                                                                                      value: { value: _descriptor_7.toValue(1n),
                                                                                                               alignment: _descriptor_7.alignment() } }] } },
                                                                                    { popeq: { cached: false,
                                                                                               result: undefined } }]).value),
                   (__compactRuntime.assert(t_1 >= amount_0,
                                            'result of subtraction would be negative'),
                    t_1 - amount_0));
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(1n),
                                                                                              alignment: _descriptor_7.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_3(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_4(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get totalSupplied() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(0n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get totalBorrowed() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(1n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get supplyIndex() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(2n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get borrowIndex() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(3n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get lastAccrualTimestamp() {
      return _descriptor_1.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(4n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get reserveParams() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(5n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get poolAdmin() {
      return _descriptor_4.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_7.toValue(6n),
                                                                                                   alignment: _descriptor_7.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  userSupplied: (...args) => undefined,
  userBorrowed: (...args) => undefined,
  userLastSupplyIndex: (...args) => undefined,
  userLastBorrowIndex: (...args) => undefined,
  setUserPosition: (...args) => undefined
});
export const pureCircuits = {
  verify_division: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`verify_division: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const numerator_0 = args_0[0];
    const denominator_0 = args_0[1];
    const quotient_0 = args_0[2];
    const remainder_0 = args_0[3];
    if (!(typeof(numerator_0) === 'bigint' && numerator_0 >= 0n && numerator_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('verify_division',
                                 'argument 1',
                                 'nocturne_lending.compact line 87 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 numerator_0)
    }
    if (!(typeof(denominator_0) === 'bigint' && denominator_0 >= 0n && denominator_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('verify_division',
                                 'argument 2',
                                 'nocturne_lending.compact line 87 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 denominator_0)
    }
    if (!(typeof(quotient_0) === 'bigint' && quotient_0 >= 0n && quotient_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('verify_division',
                                 'argument 3',
                                 'nocturne_lending.compact line 87 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 quotient_0)
    }
    if (!(typeof(remainder_0) === 'bigint' && remainder_0 >= 0n && remainder_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('verify_division',
                                 'argument 4',
                                 'nocturne_lending.compact line 87 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 remainder_0)
    }
    return _dummyContract._verify_division_0(numerator_0,
                                             denominator_0,
                                             quotient_0,
                                             remainder_0);
  },
  compute_utilization: (...args_0) => {
    if (args_0.length !== 4) {
      throw new __compactRuntime.CompactError(`compute_utilization: expected 4 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const totalBorrowed_0 = args_0[0];
    const totalSupplied_0 = args_0[1];
    const utilizationQuotient_0 = args_0[2];
    const utilizationRemainder_0 = args_0[3];
    if (!(typeof(totalBorrowed_0) === 'bigint' && totalBorrowed_0 >= 0n && totalBorrowed_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_utilization',
                                 'argument 1',
                                 'nocturne_lending.compact line 98 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 totalBorrowed_0)
    }
    if (!(typeof(totalSupplied_0) === 'bigint' && totalSupplied_0 >= 0n && totalSupplied_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_utilization',
                                 'argument 2',
                                 'nocturne_lending.compact line 98 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 totalSupplied_0)
    }
    if (!(typeof(utilizationQuotient_0) === 'bigint' && utilizationQuotient_0 >= 0n && utilizationQuotient_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_utilization',
                                 'argument 3',
                                 'nocturne_lending.compact line 98 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 utilizationQuotient_0)
    }
    if (!(typeof(utilizationRemainder_0) === 'bigint' && utilizationRemainder_0 >= 0n && utilizationRemainder_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_utilization',
                                 'argument 4',
                                 'nocturne_lending.compact line 98 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 utilizationRemainder_0)
    }
    return _dummyContract._compute_utilization_0(totalBorrowed_0,
                                                 totalSupplied_0,
                                                 utilizationQuotient_0,
                                                 utilizationRemainder_0);
  },
  compute_borrow_rate: (...args_0) => {
    if (args_0.length !== 6) {
      throw new __compactRuntime.CompactError(`compute_borrow_rate: expected 6 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const utilization_0 = args_0[0];
    const params_0 = args_0[1];
    const slope1Quotient_0 = args_0[2];
    const slope1Remainder_0 = args_0[3];
    const slope2Quotient_0 = args_0[4];
    const slope2Remainder_0 = args_0[5];
    if (!(typeof(utilization_0) === 'bigint' && utilization_0 >= 0n && utilization_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_borrow_rate',
                                 'argument 1',
                                 'nocturne_lending.compact line 110 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 utilization_0)
    }
    if (!(typeof(params_0) === 'object' && typeof(params_0.collateralFactor) === 'bigint' && params_0.collateralFactor >= 0n && params_0.collateralFactor <= 340282366920938463463374607431768211455n && typeof(params_0.baseRate) === 'bigint' && params_0.baseRate >= 0n && params_0.baseRate <= 340282366920938463463374607431768211455n && typeof(params_0.slope1) === 'bigint' && params_0.slope1 >= 0n && params_0.slope1 <= 340282366920938463463374607431768211455n && typeof(params_0.slope2) === 'bigint' && params_0.slope2 >= 0n && params_0.slope2 <= 340282366920938463463374607431768211455n && typeof(params_0.kink) === 'bigint' && params_0.kink >= 0n && params_0.kink <= 340282366920938463463374607431768211455n && typeof(params_0.reserveFactor) === 'bigint' && params_0.reserveFactor >= 0n && params_0.reserveFactor <= 340282366920938463463374607431768211455n && typeof(params_0.liquidationThreshold) === 'bigint' && params_0.liquidationThreshold >= 0n && params_0.liquidationThreshold <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_borrow_rate',
                                 'argument 2',
                                 'nocturne_lending.compact line 110 char 1',
                                 'struct ReserveParams<collateralFactor: Uint<0..340282366920938463463374607431768211456>, baseRate: Uint<0..340282366920938463463374607431768211456>, slope1: Uint<0..340282366920938463463374607431768211456>, slope2: Uint<0..340282366920938463463374607431768211456>, kink: Uint<0..340282366920938463463374607431768211456>, reserveFactor: Uint<0..340282366920938463463374607431768211456>, liquidationThreshold: Uint<0..340282366920938463463374607431768211456>>',
                                 params_0)
    }
    if (!(typeof(slope1Quotient_0) === 'bigint' && slope1Quotient_0 >= 0n && slope1Quotient_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_borrow_rate',
                                 'argument 3',
                                 'nocturne_lending.compact line 110 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 slope1Quotient_0)
    }
    if (!(typeof(slope1Remainder_0) === 'bigint' && slope1Remainder_0 >= 0n && slope1Remainder_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_borrow_rate',
                                 'argument 4',
                                 'nocturne_lending.compact line 110 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 slope1Remainder_0)
    }
    if (!(typeof(slope2Quotient_0) === 'bigint' && slope2Quotient_0 >= 0n && slope2Quotient_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_borrow_rate',
                                 'argument 5',
                                 'nocturne_lending.compact line 110 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 slope2Quotient_0)
    }
    if (!(typeof(slope2Remainder_0) === 'bigint' && slope2Remainder_0 >= 0n && slope2Remainder_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_borrow_rate',
                                 'argument 6',
                                 'nocturne_lending.compact line 110 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 slope2Remainder_0)
    }
    return _dummyContract._compute_borrow_rate_0(utilization_0,
                                                 params_0,
                                                 slope1Quotient_0,
                                                 slope1Remainder_0,
                                                 slope2Quotient_0,
                                                 slope2Remainder_0);
  },
  compute_supply_rate: (...args_0) => {
    if (args_0.length !== 5) {
      throw new __compactRuntime.CompactError(`compute_supply_rate: expected 5 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const borrowRate_0 = args_0[0];
    const utilization_0 = args_0[1];
    const reserveFactor_0 = args_0[2];
    const quotient_0 = args_0[3];
    const remainder_0 = args_0[4];
    if (!(typeof(borrowRate_0) === 'bigint' && borrowRate_0 >= 0n && borrowRate_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_supply_rate',
                                 'argument 1',
                                 'nocturne_lending.compact line 137 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 borrowRate_0)
    }
    if (!(typeof(utilization_0) === 'bigint' && utilization_0 >= 0n && utilization_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_supply_rate',
                                 'argument 2',
                                 'nocturne_lending.compact line 137 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 utilization_0)
    }
    if (!(typeof(reserveFactor_0) === 'bigint' && reserveFactor_0 >= 0n && reserveFactor_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_supply_rate',
                                 'argument 3',
                                 'nocturne_lending.compact line 137 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 reserveFactor_0)
    }
    if (!(typeof(quotient_0) === 'bigint' && quotient_0 >= 0n && quotient_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_supply_rate',
                                 'argument 4',
                                 'nocturne_lending.compact line 137 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 quotient_0)
    }
    if (!(typeof(remainder_0) === 'bigint' && remainder_0 >= 0n && remainder_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('compute_supply_rate',
                                 'argument 5',
                                 'nocturne_lending.compact line 137 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 remainder_0)
    }
    return _dummyContract._compute_supply_rate_0(borrowRate_0,
                                                 utilization_0,
                                                 reserveFactor_0,
                                                 quotient_0,
                                                 remainder_0);
  },
  rescale_balance: (...args_0) => {
    if (args_0.length !== 5) {
      throw new __compactRuntime.CompactError(`rescale_balance: expected 5 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const stored_0 = args_0[0];
    const currentIndex_0 = args_0[1];
    const lastIndex_0 = args_0[2];
    const quotient_0 = args_0[3];
    const remainder_0 = args_0[4];
    if (!(typeof(stored_0) === 'bigint' && stored_0 >= 0n && stored_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('rescale_balance',
                                 'argument 1',
                                 'nocturne_lending.compact line 154 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 stored_0)
    }
    if (!(typeof(currentIndex_0) === 'bigint' && currentIndex_0 >= 0n && currentIndex_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('rescale_balance',
                                 'argument 2',
                                 'nocturne_lending.compact line 154 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 currentIndex_0)
    }
    if (!(typeof(lastIndex_0) === 'bigint' && lastIndex_0 >= 0n && lastIndex_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('rescale_balance',
                                 'argument 3',
                                 'nocturne_lending.compact line 154 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 lastIndex_0)
    }
    if (!(typeof(quotient_0) === 'bigint' && quotient_0 >= 0n && quotient_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('rescale_balance',
                                 'argument 4',
                                 'nocturne_lending.compact line 154 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 quotient_0)
    }
    if (!(typeof(remainder_0) === 'bigint' && remainder_0 >= 0n && remainder_0 <= 340282366920938463463374607431768211455n)) {
      __compactRuntime.typeError('rescale_balance',
                                 'argument 5',
                                 'nocturne_lending.compact line 154 char 1',
                                 'Uint<0..340282366920938463463374607431768211456>',
                                 remainder_0)
    }
    return _dummyContract._rescale_balance_0(stored_0,
                                             currentIndex_0,
                                             lastIndex_0,
                                             quotient_0,
                                             remainder_0);
  }
};
export const contractReferenceLocations =
  { tag: 'publicLedgerArray', indices: { } };
//# sourceMappingURL=index.js.map
