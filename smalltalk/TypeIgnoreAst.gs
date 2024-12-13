! ------------------- Remove existing behavior from TypeIgnoreAst
removeallmethods TypeIgnoreAst
removeallclassmethods TypeIgnoreAst
! ------------------- Class methods for TypeIgnoreAst
! ------------------- Instance methods for TypeIgnoreAst
category: 'other'
method: TypeIgnoreAst
initialize
	"type_ignore = TypeIgnore(int lineno, string tag)"

	| stream |
	stream := self stream.
	lineno := self number.
	self commaSpace.
	tag := self string.
	self readPosition.
%
