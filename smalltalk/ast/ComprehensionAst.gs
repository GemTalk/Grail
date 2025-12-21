! ------------------- Remove existing behavior from ComprehensionAst
removeallmethods ComprehensionAst
removeallclassmethods ComprehensionAst
! ------------------- Class methods for ComprehensionAst
! ------------------- Instance methods for ComprehensionAst
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
	ifs := self collectAst: [self expression].
	self commaSpace.
	is_async := (stream upTo: $)) asNumber == 1.
%
