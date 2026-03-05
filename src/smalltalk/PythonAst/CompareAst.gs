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
CompareAst category: 'Parser'
%

! ------------------- Remove existing behavior from CompareAst
removeallmethods CompareAst
removeallclassmethods CompareAst

set compile_env: 0

category: 'other'
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

category: 'initialization'
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
