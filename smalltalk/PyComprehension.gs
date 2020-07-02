! ------------------- Remove existing behavior from PyComprehension
expectvalue /Metaclass3       
doit
PyComprehension removeAllMethods.
PyComprehension class removeAllMethods.
%
! ------------------- Class methods for PyComprehension
! ------------------- Instance methods for PyComprehension
set compile_env: 0
category: 'other'
method: PyComprehension
initialize
	"comprehension = (expr target, expr iter, expr* ifs, int is_async)"

	| stream x |
	stream := self stream.
	x := stream upTo: $(.
	x ~= 'comprehension' ifTrue: [self error].
	target := self expression.
	self commaSpace.
	iter := self expression.
	self commaSpace.
	ifs := self collectAst:[self expression].
	self commaSpace.
	is_async := (stream upTo: $)) asNumber.
%
