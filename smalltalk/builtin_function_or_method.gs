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
initialize
	self print range.
%
category: 'other'
method: builtin_function_or_method
print
	"this function prints the items stored in vararg
	vararg	- items to be printed
	sep		- character seperating each printed item
	end		- character at the end of the printed items
	file		- the file or stream where the elements are printed
	flush		- a boolean, on True the printing cache is flushed"
	| print |
	print := FunctionDef new
						vararg: #vararg;
						kwonlyargs: { #sep. #end. #file. #flush };
						kw_defaults: {str ___value: ''. str ___value: Character lf. nil. bool ___value: False};
						yourself.
	print block: [ :currentScope |
			| objects sep end file flush vars|
			vars := #(x objects sep end file flush) asIdentitySet.
			(currentScope at: #file) = nil ifTrue: [currentScope at: #file put:GsFile stdoutServer ].
			objects := (currentScope at: #vararg) ___value.
			sep := currentScope at: #sep.
			end := currentScope at: #end.
			" TODO file should be a python object that has a write(string) method. By default, Python uses sys.stdout. Currently just needs to be a WriteStream or a GsFile. "
			file := currentScope at: #file.
			flush := currentScope at: #flush.

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
	builtins at: #print put: print
%
category: 'other'
method: builtin_function_or_method
range
	| rangeFunction |
	"On startup this creates a builtin range function to convert an interval in to a range object"
	rangeFunction := FunctionDef new
						vararg: #vararg;
						yourself.
	rangeFunction block: [ :currentScope |
		|varargSize returnObject vars|
		"varargSize is the length of the varargs the function was passed in with."
		vars := #(varargSize returnObject) asIdentitySet.
		vars remove: varargSize ifAbsent: [].
		varargSize := (currentScope at:#vararg) ___value size.
		varargSize = 1 ifTrue: [
			vars remove: returnObject ifAbsent: [].
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1))
		].
		varargSize = 2 ifTrue: [
			vars remove: returnObject ifAbsent: [].
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1) _: ((currentScope at:#vararg) ___value at: 2))
		].
		varargSize = 3 ifTrue: [
			vars remove: returnObject ifAbsent: [].
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1) _: ((currentScope at:#vararg) ___value at: 2) _: ((currentScope at:#vararg) ___value at: 3))
		].
		varargSize > 3 ifTrue: [TypeError signal: 'range expected at most 3 arguments, got '.].
		returnObject
	].
	builtins at: #range put: rangeFunction
%
