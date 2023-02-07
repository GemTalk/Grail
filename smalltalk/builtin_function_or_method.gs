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
abs
	| absFunction |
	"On startup this creates a builtin abs function to find the absolute value of a object"
	absFunction := FunctionDef new
						args: { #number };
						vararg: #'None';
						yourself.
	absFunction block: [ :currentScope |
		|value|
		value := (currentScope at:#number).
		[value  __abs__] on: MessageNotUnderstood do: [TypeError signal.].
	].
	Builtins singleton at: #abs put: absFunction
%
category: 'other'
method: builtin_function_or_method
float
	| floatFunction |
	"On startup this creates a builtin abs function to find the absolute value of a object"
	floatFunction := FunctionDef new
						args: { #object.};
						vararg: #'None';
						yourself.
	floatFunction block: [ :currentScope |
		[ (currentScope at:#object) __float__.]
			on: (MessageNotUnderstood, ImproperOperation)
			do: [
				(currentScope at:#object) class = str ifTrue: [
					ValueError signal:
						'ValueError: could not convert string to float: ',
						(currentScope at:#object) __repr__ ___value.
				] ifFalse: [
				TypeError signal:
					'TypeError: float argument must be a string or a real number, not ''',
					(currentScope at:#object) class asString, ''''
				].
			].
	].
	Builtins singleton at: #float put: floatFunction
%
category: 'other'
method: builtin_function_or_method
initialize
	self
		abs ;
		float ;
		int ;
		len ;
		print ;
		range ;
		type ;
		yourself.
%
category: 'other'
method: builtin_function_or_method
int
	| intFunction |
	"On startup this creates a builtin abs function to find the absolute value of a object"
	intFunction := FunctionDef new
						args: { #object. #base };
						defaults: {int ___value: 10};
						vararg: #'None';
						yourself.
	intFunction block: [ :currentScope |
		| return |
		(currentScope at:#object) class = str ifTrue:[
			Error signal: 'not implemented'.
			ValueError signal:
					'ValueError: invalid literal for int() with base ',
					(currentScope at:#base) __repr__ ___value,
					': ',
					(currentScope at:#object) __repr__ ___value.
		] ifFalse: [
			return := [(currentScope at:#object) __int__]
				on: MessageNotUnderstood
				do: [
					TypeError signal:
						'TypeError: int() argument must be a string, a bytes-like object or a real number, not ''',
						(currentScope at:#object) class asString, ''''
				].
		].
		return
	].
	Builtins singleton at: #int put: intFunction
%
category: 'other'
method: builtin_function_or_method
len
	| lenFunction |
	"On startup this creates a builtin abs function to find the absolute value of a object"
	lenFunction := FunctionDef new
						args: { #object };
						vararg: #'None';
						yourself.
	lenFunction block: [ :currentScope |

		[(currentScope at:#object) __len__]
			on: MessageNotUnderstood
			do: [TypeError signal: 'TypeError: object of type ''', (currentScope at:#object) class asString, ''' has no len()'].
	].
	Builtins singleton at: #len put: lenFunction
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
			| objects sep end file flush |

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
	Builtins singleton at: #print put: print
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
		|varargSize returnObject|
		"varargSize is the length of the varargs the function was passed in with."
		varargSize := (currentScope at:#vararg) ___value size.
		varargSize = 1 ifTrue: [
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1))
		].
		varargSize = 2 ifTrue: [
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1) _: ((currentScope at:#vararg) ___value at: 2))
		].
		varargSize = 3 ifTrue: [
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1) _: ((currentScope at:#vararg) ___value at: 2) _: ((currentScope at:#vararg) ___value at: 3))
		].
		varargSize > 3 ifTrue: [TypeError signal: 'range expected at most 3 arguments, got ', varargSize.].
		returnObject
	].
	Builtins singleton at: #range put: rangeFunction
%
category: 'other'
method: builtin_function_or_method
type
	| typeFunction |
	"On startup this creates a builtin abs function to find the absolute value of a object"
	typeFunction := FunctionDef new
						vararg: #vararg;
						yourself.
	typeFunction block: [ :currentScope |
		|varargSize result|
		varargSize := (currentScope at:#vararg) ___value size.
		varargSize = 1 ifTrue: [result := ((currentScope at:#vararg)  ___value at: 1) class].
		varargSize = 2 ifTrue: [TypeError signal: 'TypeError: type() takes 1 or 3 arguments'].
		varargSize = 3 ifTrue: [self error: 'Should return a new class with name first arg, inheritence second arg, and writeables is the thrid argument'].
		varargSize > 3 ifTrue: [TypeError signal: 'TypeError: type() takes 1 or 3 arguments'].
		result
	].
	Builtins singleton at: #type put: typeFunction
%
