! ------------------- Remove existing behavior from builtin_function_or_method
removeAllMethods builtin_function_or_method
removeAllClassMethods builtin_function_or_method
! ------------------- Class methods for builtin_function_or_method
set compile_env: 0
category: 'other'
classmethod: builtin_function_or_method
instance
	
	^self new
%
! ------------------- Instance methods for builtin_function_or_method
set compile_env: 0
category: 'other'
method: builtin_function_or_method
print: currentScope

	"https://docs.python.org/3/library/functions.html#print"

	| sep end file flush|
	sep := currentScope at: #sep ifAbsent: ''.
	end := currentScope at: #end ifAbsent: Character cr.
	" TODO file should be a python object that has a write(string) method. By default, Python uses sys.stdout. Currently just needs to be a WriteStream or a GsFile. "
	file := currentScope at: #file ifAbsent: GsFile stdoutServer.
	flush := currentScope at: #flush ifAbsent: false.

	(sep class superClass ~= String and: [ sep class ~= NoneType and: [ sep class ~= Character]]) ifTrue: [ TypeError signal: 'sep must be None or a string, not ', sep class name ].
	(end class superClass ~= String and: [ end class ~= NoneType and: [ end class ~= Character]]) ifTrue: [ TypeError signal: 'end must be None or a string, not ', end class name ].
	" TODO verify file is an object that has a 'write' method. AttributeError: 'str' object has no attribute 'write' "
	" TODO implicitly convert flush to a bool "
	
	"file nextPutAll: (currentScope at: #objects) ___value removeFirst __str__ ___value."
	(currentScope at: #objects) do: [ :element |
		1 to: element __len__ do: [:index |
			file nextPutAll: sep; nextPutAll: ( (element __str__ ___value) at: index).
		].
	].
	file nextPutAll: end.
	(currentScope at: #file) ifNil: [ file close ].
%
