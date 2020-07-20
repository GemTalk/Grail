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
_names
	^ names
%
category: 'other'
method: ImportAst
children

	^super children
		addAll: names;
		yourself
%
category: 'other'
method: ImportAst
evaluate

	self halt.
"
	names do: [:each |
		| module |
		module := Builtins current
			__import__: each name
			_: self globals
			_: self locals
			_: #()
			_: 0.
		module halt.
	].
"
%
category: 'other'
method: ImportAst
initialize
	"Import(alias* names)"

	names := self collectAst: [self alias].
	self readPosition.
%
