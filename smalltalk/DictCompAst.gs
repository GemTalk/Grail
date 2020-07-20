! ------------------- Remove existing behavior from DictCompAst
expectvalue /Metaclass3       
doit
DictCompAst removeAllMethods.
DictCompAst class removeAllMethods.
%
! ------------------- Class methods for DictCompAst
! ------------------- Instance methods for DictCompAst
set compile_env: 0
category: 'other'
method: DictCompAst
children

	^super children
		add: key;
		add: value;
		addAll: generators;
		yourself
%
category: 'other'
method: DictCompAst
initialize
	"DictComp(expr key, expr value, comprehension* generators)"

	key := self expression.
	self commaSpace.
	value := self expression.
	self commaSpace.
	generators := self collectAst: [ComprehensionAst parent: self].
	self readPosition.
%
