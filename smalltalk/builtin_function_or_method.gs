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
						params: { #number };
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
						params: { #object.};
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
						params: { #object.};
						vararg: #'None';
						yourself.
	chrFunction block: [ :currentScope |
		(currentScope at:#object) class == int
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
dict
	| dictFunction |
	"On startup this creates a builtin dict function to turn a list of kwargs into a dictionary"
	dictFunction := FunctionDef new
						params: { #object };
						defaults: { nil };
						vararg: #'None';
						kwarg: #'kwarg';
						yourself.
	dictFunction block: [ :currentScope |
		|return|
		return :=  dict ___value: Dictionary new.
		(currentScope at: #object) class == UndefinedObject ifFalse:[
			return update: (currentScope at: #object).
		].
		[(currentScope at: #kwarg) __len__ ___value == 0
			ifFalse: [
				return update: (currentScope at: #kwarg).
			].
		] on: NameError do: [].
		return.
	].
	Builtins singleton at: #dict put: dictFunction
%
category: 'other'
method: builtin_function_or_method
float
	| floatFunction |
	"On startup this creates a builtin float function to change strings and anything
		with a float method to a float."
	floatFunction := FunctionDef new
						params: { #object.};
						vararg: #'None';
						yourself.
	floatFunction block: [ :currentScope |
		[ (currentScope at:#object) __float__.]
			on: (MessageNotUnderstood, ImproperOperation)
			do: [
				(currentScope at:#object) class == str ifTrue: [
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
frozenset
	| frozensetFunction |
	"On startup this creates a builtin frozenset function to turn one iterable object into a frozenset"
	frozensetFunction := FunctionDef new
						params: { #object.};
						defaults: { nil };
						vararg: #'None';
						yourself.
	frozensetFunction block: [ :currentScope |
		[
			| return |
			return := {}.
			(currentScope at: #object) class == UndefinedObject
				ifFalse:[
					(currentScope at: #object) class == str
						ifTrue: [
							((currentScope at: #object) ___value)
								do: [ :each | return add: (str ___value: (each asString)).].
						]
						ifFalse: [
							(currentScope at: #object) class == dict
								ifTrue: [
									((currentScope at: #object) keys ___container)
										do: [ :each | return add: each.].
								]
								ifFalse: [
									((currentScope at: #object) ___container)
										do: [ :each | return add: each.].
								].
						].
				].
			frozenset ___value: return
		]
		on: MessageNotUnderstood
		do: [ TypeError signal: 'TypeError: ''', (currentScope at: #object) class asString, ''' object is not iterable' ].
	].
	Builtins singleton at: #frozenset put: frozensetFunction
%
category: 'other'
method: builtin_function_or_method
globals
	| globalsFunction |
	"On startup this creates a builtin repr function to return the value of something's __repr method"
	globalsFunction := FunctionDef new
						params: {};
						vararg: #'None';
						yourself.
	globalsFunction block: [ :currentScope |
		dict ___value: (currentScope globals dict)
	].
	Builtins singleton at: #globals put: globalsFunction
%
category: 'other'
method: builtin_function_or_method
initialize
	self
		abs ;
		bool ;
		chr ;
		dict ;
		float ;
		frozenset ;
		globals ;
		int ;
		len ;
		list ;
		locals ;
		ord ;
		pow ;
		print ;
		range ;
		repr ;
		round ;
		set ;
		str ;
		sum ;
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
						params: { #object. #base };
						defaults: { nil };
						vararg: #'None';
						yourself.
	intFunction block: [ :currentScope |
		| return |
		(currentScope at:#base) class == UndefinedObject
			ifTrue: [ currentScope at:#base put: (int ___value: 10).]
			ifFalse: [
				(currentScope at:#object) class == str
					ifFalse: [
						TypeError signal: 'TypeError: int() can''t convert non-string with explicit base'.
					].
			].
		(currentScope at:#object) class == str ifTrue:[
			| baseConverter |
			((currentScope at:#object) ___value at: 2) isLetter 
				ifTrue:[
					((currentScope at:#object) ___value at:1) == 0
						ifFalse: [
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at:#base) ___value asString,
								': ',
								(currentScope at:#object) value.
						].
					(((currentScope at:#object) ___value at:2) == $b) & ((currentScope at:#base) ___value == 2)
						ifFalse:[
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at:#base) ___value asString,
								': ',
								(currentScope at:#object) value.
						].
					(((currentScope at:#object) ___value at:2) == $o) & ((currentScope at:#base) ___value == 8)
						ifFalse:[
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at:#base) ___value asString,
								': ',
								(currentScope at:#object) value.
						].
					(((currentScope at:#object) ___value at:2) == $h) & ((currentScope at:#base) ___value == 16)
						ifFalse:[
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at:#base) ___value asString,
								': ',
								(currentScope at:#object) value.
						].
				]
				ifFalse: [
					baseConverter := (currentScope at:#base) ___value asString, 'r', (currentScope at:#object) ___value.
					[return := int ___value: baseConverter evaluate.]
						on: Error
						do: [
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at:#base) ___value asString,
								': ',
								(currentScope at:#object) value.
						].
				].
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
						params: { #object };
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
	"On startup this creates a builtin list function to turn one iterable object into a list"
	listFunction := FunctionDef new
						params: { #object.};
						defaults: { nil };
						vararg: #'None';
						yourself.
	listFunction block: [ :currentScope |
		[
			| return |
			return := list ___value: {}.
			(currentScope at: #object) class == UndefinedObject
				ifFalse:[
					(currentScope at: #object) class == str
						ifTrue: [
							((currentScope at: #object) ___value)
								do: [ :each | return append: (str ___value: (each asString)).].
						]
						ifFalse: [
							(currentScope at: #object) class == dict
								ifTrue: [
									((currentScope at: #object) keys ___container)
										do: [ :each | return append: each.].
								]
								ifFalse: [
									((currentScope at: #object) ___container)
										do: [ :each | return append: each.].
								].
						].
				].
			return
		]
		on: MessageNotUnderstood
		do: [ TypeError signal: 'TypeError: ''', (currentScope at: #object) class asString, ''' object is not iterable' ].
	].
	Builtins singleton at: #list put: listFunction
%
category: 'other'
method: builtin_function_or_method
locals
	| localsFunction |
	"On startup this creates a builtin repr function to return the value of something's __repr method"
	localsFunction := FunctionDef new
						params: {};
						vararg: #'None';
						yourself.
	localsFunction block: [ :currentScope |
		dict ___value: (currentScope parent dict)
	].
	Builtins singleton at: #locals put: localsFunction
%
category: 'other'
method: builtin_function_or_method
ord
	| ordFunction |
	"On startup this creates a builtin ord function to turn a character into its unicode integer"
	ordFunction := FunctionDef new
						params: { #object.};
						vararg: #'None';
						yourself.
	ordFunction block: [ :currentScope |
		(currentScope at:#object) class == str
			ifFalse: [
				TypeError signal:
					'TypeError: ord() expected string of length 1, but ',
					(currentScope at:#object) class asString,
					' found'.
			].
		(currentScope at:#object) __len__ ___value == 1 ifFalse:[
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
pow

	"On startup this creates a builtin pow function to return base raised to the pow of exp
	This should work for ints, floats, and complex numbers in any combination"

	| powFunction |
	powFunction := FunctionDef new
						params: {#base. #exp. #mod};
						defaults: {nil};
						vararg: #'None';
						yourself.

	powFunction block: [ :currentScope |
		| result base exp |

		base := (currentScope at: #base).
		exp := (currentScope at: #exp).
		result := base __pow__: exp.
		(currentScope at: #mod) class == UndefinedObject
			ifFalse: [result := result __mod__: (currentScope at: #mod)].

		result.
	].

	Builtins singleton at: #pow put: powFunction
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

			(currentScope at: #file) class == UndefinedObject ifTrue: [currentScope at: #file put:GsFile stdoutServer ].
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
		varargSize == 1 ifTrue: [
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1))
		].
		varargSize == 2 ifTrue: [
			returnObject := (range new __init__:((currentScope at:#vararg) ___value at: 1) _: ((currentScope at:#vararg) ___value at: 2))
		].
		varargSize == 3 ifTrue: [
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
						params: { #object };
						vararg: #'None';
						yourself.
	reprFunction block: [ :currentScope |

		(currentScope at:#object) __repr__
	].
	Builtins singleton at: #repr put: reprFunction
%
category: 'other'
method: builtin_function_or_method
round
	| roundFunction |
	"On startup this creates a builtin repr function to return the value of something's __repr method"
	roundFunction := FunctionDef new
						params: { #object. #ndigits};
						defaults: { int ___value: 0 };
						vararg: #'None';
						yourself.
	roundFunction block: [ :currentScope |
		| result |

		(currentScope at: #ndigits) ___value == 0
			ifTrue: [
				result := (currentScope at: #object) __round__
			]
			ifFalse: [
				result := float ___value: (((currentScope at: #object) ___value * (10 raisedTo: (currentScope at: #ndigits) ___value)) rounded) / (10 raisedTo: (currentScope at: #ndigits) ___value) asFloat.

			].
		result.
	].
	Builtins singleton at: #round put: roundFunction
%
category: 'other'
method: builtin_function_or_method
set
	| setFunction |
	"On startup this creates a builtin set function to turn one iterable object into a set"
	setFunction := FunctionDef new
						params: { #object.};
						defaults: { nil };
						vararg: #'None';
						yourself.
	setFunction block: [ :currentScope |
		[
			| return |
			return := set ___value: {}.
			(currentScope at: #object) class == UndefinedObject
				ifFalse:[
					(currentScope at: #object) class == str
						ifTrue: [
							((currentScope at: #object) ___value)
								do: [ :each | return add: (str ___value: (each asString)).].
						]
						ifFalse: [
							(currentScope at: #object) class == dict
								ifTrue: [
									((currentScope at: #object) keys ___container)
										do: [ :each | return add: each.].
								]
								ifFalse: [
									((currentScope at: #object) ___container)
										do: [ :each | return add: each.].
								].
						].
				].
			return
		]
		on: MessageNotUnderstood
		do: [ TypeError signal: 'TypeError: ''', (currentScope at: #object) class asString, ''' object is not iterable' ].
	].
	Builtins singleton at: #set put: setFunction
%
category: 'other'
method: builtin_function_or_method
str
	| strFunction |
	"On startup this creates a builtin str function to return anything with a __str__ method"
	strFunction := FunctionDef new
						params: { #object };
						vararg: #'None';
						yourself.
	strFunction block: [ :currentScope |

		(currentScope at:#object) __str__
	].
	Builtins singleton at: #str put: strFunction
%
category: 'other'
method: builtin_function_or_method
sum
	| sumFunction |
	"On startup this creates a builtin int function to turn anything with a __int__ method
		or that is a string into an int"
	sumFunction := FunctionDef new
						params: { #object. #start };
						defaults: { int ___value: 0 };
						vararg: #'None';
						yourself.
	sumFunction block: [ :currentScope |
		| sum integer summer|
		sum := (complex ___real: 0 imaginary: 0).
		summer := (currentScope at: #list) scope: currentScope
										 positional: {(currentScope at: #object)}
										 named: {}.
		integer := true.
		((currentScope at: #start) ___value) to: (summer  ___size - 1)
			do: [ :element |
				|holder|
				holder := (summer __getitem__: (int ___value: element)).
				holder class = float
					ifTrue:[
						integer := false.
					].
				sum := sum __add__: holder.
			].
		sum imag ___value == 0
			ifTrue:[
				sum := sum real.
				integer ifTrue: [
						sum := int ___value: (sum ___value).
					].
			].
		sum
	].
	Builtins singleton at: #sum put: sumFunction
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
		varargSize == 1 ifTrue: [result := ((currentScope at:#vararg)  ___value at: 1) class].
		varargSize == 2 ifTrue: [TypeError signal: 'TypeError: type() takes 1 or 3 arguments'].
		varargSize == 3 ifTrue: [self error: 'Should return a new class with name first arg, inheritence second arg, and writeables is the thrid argument'].
		varargSize > 3 ifTrue: [TypeError signal: 'TypeError: type() takes 1 or 3 arguments'].
		result
	].
	Builtins singleton at: #type put: typeFunction
%
