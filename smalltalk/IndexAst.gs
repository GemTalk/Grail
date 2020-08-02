! ------------------- Remove existing behavior from IndexAst
expectvalue /Metaclass3       
doit
IndexAst removeAllMethods.
IndexAst class removeAllMethods.
%
! ------------------- Class methods for IndexAst
! ------------------- Instance methods for IndexAst
set compile_env: 0
category: 'other'
method: IndexAst
assign: aValue to: aVariable scope: aScope
	| x y |
	x := value evaluate: aScope.
	y := aVariable evaluate: aScope.
	y at: x + 1 put: aValue.
%
category: 'other'
method: IndexAst
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: IndexAst
evaluate: aScope list: aList

	value assertContextIsLoad.
	^aList at: (value evaluate: aScope) + 1.
%
category: 'other'
method: IndexAst
initialize
	"Index(expr value)"
	
	value := self expression.
	(self stream peekFor: $)) ifFalse: [self error].
%
