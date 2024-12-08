! ------------------- Remove existing behavior from ImportAst
removeallmethods ImportAst
removeallclassmethods ImportAst
! ------------------- Class methods for ImportAst
! ------------------- Instance methods for ImportAst
category: 'other'
method: ImportAst
initialize
	"Import(alias* names)"

	names := self collectAst: [self alias].
	self readPosition.
%
