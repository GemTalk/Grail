! ------------------- Remove existing behavior from ComprehensionAst
expectvalue /Metaclass3
doit
ComprehensionAst removeAllMethods.
ComprehensionAst class removeAllMethods.
%
! ------------------- Class methods for ComprehensionAst
! ------------------- Instance methods for ComprehensionAst
set compile_env: 0
category: 'other'
method: ComprehensionAst
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
	is_async := (stream upTo: $)) asNumber == 1.
%
