! ------------------- Remove existing behavior from TupleAst
expectvalue /Metaclass3       
doit
TupleAst removeAllMethods.
TupleAst class removeAllMethods.
%
! ------------------- Class methods for TupleAst
! ------------------- Instance methods for TupleAst
set compile_env: 0
category: 'other'
method: TupleAst
children

	^super children
		add: ctx;
		addAll: elts;
		yourself
%
category: 'other'
method: TupleAst
declareVariable

	elts do: [:each | each declareVariable].
%
category: 'other'
method: TupleAst
evaluate: aScope

	^Tuple withAll: (elts collect: [:each | each evaluate: aScope]) immediateInvariant
%
category: 'other'
method: TupleAst
initialize
	"Tuple(expr* elts, expr_context ctx)"

	elts := self collectAst: [self expression].
	self commaSpace.
	ctx := ExpressionContextAst parent: self.
	self readPosition.
%
category: 'other'
method: TupleAst
setTo: aValue scope: aScope

	elts size ~~ aValue size ifTrue: [
		ValueError signal: 'not enough values to unpack (expected ' , elts size printString , ', got ' , aValue size printString , ')'.
	].
	1 to: elts size do: [:i | 
		(elts at: i) setTo: (aValue at: i) scope: aScope.
	].
%
