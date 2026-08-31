! ------------------- Superclass check
run
StatementAst ifNil: [self error: 'StatementAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for IfAst
expectvalue /Class
doit
StatementAst subclass: 'IfAst'
  instVarNames: #( test body orelse)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
IfAst comment:
'https://docs.python.org/3/library/ast.html#ast.If

An if statement.

test holds the condition.
body is a list of nodes.
orelse is a list of nodes for the else clause.

Example:
>>> print(ast.dump(ast.parse(''if x:\\n    ...\\nelse:\\n    ...''), indent=4))
Module(
    body=[
        If(
            test=Name(id=''x'', ctx=Load()),
            body=[Expr(value=Constant(value=Ellipsis))],
            orelse=[Expr(value=Constant(value=Ellipsis))])])

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      StatementAst
        IfAst(test body orelse)
'
%

expectvalue /Class
doit
IfAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from IfAst
removeallmethods IfAst
removeallclassmethods IfAst

set compile_env: 0

category: 'Grail-other'
method: IfAst
test
	^ test
%

category: 'Grail-accessing'
method: IfAst
body
	^ body
%

category: 'Grail-accessing'
method: IfAst
orelse
	^ orelse
%

category: 'Grail-printing'
method: IfAst
printSmalltalkOn: aStream

	test printSmalltalkWithParenthesisOn: aStream.
	aStream nextPutAll: ' ___isTruthy___ ifTrue: ['; increaseIndent; lf.
	body printSmalltalkOn: aStream.
	(orelse notNil and: [orelse size > 0]) ifTrue: [
		aStream decreaseIndent; nextPutAll: '] ifFalse: ['; increaseIndent; lf.
		orelse printSmalltalkOn: aStream.
	].
	aStream decreaseIndent; nextPutAll: '].'.
%
method: IfAst
test: newValue
	test := newValue
%
method: IfAst
body: newValue
	body := newValue
%
method: IfAst
orelse: newValue
	orelse := newValue
%

category: 'Grail-IR Codegen'
method: IfAst
___irOrelseEligible___: localNames
	"The else-branch: absent, or a BlockAst whose statements are all emittable.
	An elif compiles to a nested IfAst inside a BlockAst, so this recurses."

	(orelse isNil or: [orelse size = 0]) ifTrue: [^ true].
	((orelse isKindOf: BlockAst) or: [orelse isKindOf: SuiteAst])
		ifFalse: [^ false].
	^ orelse ___irEligibleStatementsWithLocals___: localNames
%

category: 'Grail-IR Codegen'
method: IfAst
___irEligibleStatementLocals___: localNames
	^ (test ___irEligibleValueLocals___: localNames)
		and: [(body ___irEligibleStatementsWithLocals___: localNames)
		and: [self ___irOrelseEligible___: localNames]]
%

category: 'Grail-IR Codegen'
method: IfAst
___emitIRStatementOn___: aBuilder
	"(test) ___isTruthy___ ifTrue: [body] ifFalse: [orelse]."

	| condV |
	condV := aBuilder
		send: #'___isTruthy___'
		to: (test ___emitIRValueOn___: aBuilder)
		with: { }.
	aBuilder at: self beginPosition.
	(orelse notNil and: [orelse size > 0])
		ifTrue: [aBuilder
			if: condV
			then: [body ___emitIRStatementsOn___: aBuilder]
			else: [orelse ___emitIRStatementsOn___: aBuilder]]
		ifFalse: [aBuilder
			if: condV
			then: [body ___emitIRStatementsOn___: aBuilder]].
	^ self
%

category: 'Grail-IR Codegen'
method: IfAst
___irReadLocalNamesInto___: aSet locals: localSet
	test ___irReadLocalNamesInto___: aSet locals: localSet.
	body ___irReadLocalNamesInto___: aSet locals: localSet.
	(orelse notNil and: [orelse size > 0])
		ifTrue: [orelse ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
