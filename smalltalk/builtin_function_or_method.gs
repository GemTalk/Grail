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
bar

	| y |
	
	y := Notification signal.
	^y * 2
%
category: 'other'
method: builtin_function_or_method
foo

	| bar x |
	x := 1.
	bar := [
		| y |
		x := 2.
		y := x.
	].
	[
		x := bar value.
	] on: Notification do: [ :ex |
		ex resume: 5.
	].
	^bar
%
category: 'other'
method: builtin_function_or_method
print: currentScope

	"https://docs.python.org/3/library/functions.html#print"

	| sep end file flush |
	sep := currentScope at: #'sep' ifAbsent: [ str ___value: Character space asString ].
	end := currentScope at: #'end' ifAbsent: [ str ___value: Character lf asString ].
	" TODO file should be a python object that has a write(string) method. By default, Python uses sys.stdout. Currently just needs to be a WriteStream or a GsFile. "
	file := currentScope at: #'file' ifAbsent: [ GsFile stdoutServer ].
	flush := currentScope at: #'flush' ifAbsent: [ False ].

	(sep class ~= str and: [ sep class ~= NoneType ]) ifTrue: [ TypeError signal: 'sep must be None or a string, not ', sep class name ].
	(end class ~= str and: [ end class ~= NoneType ]) ifTrue: [ TypeError signal: 'end must be None or a string, not ', end class name ].
	" TODO verify file is an object that has a 'write' method. AttributeError: 'str' object has no attribute 'write' "
	" TODO implicitly convert flush to a bool "
	
	file nextPutAll: (currentScope at: #'positional') removeFirst ___value.
	(currentScope at: #'positional') do: [ :each |
		file nextPutAll: sep ___value; nextPutAll: each __str__ ___value.
	].
	file nextPutAll: end ___value.
%
category: 'other'
method: builtin_function_or_method
print: positionalParameters _: namedParameters

	"https://docs.python.org/3/library/functions.html#print"

	| sep end file flush |
	sep := namedParameters at: #'sep' ifAbsent: [ str ___value: Character space asString ].
	end := namedParameters at: #'end' ifAbsent: [ str ___value: Character lf asString ].
	" TODO file should be a python object that has a write(string) method. By default, Python uses sys.stdout. Currently just needs to be a WriteStream or a GsFile. "
	file := namedParameters at: #'file' ifAbsent: [ GsFile stdoutServer ].
	flush := namedParameters at: #'flush' ifAbsent: [ False ].

	(sep class ~= str and: [ sep class ~= NoneType ]) ifTrue: [ TypeError signal: 'sep must be None or a string, not ', sep class name ].
	(end class ~= str and: [ end class ~= NoneType ]) ifTrue: [ TypeError signal: 'end must be None or a string, not ', end class name ].
	" TODO verify file is an object that has a 'write' method. AttributeError: 'str' object has no attribute 'write' "
	" TODO implicitly convert flush to a bool "
	
	file nextPutAll: positionalParameters removeFirst ___value.
	positionalParameters do: [ :each |
		file nextPutAll: sep ___value; nextPutAll: each __str__ ___value.
	].
	file nextPutAll: end ___value.
%
