! ------------------- Remove existing behavior from DictAst
removeAllMethods DictAst
removeAllClassMethods DictAst
! ------------------- Class methods for DictAst
! ------------------- Instance methods for DictAst
set compile_env: 0
category: 'other'
method: DictAst
initialize
	"Dict(expr* keys, expr* values)"

	keys := self collectAst: [self expression].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
