import expect from "expect";
import {
    AddressType,
    assert,
    ASTNodeConstructor,
    ASTReader,
    compileSol,
    ContractDefinition,
    DataLocation,
    detectCompileErrors,
    EnumDefinition,
    eq,
    FixedBytesType,
    FunctionStateMutability,
    FunctionType,
    FunctionVisibility,
    IntType,
    PointerType,
    SourceUnit,
    StringType,
    StructDefinition,
    TypeNode,
    UserDefinedType,
    VariableDeclaration
} from "../../../src";

type DeferredTypeNode = (unit: SourceUnit) => TypeNode;

function getStateVar(unit: SourceUnit, name: string): VariableDeclaration {
    const vars: VariableDeclaration[] = unit.getChildrenBySelector(
        (node) => node instanceof VariableDeclaration && node.stateVariable && node.name === name
    );

    assert(vars.length === 1, `Unable to get state variable with name "${name}"`);

    return vars[0];
}

function getDef<T extends StructDefinition | EnumDefinition | ContractDefinition>(
    unit: SourceUnit,
    canonicalName: string,
    constructor: ASTNodeConstructor<T>
): T {
    const defs = unit.getChildrenBySelector<T>(
        (node) =>
            node instanceof constructor &&
            (node instanceof ContractDefinition
                ? node.name
                : (node as EnumDefinition | StructDefinition).canonicalName) === canonicalName
    );

    assert(defs.length === 1, `Unable get definition with name "${canonicalName}"`);

    return defs[0];
}

const cases: Array<[string, Array<[string, TypeNode | DeferredTypeNode]>]> = [
    [
        "test/samples/solidity/getters_08.sol",
        [
            [
                "a",
                new FunctionType(
                    "a",
                    [new IntType(256, false)],
                    [new IntType(256, false)],
                    FunctionVisibility.External,
                    FunctionStateMutability.View
                )
            ],
            [
                "b",
                new FunctionType(
                    "b",
                    [new AddressType(false)],
                    [new IntType(256, false)],
                    FunctionVisibility.External,
                    FunctionStateMutability.View
                )
            ],
            [
                "c",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "AccessorReturns.E", EnumDefinition);

                    return new FunctionType(
                        "c",
                        [],
                        [new UserDefinedType("AccessorReturns.E", def)],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ],
            [
                "d",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "AccessorReturns.E", EnumDefinition);

                    return new FunctionType(
                        "c",
                        [],
                        [new UserDefinedType("AccessorReturns.E", def), new FixedBytesType(1)],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ],
            [
                "e",
                new FunctionType(
                    "e",
                    [],
                    [new AddressType(false)],
                    FunctionVisibility.External,
                    FunctionStateMutability.View
                )
            ],
            [
                "f",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "AccessorReturns.S1", StructDefinition);

                    return new FunctionType(
                        "f",
                        [new IntType(256, false)],
                        [
                            new IntType(8, true),
                            new PointerType(new StringType(), DataLocation.Memory),
                            new PointerType(
                                new UserDefinedType(def.canonicalName, def),
                                DataLocation.Memory
                            )
                        ],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ],
            [
                "g",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "Some", ContractDefinition);

                    return new FunctionType(
                        "g",
                        [new IntType(256, false)],
                        [new UserDefinedType(def.name, def)],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ]
        ]
    ],
    [
        "test/samples/solidity/getters_07.sol",
        [
            [
                "s",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "AccessorReturns.S2", StructDefinition);

                    return new FunctionType(
                        "s",
                        [],
                        [
                            new PointerType(
                                new UserDefinedType(def.canonicalName, def),
                                DataLocation.Memory
                            ),
                            new IntType(256, false)
                        ],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ]
        ]
    ],
    [
        "test/samples/solidity/getters_07_abiv1.sol",
        [
            [
                "a",
                new FunctionType(
                    "a",
                    [new IntType(256, false)],
                    [new IntType(256, false)],
                    FunctionVisibility.External,
                    FunctionStateMutability.View
                )
            ],
            [
                "b",
                new FunctionType(
                    "b",
                    [new AddressType(false)],
                    [new IntType(256, false)],
                    FunctionVisibility.External,
                    FunctionStateMutability.View
                )
            ],
            [
                "c",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "AccessorReturns.E", EnumDefinition);

                    return new FunctionType(
                        "c",
                        [],
                        [new UserDefinedType("AccessorReturns.E", def)],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ],
            [
                "d",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "AccessorReturns.E", EnumDefinition);

                    return new FunctionType(
                        "c",
                        [],
                        [new UserDefinedType("AccessorReturns.E", def), new FixedBytesType(1)],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ],
            [
                "e",
                new FunctionType(
                    "e",
                    [],
                    [new AddressType(false)],
                    FunctionVisibility.External,
                    FunctionStateMutability.View
                )
            ],
            [
                "f",
                (unit: SourceUnit) => {
                    const def = getDef(unit, "Some", ContractDefinition);

                    return new FunctionType(
                        "f",
                        [new IntType(256, false)],
                        [new UserDefinedType(def.name, def)],
                        FunctionVisibility.External,
                        FunctionStateMutability.View
                    );
                }
            ]
        ]
    ]
];

describe("getterFunType()", () => {
    for (const [sample, mapping] of cases) {
        describe(sample, () => {
            let unit: SourceUnit;

            before(() => {
                const { data } = compileSol(sample, "auto", []);
                const errors = detectCompileErrors(data);

                expect(errors).toHaveLength(0);

                const reader = new ASTReader();
                const units = reader.read(data);

                expect(units.length).toEqual(1);

                unit = units[0];
            });

            for (const [stateVarName, typing] of mapping) {
                it(`${stateVarName} -> ${
                    typing instanceof TypeNode ? typing.pp() : "(deferred)"
                }`, () => {
                    const expectedType = typing instanceof TypeNode ? typing : typing(unit);
                    const stateVar = getStateVar(unit, stateVarName);
                    const resultType = stateVar.getterFunType();

                    assert(
                        eq(resultType, expectedType),
                        "Expected {0}, got {1}",
                        expectedType,
                        resultType
                    );
                });
            }
        });
    }
});