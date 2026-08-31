! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for CompareAst
expectvalue /Class
doit
ExpressionAst subclass: 'CompareAst'
  instVarNames: #( left cmpopList comparatorList rhsTemp opTemps)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
CompareAst comment:
'https://docs.python.org/3/library/ast.html#ast.Compare

A comparison of two or more values.

left is the first value in the comparison.
ops is the list of operators.
comparators is the list of values after the first element in the comparison.

Example:
>>> print(ast.dump(ast.parse(''1 <= a < 10'', mode=''eval''), indent=4))
Expression(
    body=Compare(
        left=Constant(value=1),
        ops=[LtE(), Lt()],
        comparators=[Name(id=''a'', ctx=Load()), Constant(value=10)]))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        CompareAst(left ops comparators)
'
%

expectvalue /Class
doit
CompareAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from CompareAst
removeallmethods CompareAst
removeallclassmethods CompareAst

set compile_env: 0

category: 'Grail-other'
method: CompareAst
printSmalltalkOn: aStream

	"Chained: a < b < c → (((a) __lt__: (___1 := b)) and: [(___1) __lt__: (c)])"
	1 to: cmpopList size do: [:i |
		| thisLeft subRight |
		thisLeft := i == 1 ifTrue: [left] ifFalse: [nil].
		subRight := comparatorList copyFrom: i to: comparatorList size.
		(cmpopList at: i) printSmalltalkOn: aStream left: thisLeft rightList: subRight rhsTemp: rhsTemp lhsTemp: (opTemps ifNotNil: [opTemps at: i]).
		i < cmpopList size ifTrue: [aStream nextPutAll: ' and: ['].
	].
	cmpopList size - 1 timesRepeat: [aStream nextPutAll: ']'].
%

category: 'Grail-initialization'
method: CompareAst
setParent: aNode

	super setParent: aNode.
	(rhsTemp isNil and: [cmpopList size > 1]) ifTrue: [
		rhsTemp := self allocateTemp.
		opTemps := Array new: cmpopList size.
		1 to: cmpopList size - 1 do: [:i |
			| op |
			op := cmpopList at: i.
			((op isKindOf: InAst) or: [op isKindOf: NotInAst]) ifTrue: [
				opTemps at: i put: self allocateTemp.
			].
		].
	].
%
method: CompareAst
left
	^left
%
method: CompareAst
left: newValue
	left := newValue
%
method: CompareAst
cmpopList
	^cmpopList
%
method: CompareAst
cmpopList: newValue
	cmpopList := newValue
%
method: CompareAst
comparatorList
	^comparatorList
%
method: CompareAst
comparatorList: newValue
	comparatorList := newValue
%
method: CompareAst
rhsTemp
	^rhsTemp
%
method: CompareAst
rhsTemp: newValue
	rhsTemp := newValue
%
method: CompareAst
opTemps
	^opTemps
%
method: CompareAst
opTemps: newValue
	opTemps := newValue
%

category: 'Grail-IR Codegen'
method: CompareAst
___irCmpHelperSelector___
	"For an UNCHAINED rich comparison (==, !=, <, <=, >, >=), the ___cmpXx___:
	helper selector object>>printSmalltalkOn: routes through; nil for a chained
	comparison (needs temps + and:-blocks) or is/is-not/in/not-in (bare send)."

	| opStream sel helper |
	cmpopList size == 1 ifFalse: [^ nil].
	"``is''/``in'' and friends override only printSmalltalkOn:left:rightList: and
	RAISE from the bare printSmalltalkOn: -- so guard it and treat any such op as
	ineligible (nil) rather than letting the probe raise."
	sel := [opStream := AppendStream on: Unicode7 new.
		(cmpopList at: 1) printSmalltalkOn: opStream.
		opStream _contents trimSeparators] on: Error do: [:ex | ^ nil].
	helper := (cmpopList at: 1) ___cmpHelperFor___: sel.
	^ helper ifNotNil: [:h | h asSymbol]
%

category: 'Grail-IR Codegen'
method: CompareAst
___irEligibleValueLocals___: localNames
	^ (self ___irCmpHelperSelector___ notNil)
		and: [(left ___irEligibleValueLocals___: localNames)
		and: [(comparatorList at: 1) ___irEligibleValueLocals___: localNames]]
%

category: 'Grail-IR Codegen'
method: CompareAst
___emitIRValueOn___: aBuilder
	"``a <op> b'' (unchained) -> ``a ___cmpXx___: b'' (one keyword send)."

	| leftV rightV |
	leftV := left ___emitIRValueOn___: aBuilder.
	rightV := (comparatorList at: 1) ___emitIRValueOn___: aBuilder.
	aBuilder at: self beginPosition.
	^ aBuilder send: self ___irCmpHelperSelector___ to: leftV with: { rightV }
%

category: 'Grail-IR Codegen'
method: CompareAst
___irReadLocalNamesInto___: aSet locals: localSet
	left ___irReadLocalNamesInto___: aSet locals: localSet.
	comparatorList do: [:c | c ___irReadLocalNamesInto___: aSet locals: localSet].
	^ self
%
