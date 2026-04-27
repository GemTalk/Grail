! ------------------- Superclass check
run
ExpressionAst ifNil: [self error: 'ExpressionAst is not defined. Check file ordering.'].
%

! ------------------- Class definition for TupleAst
expectvalue /Class
doit
ExpressionAst subclass: 'TupleAst'
  instVarNames: #( elts ctx)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonAst
  options: #()

%

expectvalue /Class
doit
TupleAst comment:
'https://docs.python.org/3/library/ast.html#ast.Tuple

A tuple.

elts holds a list of nodes representing the elements.
ctx is Store if the tuple is an assignment target (i.e. (x,y)=something),
and Load otherwise.

Example:
>>> print(ast.dump(ast.parse(''(1, 2, 3)'', mode=''eval''), indent=4))
Expression(
    body=Tuple(
        elts=[Constant(value=1), Constant(value=2), Constant(value=3)],
        ctx=Load()))

Hierarchy:
Object
  AbstractNode(parent)
    AbstractLocationNode(beginLine beginColumn endLine endColumn)
      ExpressionAst
        TupleAst(elts ctx)
'
%

expectvalue /Class
doit
TupleAst category: 'Parser'
%

! ------------------- Remove existing behavior from TupleAst
removeallmethods TupleAst
removeallclassmethods TupleAst

set compile_env: 0

category: 'accessing'
method: TupleAst
elts

	^elts
%

category: 'other'
method: TupleAst
addVariableNamesTo: aStream

	elts do: [:each | 
		each addVariableNamesTo: aStream.
	].
%

category: 'other'
method: TupleAst
declareVariable

	elts do: [:each | each declareVariable].
%

category: 'other'
method: TupleAst
printSmalltalkAssignmentOn: aStream 

	1 to: elts size do: [:i | 
		(elts at: i) printSmalltalkOn: aStream.
		aStream 
			nextPutAll: '(value at: ';
			print: i;
			nextPutAll: ').'; lf.
	].
	aStream skip: -2.
%

category: 'other'
method: TupleAst
printSmalltalkOn: aStream

	elts isEmpty ifTrue: [
		aStream nextPutAll: '(tuple perform: #new env: 0)'.
		^self.
	].
	aStream nextPutAll: '(tuple perform: #withAll: env: 0 withArguments: {{'.
	elts doWithIndex: [:each :i |
		i > 1 ifTrue: [aStream nextPutAll: '. '].
		each printSmalltalkOn: aStream.
	].
	aStream nextPutAll: '}})'.
%

category: 'other'
method: TupleAst
setTo: aValue scope: aScope

	elts size ~~ aValue ___size ifTrue: [
		ValueError signal: 'not enough values to unpack (expected ' , elts size printString , ', got ' , aValue ___size printString , ')'.
	].
	1 to: elts size do: [:i | 
		(elts at: i) setTo: (aValue ___at: i) scope: aScope.
	].
%
