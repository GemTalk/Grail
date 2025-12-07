! ------------------- Remove existing behavior from PythonTestResource
removeallmethods PythonTestResource
removeallclassmethods PythonTestResource
! ------------------- Class methods for PythonTestResource
! ------------------- Instance methods for PythonTestResource
category: 'other'
method: PythonTestResource
moduleAtPath: aPath

	(path = aPath and: [module notNil]) ifTrue: [^module].
	path := aPath.
	module := ModuleAst script: aPath.
	^module
%
