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

	(path = aPath and: [statements notNil]) ifTrue: [^statements].
	path := aPath.
	statements := (PyModule script:  aPath) _statements.
	^statements
%
