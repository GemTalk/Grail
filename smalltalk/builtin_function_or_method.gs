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
print
	| printFunction |
	printFunction := FunctionDef new
						vararg: #vararg;
						kwonlyargs: { #sep. #end. #file. #flush };
						kw_defaults: {str ___value: ''. str ___value: Character lf. GsFile stdoutServer. bool ___value: False};
						yourself.
	printFunction block: [ :currentScope |
			| objects sep end file flush |
			objects := (currentScope at: #vararg) ___value.
			sep := currentScope at: #sep ifAbsent: (str ___value: '').
			end := currentScope at: #end ifAbsent: (str ___value: Character lf).
			" TODO file should be a python object that has a write(string) method. By default, Python uses sys.stdout. Currently just needs to be a WriteStream or a GsFile. "
			file := currentScope at: #file ifAbsent: GsFile stdoutServer.
			flush := currentScope at: #flush ifAbsent: (bool ___value: False).

			(sep class ~= str) ifTrue: [ TypeError signal: 'sep must be a str, not ', sep class name ].
			(end class ~= str) ifTrue: [ TypeError signal: 'end must be a str, not ', end class name ].
			" TODO verify file is an object that has a 'write' method. AttributeError: 'str' object has no attribute 'write' "
			" TODO implicitly convert flush to a bool "

			(1 to: (objects size-1)) do: [:index | file nextPutAll: ((objects at:index) __str__ ___value); nextPutAll: (sep __str__ ___value).].
			file nextPutAll: (objects at:objects size) __str__ ___value.
			file nextPutAll: (end __str__ ___value).
			flush ___value ifTrue: [file flush].
			file close.
		].
	builtins at: #print put: printFunction
%
