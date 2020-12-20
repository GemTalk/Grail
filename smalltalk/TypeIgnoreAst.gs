! ------------------- Remove existing behavior from TypeIgnoreAst
removeAllMethods TypeIgnoreAst
removeAllClassMethods TypeIgnoreAst
! ------------------- Class methods for TypeIgnoreAst
! ------------------- Instance methods for TypeIgnoreAst
set compile_env: 0
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
