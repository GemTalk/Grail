! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for BoolOpAst
expectvalue /Class
doit
ExpressionAst subclass: 'BoolOpAst'
  instVarNames: #( values)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
BoolOpAst comment:
'https://docs.python.org/3/library/ast.html#ast.BoolOp

A boolean operation, ''or'' or ''and''.

op is Or or And.
values are the values involved. Consecutive operations with the same
operator, such as a or b or c, are collapsed into one node with several values.

This doesn''t include not, which is a UnaryOp.

Example:
>>> print(ast.dump(ast.parse(''x or y'', mode=''eval''), indent=4))
Expression(
    body=BoolOp(
        op=Or(),
        values=[
            Name(id=''x'', ctx=Load()),
            Name(id=''y'', ctx=Load())]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        BoolOpAst(op values)
'
%

expectvalue /Class
doit
BoolOpAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from BoolOpAst
removeallmethods BoolOpAst
removeallclassmethods BoolOpAst

set compile_env: 0

category: 'Grail-other'
classmethod: BoolOpAst
isAbstract

	^self == BoolOpAst
%
method: BoolOpAst
values
	^values
%
method: BoolOpAst
values: newValue
	values := newValue
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irBoolHelperSelector___
	"The value-preserving short-circuit helper (#___pyAnd___: / #___pyOr___:);
	nil on the abstract base."

	^ nil
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irEligibleValueLocals___: localNames
	^ (self ___irBoolHelperSelector___ notNil)
		and: [values allSatisfy: [:v | v ___irEligibleValueLocals___: localNames]]
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irEmitBool___: i helper: helper on: aBuilder
	"Right-fold: ((v1) helper: [(v2) helper: [ ... vn ]]).  Each tail operand is
	wrapped in a block so the helper evaluates it lazily (short-circuit)."

	| leftV blk |
	i = values size ifTrue: [^ (values at: i) ___emitIRValueOn___: aBuilder].
	leftV := (values at: i) ___emitIRValueOn___: aBuilder.
	blk := aBuilder inBlockDo: [
		aBuilder add: (self ___irEmitBool___: i + 1 helper: helper on: aBuilder)].
	aBuilder at: self beginPosition.
	^ aBuilder send: helper to: leftV with: { blk } env: 1
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___emitIRValueOn___: aBuilder
	^ self ___irEmitBool___: 1 helper: self ___irBoolHelperSelector___ on: aBuilder
%

category: 'Grail-IR Codegen'
method: BoolOpAst
___irReadLocalNamesInto___: aSet locals: localSet
	values do: [:v | v ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
