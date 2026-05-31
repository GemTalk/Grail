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
TupleAst category: 'Grail-Parser'
%

! ------------------- Remove existing behavior from TupleAst
removeallmethods TupleAst
removeallclassmethods TupleAst

set compile_env: 0

category: 'Grail-accessing'
method: TupleAst
elts

	^elts
%

category: 'Grail-other'
method: TupleAst
addVariableNamesTo: aStream

	elts do: [:each | 
		each addVariableNamesTo: aStream.
	].
%

category: 'Grail-other'
method: TupleAst
declareVariable

	elts do: [:each | each declareVariable].
%

category: 'Grail-other'
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

category: 'Grail-other'
method: TupleAst
printSmalltalkOn: aStream

	| hasStar |
	elts isEmpty ifTrue: [
		aStream nextPutAll: '(tuple perform: #new env: 0)'.
		^self.
	].
	hasStar := elts anySatisfy: [:each | each isKindOf: StarredAst].
	hasStar ifFalse: [
		aStream nextPutAll: '(tuple perform: #withAll: env: 0 withArguments: {{'.
		elts doWithIndex: [:each :i |
			i > 1 ifTrue: [aStream nextPutAll: '. '].
			each printSmalltalkOn: aStream.
		].
		aStream nextPutAll: '}})'.
		^ self.
	].
	"Splat path: ``(a, *b, c)'' → concatenate run-arrays around each
	starred expression's asArray, then wrap as a tuple.

	The opening string ``(tuple perform: ... withArguments: {(({}''
	balances as: one outer paren around ``tuple perform:'', one
	array brace, and TWO inner parens around the concat chain.  The
	closing must therefore emit ``))})'' (close the two inner
	parens, the array brace, then the outer paren) — earlier
	revisions emitted only ``)})'' which left the outer paren
	unclosed, generating syntactically invalid Smalltalk for
	``(a, *b)'' expressions.  Werkzeug.datastructures.headers'
	``__eq__'' surfaced this via ``return item[0].lower(), *item[1:]''."
	aStream nextPutAll: '(tuple perform: #withAll: env: 0 withArguments: {(({}'.
	elts do: [:each |
		aStream nextPutAll: ' @env0:, '.
		(each isKindOf: StarredAst)
			ifTrue: [
				aStream nextPut: $(.
				each value printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: ' @env0:___pyStarToArray___)'.
			] ifFalse: [
				aStream nextPutAll: '{ '.
				each printSmalltalkWithParenthesisOn: aStream.
				aStream nextPutAll: '. }'.
			].
	].
	aStream nextPutAll: '))})'.
%

category: 'Grail-other'
method: TupleAst
setTo: aValue scope: aScope

	elts size ~~ aValue ___size ifTrue: [
		ValueError signal: 'not enough values to unpack (expected ' , elts size printString , ', got ' , aValue ___size printString , ')'.
	].
	1 to: elts size do: [:i | 
		(elts at: i) setTo: (aValue ___at: i) scope: aScope.
	].
%
