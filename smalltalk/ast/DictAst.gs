! ------------------- Remove existing behavior from DictAst
removeallmethods DictAst
removeallclassmethods DictAst
set compile_env: 0
! ------------------- Class methods for DictAst
! ------------------- Instance methods for DictAst
category: 'other'
method: DictAst
initialize
	"Dict(expr* keys, expr* values)"

	keys := self collectAst: [self expression].
	self commaSpace.
	values := self collectAst: [self expression].
	self readPosition.
%
category: 'other'
method: DictAst
printSmalltalkOn: aStream

	self halt.
%
