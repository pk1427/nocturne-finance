import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  tNightSupplied(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  tNightBorrowed(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  setTNightPosition(context: __compactRuntime.WitnessContext<Ledger, PS>,
                    supplied_0: bigint,
                    borrowed_0: bigint): [PS, []];
  tUsdcSupplied(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  setTUsdcPosition(context: __compactRuntime.WitnessContext<Ledger, PS>,
                   supplied_0: bigint): [PS, []];
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             tusdcColor_0: Uint8Array,
             timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  configure_tusdc(context: __compactRuntime.CircuitContext<PS>,
                  color_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  supply_tusdc(context: __compactRuntime.CircuitContext<PS>,
               color_0: Uint8Array,
               amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw_tusdc(context: __compactRuntime.CircuitContext<PS>,
                 recipient_0: { bytes: Uint8Array },
                 color_0: Uint8Array,
                 amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  supply(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  borrow(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  repay(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>,
             tusdcColor_0: Uint8Array,
             timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  configure_tusdc(context: __compactRuntime.CircuitContext<PS>,
                  color_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  supply_tusdc(context: __compactRuntime.CircuitContext<PS>,
               color_0: Uint8Array,
               amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw_tusdc(context: __compactRuntime.CircuitContext<PS>,
                 recipient_0: { bytes: Uint8Array },
                 color_0: Uint8Array,
                 amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  supply(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  borrow(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  repay(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  resolve_asset(color_0: Uint8Array, tusdcColor_0: Uint8Array): bigint;
}

export type Circuits<PS> = {
  resolve_asset(context: __compactRuntime.CircuitContext<PS>,
                color_0: Uint8Array,
                tusdcColor_0: Uint8Array): __compactRuntime.CircuitResults<PS, bigint>;
  initialize(context: __compactRuntime.CircuitContext<PS>,
             tusdcColor_0: Uint8Array,
             timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  configure_tusdc(context: __compactRuntime.CircuitContext<PS>,
                  color_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  supply_tusdc(context: __compactRuntime.CircuitContext<PS>,
               color_0: Uint8Array,
               amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw_tusdc(context: __compactRuntime.CircuitContext<PS>,
                 recipient_0: { bytes: Uint8Array },
                 color_0: Uint8Array,
                 amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  supply(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  withdraw(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  borrow(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  repay(context: __compactRuntime.CircuitContext<PS>, amount_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly tNightReserve: { enabled: boolean,
                            tokenColor: Uint8Array,
                            totalSupplied: bigint,
                            totalBorrowed: bigint,
                            supplyIndex: bigint,
                            borrowIndex: bigint
                          };
  readonly tUsdcReserve: { enabled: boolean,
                           tokenColor: Uint8Array,
                           totalSupplied: bigint,
                           totalBorrowed: bigint,
                           supplyIndex: bigint,
                           borrowIndex: bigint
                         };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
