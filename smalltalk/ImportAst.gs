! ------------------- Remove existing behavior from ImportAst
expectvalue /Metaclass3       
doit
ImportAst removeAllMethods.
ImportAst class removeAllMethods.
%
! ------------------- Class methods for ImportAst
! ------------------- Instance methods for ImportAst
set compile_env: 0
category: 'other'
method: ImportAst
evaluate: aScope
	"each name is an instance of AliasAst and that is where the import occurs"

	names do: [:each | each import: aScope].
%
category: 'other'
method: ImportAst
initialize
	"Import(alias* names)"

	names := self collectAst: [self alias].
	self readPosition.
%
