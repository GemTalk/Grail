! ------------------- Remove existing behavior from PyListComp
expectvalue /Metaclass3       
doit
PyListComp removeAllMethods.
PyListComp class removeAllMethods.
%
! ------------------- Class methods for PyListComp
! ------------------- Instance methods for PyListComp
set compile_env: 0
category: 'other'
method: PyListComp
children

	^super children
		add: elt;
		addAll: generators;
		yourself
%
category: 'other'
method: PyListComp
initialize
	"ListComp(expr elt, comprehension* generators)"
	| stream |
	stream := self stream.
	elt := self expression.
	self commaSpace.
	generators := self collectAst: [PyComprehension parent: self].
	self readPosition.
%
