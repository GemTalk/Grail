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
children

	^super children
		add: value;
		yourself
%
category: 'other'
method: IndexAst
evaluate: aContainer scope: aScope

	^aContainer __getitem__ value: aContainer value: (value evaluate: aScope)
%
category: 'other'
method: IndexAst
initialize
	"Index(expr value)"
	
	value := self expression.
	(self stream peekFor: $)) ifFalse: [self error].
%
category: 'other'
method: IndexAst
set: container to: anObject scope: aScope

	| index |
	index := value evaluate: aScope.
	container set: index to: anObject.
%
