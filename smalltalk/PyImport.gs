! ------------------- Remove existing behavior from PyImport
expectvalue /Metaclass3       
doit
PyImport removeAllMethods.
PyImport class removeAllMethods.
%
! ------------------- Class methods for PyImport
! ------------------- Instance methods for PyImport
set compile_env: 0
category: 'other'
method: PyImport
_names
	^ names
%
category: 'other'
method: PyImport
evaluate
	(names size == 1 and: [names first name = 'random']) ifTrue: [
		parent variableAt: names first put: PyRandom new.
		^self
	].
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
method: PyImport
initialize
	"Import(alias* names)"

	names := self collectAst: [ self alias ].
	self readPosition.
%
