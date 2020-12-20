! ------------------- Remove existing behavior from PythonTestResource
removeAllMethods PythonTestResource
removeAllClassMethods PythonTestResource
! ------------------- Class methods for PythonTestResource
! ------------------- Instance methods for PythonTestResource
set compile_env: 0
category: 'other'
method: PythonTestResource
moduleAtPath: aPath

	(path = aPath and: [module notNil]) ifTrue: [^module].
	path := aPath.
	module := ModuleAst script: aPath.
	^module
%
category: 'other'
method: PythonTestResource
setUp

	super setUp.
	builtins clearCurrent.
%
