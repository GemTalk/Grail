! ------------------- Remove existing behavior from SetCompAst
expectvalue /Metaclass3       
doit
SetCompAst removeAllMethods.
SetCompAst class removeAllMethods.
%
! ------------------- Class methods for SetCompAst
! ------------------- Instance methods for SetCompAst
set compile_env: 0
category: 'other'
method: SetCompAst
children

	^super children
		add: elt;
		addAll: generators;
		yourself
%
category: 'other'
method: SetCompAst
initialize
	"SetComp(expr elt, comprehension* generators)"

	elt := self expression.
	self commaSpace.
	generators := self collectAst: [ComprehensionAst parent: self].
	self readPosition.
%
