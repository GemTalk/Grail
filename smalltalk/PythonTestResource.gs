! ------------------- Remove existing behavior from PythonTestResource
expectvalue /Metaclass3       
doit
PythonTestResource removeAllMethods.
PythonTestResource class removeAllMethods.
%
! ------------------- Class methods for PythonTestResource
! ------------------- Instance methods for PythonTestResource
set compile_env: 0
category: 'other'
method: PythonTestResource
statementsForModuleAtPath: aPath

	| module |
	(path = aPath and: [statements notNil]) ifTrue: [^statements].
	path := aPath.
	module := PyModule script:  aPath.
	statements := module.body.
	^statements
%
