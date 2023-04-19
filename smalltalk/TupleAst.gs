! ------------------- Remove existing behavior from TupleAst
removeAllMethods TupleAst
removeAllClassMethods TupleAst
! ------------------- Class methods for TupleAst
! ------------------- Instance methods for TupleAst
set compile_env: 0
category: 'other'
method: TupleAst
declareVariable

	elts do: [:each | each declareVariable].
%
category: 'other'
method: TupleAst
initialize
	"tuple(expr* elts, expr_context ctx)"

	elts := self collectAst: [self expression].
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: TupleAst
messagePrecedence
	
	^3
%
category: 'other'
method: TupleAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'tuple ___value: { '.
	elts do: [ :elt |
		self smalltalkSourceFor: elt parenthesisIf: 1 on: aStream.
		aStream nextPutAll: '. '.
	].
	aStream nextPut: $}.
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
