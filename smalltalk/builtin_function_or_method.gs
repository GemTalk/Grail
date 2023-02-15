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
bool
	| boolFunction |
	"On startup this creates a builtin bool function to turn any object into a boolean value"
	boolFunction := FunctionDef new
						args: { #object.};
						vararg: #'None';
						yourself.
	boolFunction block: [ :currentScope |
		[ (currentScope at:#object) __bool__.]
			on: MessageNotUnderstood
			do: [
				[bool ___value: (currentScope at:#object) __len__ ___value  ~= 0]
					on: MessageNotUnderstood
					do: [True]
			].
	].
	Builtins singleton at: #bool put: boolFunction
%
category: 'other'
method: builtin_function_or_method
chr
	| chrFunction |
	"On startup this creates a builtin chr function to change an integer into a character"
	chrFunction := FunctionDef new
						args: { #object.};
						vararg: #'None';
						yourself.
	chrFunction block: [ :currentScope |
		(currentScope at:#object) class = int
			ifFalse: [
				TypeError signal: 'TypeError: ', (currentScope at:#object) class asString,
					'object cannot be interpreted as an integer'.
			].
		str ___value: (currentScope at:#object) ___value asCharacter asString.
	].
	Builtins singleton at: #chr put: chrFunction
%
category: 'other'
method: builtin_function_or_method
float
	| floatFunction |
	"On startup this creates a builtin float function to change strings and anything
		with a float method to a float."
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
		bool ;
		chr ;
		float ;
		int ;
		len ;
		list ;
		ord ;
		print ;
		range ;
		repr ;
		str ;
		type ;
		yourself.
%
category: 'other'
method: builtin_function_or_method
int
	| intFunction |
	"On startup this creates a builtin int function to turn anything with a __int__ method
		or that is a string into an int"
	intFunction := FunctionDef new
						args: { #object. #base };
						defaults: {None};
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
	"On startup this creates a builtin len function to return the length of anything that has a __len method"
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
list
	| listFunction |
	"On startup this creates a builtin list function to turn one iterable object into another"
	listFunction := FunctionDef new
						args: { #object.};
						defaults: { None };
						vararg: #'None';
						yourself.
	listFunction block: [ :currentScope |
		[
			| return |
			return := list ___value: {}.
			(currentScope at: object) = None
				ifFalse:[
					(currentScope at: object) class = str
						ifTrue: [
							((currentScope at: object) ___value)
								do: [ :each | list add: (str ___value: (each asString)).].
						]
						ifFalse: [
							((currentScope at: object) ___container)
								do: [ :each | list add: each.].
						].
				].
			return
		]
		on: MessageNotUnderstood
		do: [ TypeError signal: 'TypeError: ''', (currentScope at: object) class asString, ''' object is not iterable' ].
	].
	Builtins singleton at: #list put: listFunction
%
category: 'other'
method: builtin_function_or_method
ord
	| ordFunction |
	"On startup this creates a builtin ord function to turn a character into its unicode integer"
	ordFunction := FunctionDef new
						args: { #object.};
						vararg: #'None';
						yourself.
	ordFunction block: [ :currentScope |
		(currentScope at:#object) class = str
			ifFalse: [
				TypeError signal:
					'TypeError: ord() expected string of length 1, but ',
					(currentScope at:#object) class asString,
					' found'.
			].
		(currentScope at:#object) __len__ = 1 ifFalse:[
				TypeError signal:
					'TypeError: ord() expected a character, but string of length ',
					(currentScope at:#object) __len__ asString,
					' found'.
		].
		int ___value: (currentScope at:#object) ___value first codePoint.
	].
	Builtins singleton at: #ord put: ordFunction
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
repr
	| reprFunction |
	"On startup this creates a builtin repr function to return the value of something's __repr method"
	reprFunction := FunctionDef new
						args: { #object };
						vararg: #'None';
						yourself.
	reprFunction block: [ :currentScope |

		(currentScope at:#object) __repr__
	].
	Builtins singleton at: #repr put: reprFunction
%
category: 'other'
method: builtin_function_or_method
str
	| strFunction |
	"On startup this creates a builtin str function to return anything with a __str__ method"
	strFunction := FunctionDef new
						args: { #object };
						vararg: #'None';
						yourself.
	strFunction block: [ :currentScope |

		(currentScope at:#object) __str__
	].
	Builtins singleton at: #str put: strFunction
%
category: 'other'
method: builtin_function_or_method
type
	| typeFunction |
	"On startup this creates a builtin type function to return the type of a function or create a new type"
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
