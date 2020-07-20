! ------------------- Remove existing behavior from WithAst
expectvalue /Metaclass3       
doit
WithAst removeAllMethods.
WithAst class removeAllMethods.
%
! ------------------- Class methods for WithAst
! ------------------- Instance methods for WithAst
set compile_env: 0
category: 'other'
method: WithAst
children

	^super children
		addAll: items;
		add: body;
		yourself
%
category: 'other'
method: WithAst
initialize
	"With(withitem* items, stmt* body)"

	items := self collectAst: [WithItemAst parent: self].
	self commaSpace.
	body := SuiteAst parent: self.
	self readPosition.
%
