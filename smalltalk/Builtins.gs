! ------------------- Remove existing behavior from builtins
removeallmethods builtins
removeallclassmethods builtins
! ------------------- Class methods for builtins
! ------------------- Instance methods for builtins
category: 'other'
method: builtins
__import__
	"On startup this creates a builtin function to import a module"
	"__import__(name, globals=None, locals=None, fromlist=(), level=0)"

	| function |
	function := FunctionDef new
		params: { #name. #globals. #locals. #fromlist. #level. };
		defaults: { nil. None. None. list ___value: #(). 0. };
		yourself.
	function block: [:currentScope |
		| name class |
		name := currentScope at: #'name'.
		class := Python at: name ifAbsent: [nil].
		class ifNil: [None] ifNotNil: [class instance].
	].
	Builtins singleton at: #'__import__' put: function.
%
category: 'other'
method: builtins
abs
	"On startup this creates a builtin abs function to find the absolute value of a object"

	| function |
	function := FunctionDef new
		params: { #number };
		yourself.
	function block: [:currentScope |
		| value |
		value := currentScope at: #number.
		[value  __abs__] on: MessageNotUnderstood do: [TypeError signal].
	].
	Builtins singleton at: #abs put: function.
%
category: 'other'
method: builtins
all
	"On startup this creates a builtin all function to check if all elements are truthy"

	| function |
	function := FunctionDef new
		params: { #iterable };
		yourself.
	function block: [:currentScope |
		| iterable result |
		iterable := currentScope at: #iterable.
		result := true.
		[
			iterable ___container do: [:each |
				[(each __bool__) ___value ifFalse: [result := false]]
					on: MessageNotUnderstood
					do: [
						[(each __len__) ___value == 0 ifTrue: [result := false]]
							on: MessageNotUnderstood
							do: [].
					].
			].
		] on: MessageNotUnderstood do: [
			TypeError signal: 'TypeError: ''', iterable class asString, ''' object is not iterable'.
		].
		bool ___value: result.
	].
	Builtins singleton at: #all put: function.
%
category: 'other'
method: builtins
any
	"On startup this creates a builtin any function to check if any element is truthy"

	| function |
	function := FunctionDef new
		params: { #iterable };
		yourself.
	function block: [:currentScope |
		| iterable result |
		iterable := currentScope at: #iterable.
		result := false.
		[
			iterable ___container do: [:each |
				[(each __bool__) ___value ifTrue: [result := true]]
					on: MessageNotUnderstood
					do: [
						[(each __len__) ___value ~= 0 ifTrue: [result := true]]
							on: MessageNotUnderstood
							do: [result := true].
					].
			].
		] on: MessageNotUnderstood do: [
			TypeError signal: 'TypeError: ''', iterable class asString, ''' object is not iterable'.
		].
		bool ___value: result.
	].
	Builtins singleton at: #any put: function.
%
category: 'other'
method: builtins
bin
	"On startup this creates a builtin bin function to convert an integer to a binary string"

	| function |
	function := FunctionDef new
		params: { #number };
		yourself.
	function block: [:currentScope |
		| number value |
		number := currentScope at: #number.
		number class == int ifFalse: [
			TypeError signal: 'TypeError: ''', number class asString, ''' object cannot be interpreted as an integer'.
		].
		value := number ___value.
		value < 0
			ifTrue: [str ___value: '-0b', (value negated printStringRadix: 2)]
			ifFalse: [str ___value: '0b', (value printStringRadix: 2)].
	].
	Builtins singleton at: #bin put: function.
%
category: 'other'
method: builtins
bool
	"On startup this creates a builtin bool function to turn any object into a boolean value"

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		[(currentScope at: #object) __bool__]
			on: MessageNotUnderstood
			do: [
				[bool ___value: (currentScope at: #object) __len__ ___value  ~= 0]
					on: MessageNotUnderstood
					do: [True]
			].
	].
	Builtins singleton at: #bool put: function.
%
category: 'other'
method: builtins
callable
	"On startup this creates a builtin callable function to check if an object is callable"

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		| obj |
		obj := currentScope at: #object.
		bool ___value: (obj class == FunctionDef or: [obj class includesBehavior: builtin_function_or_method]).
	].
	Builtins singleton at: #callable put: function.
%
category: 'other'
method: builtins
chr
	"On startup this creates a builtin chr function to change an integer into a character"

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		(currentScope at: #object) class == int
			ifFalse: [
				TypeError signal: 'TypeError: ', (currentScope at: #object) class asString,
					'object cannot be interpreted as an integer'.
			].
		str ___value: (currentScope at: #object) ___value asCharacter asString.
	].
	Builtins singleton at: #chr put: function.
%
category: 'other'
method: builtins
complex
	"On startup this creates a builtin chr function to change an integer into a character"

	| function |
	function := FunctionDef new
		params: { #real. #imag };
		yourself.
	function block: [:currentScope |
		complex ___real: ((currentScope at: #real) ___value) imaginary: ((currentScope at: #imag) ___value)
	].
	Builtins singleton at: #complex put: function.
%
category: 'other'
method: builtins
dict
	"On startup this creates a builtin dict function to turn a list of kwargs into a dictionary"

	| function |
	function := FunctionDef new
		params: { #object };
		defaults: { nil };
		kwarg: #'kwarg';
		yourself.
	function block: [:currentScope |
		| return |
		return :=  dict ___value: Dictionary new.
		(currentScope at: #object) ~~ nil ifTrue: [
			return update: (currentScope at: #object).
		].
		[(currentScope at: #kwarg) __len__ ___value ~~ 0
			ifTrue: [
				return update: (currentScope at: #kwarg).
			].
		] on: NameError do: [].
		return.
	].
	Builtins singleton at: #dict put: function.
%
category: 'other'
method: builtins
dir
	"On startup this creates a builtin dir function to list attributes of an object"

	| function |
	function := FunctionDef new
		params: { #object };
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		| obj result |
		obj := currentScope at: #object.
		result := list ___value: {}.
		obj == nil
			ifTrue: [
				currentScope dict keysDo: [:key | result append: (str ___value: key asString)].
			]
			ifFalse: [
				obj class allInstVarNames do: [:name | result append: (str ___value: name asString)].
				obj class selectors do: [:sel | result append: (str ___value: sel asString)].
			].
		result.
	].
	Builtins singleton at: #dir put: function.
%
category: 'other'
method: builtins
divmod
	"On startup this creates a builtin divmod function to return quotient and remainder"

	| function |
	function := FunctionDef new
		params: { #a. #b };
		yourself.
	function block: [:currentScope |
		| a b quotient remainder |
		a := currentScope at: #a.
		b := currentScope at: #b.
		quotient := a __floordiv__: b.
		remainder := a __mod__: b.
		tuple ___value: { quotient. remainder }.
	].
	Builtins singleton at: #divmod put: function.
%
category: 'other'
method: builtins
exit
	"On startup this creates a builtin exit function to exit the REPL (alias for quit)"

	| function |
	function := FunctionDef new
		params: { #code };
		defaults: { int ___value: 0 };
		yourself.
	function block: [:currentScope |
		| code status |
		code := currentScope at: #code.
		status := code class == int
			ifTrue: [code ___value]
			ifFalse: [0].
		ExitClientError signal: 'exit() called' status: status.
	].
	Builtins singleton at: #exit put: function.
%
category: 'other'
method: builtins
float
	"On startup this creates a builtin float function to change strings and anything
		with a float method to a float."

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		[(currentScope at: #object) __float__]
			on: (MessageNotUnderstood, ImproperOperation)
			do: [
				(currentScope at: #object) class == str ifTrue: [
					ValueError signal:
						'ValueError: could not convert string to float: ',
						(currentScope at: #object) __repr__ ___value.
				] ifFalse: [
				TypeError signal:
					'TypeError: float argument must be a string or a real number, not ''',
					(currentScope at: #object) class asString, ''''
				].
			].
	].
	Builtins singleton at: #float put: function.
%
category: 'other'
method: builtins
frozenset
	"On startup this creates a builtin frozenset function to turn one iterable object into a frozenset"

	| function |
	function := FunctionDef new
		params: { #object };
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		[
			| return |
			return := {}.
			(currentScope at: #object) class == UndefinedObject
				ifFalse: [
					(currentScope at: #object) class == str ifTrue: [
							(currentScope at: #object) ___value
								do: [:each | return add: (str ___value: each asString)].
						] ifFalse: [
							(currentScope at: #object) class == dict ifTrue: [
									((currentScope at: #object) keys ___container)
										do: [:each | return add: each].
								] ifFalse: [
									((currentScope at: #object) ___container)
										do: [:each | return add: each].
								].
						].
				].
			frozenset ___value: return.
		]
		on: MessageNotUnderstood
		do: [TypeError signal: 'TypeError: ''', (currentScope at: #object) class asString, ''' object is not iterable'].
	].
	Builtins singleton at: #frozenset put: function.
%
category: 'other'
method: builtins
globals
	"On startup this creates a builtin global function"

	| function |
	function := FunctionDef new
		params: {};
		yourself.
	function block: [:currentScope |
		dict ___value: (currentScope globals dict)
	].
	Builtins singleton at: #globals put: function.
%
category: 'other'
method: builtins
hex
	"On startup this creates a builtin hex function to convert an integer to a hexadecimal string"

	| function |
	function := FunctionDef new
		params: { #number };
		yourself.
	function block: [:currentScope |
		| number value |
		number := currentScope at: #number.
		number class == int ifFalse: [
			TypeError signal: 'TypeError: ''', number class asString, ''' object cannot be interpreted as an integer'.
		].
		value := number ___value.
		value < 0
			ifTrue: [str ___value: '-0x', (value negated printStringRadix: 16) asLowercase]
			ifFalse: [str ___value: '0x', (value printStringRadix: 16) asLowercase].
	].
	Builtins singleton at: #hex put: function.
%
category: 'other'
method: builtins
initialize
	self
		__import__;
		abs;
		all;
		any;
		bin;
		bool;
		callable;
		chr;
		complex;
		dict;
		dir;
		divmod;
		exit;
		float;
		frozenset;
		globals;
		hex;
		input;
		int;
		isinstance;
		issubclass;
		len;
		list;
		locals;
		max;
		min;
		oct;
		open;
		ord;
		pow;
		print;
		quit;
		range;
		repr;
		round;
		set;
		sorted;
		str;
		sum;
		tuple;
		type;
		yourself.
%
category: 'other'
method: builtins
input
	"On startup this creates a builtin int function to turn anything with a __int__ method
		or that is a string into an int"

	| function |
	function := FunctionDef new
		params: { #object };
		defaults: { str ___value: '' };
		yourself.
	function block: [:currentScope |
		str ___value: ((System __sessionStateAt: 3)
			prompt: (currentScope at: #object) ___value
			caption: 'Input') decodeToString
	].
	Builtins singleton at: #input put: function.
%
category: 'other'
method: builtins
int
	"On startup this creates a builtin int function to turn a string or anything with a __int__ method into an int"

	| function |
	function := FunctionDef new
		params: { #object. #base };
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		| return |
		(currentScope at: #base) == nil
			ifTrue: [currentScope at: #base put: (int ___value: 10)]
			ifFalse: [
				(currentScope at: #object) class == str
					ifFalse: [
						TypeError signal: 'TypeError: int() can''t convert non-string with explicit base'.
					].
			].
		(currentScope at: #object) class == str ifTrue: [
			| baseConverter |
			((currentScope at: #object) ___value at: 2) isLetter 
				ifTrue: [
					((currentScope at: #object) ___value at: 1) == 0
						ifFalse: [
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at: #base) ___value asString,
								': ',
								(currentScope at: #object) value.
						].
					(((currentScope at: #object) ___value at: 2) == $b) & ((currentScope at: #base) ___value == 2)
						ifFalse: [
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at: #base) ___value asString,
								': ',
								(currentScope at: #object) value.
						].
					(((currentScope at: #object) ___value at: 2) == $o) & ((currentScope at: #base) ___value == 8)
						ifFalse: [
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at: #base) ___value asString,
								': ',
								(currentScope at: #object) value.
						].
					(((currentScope at: #object) ___value at: 2) == $h) & ((currentScope at: #base) ___value == 16)
						ifFalse: [
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at: #base) ___value asString,
								': ',
								(currentScope at: #object) value.
						].
				]
				ifFalse: [
					baseConverter := (currentScope at: #base) ___value asString, 'r', (currentScope at: #object) ___value.
					[return := int ___value: baseConverter evaluate]
						on: Error
						do: [
							ValueError signal:
								'Value Error: invalid literal for int() with base ',
								(currentScope at: #base) ___value asString,
								': ',
								(currentScope at: #object) value.
						].
				].
		] ifFalse: [
			return := [(currentScope at: #object) __int__]
				on: MessageNotUnderstood
				do: [
					TypeError signal:
						'TypeError: int() argument must be a string, a bytes-like object or a real number, not ''',
						(currentScope at: #object) class asString, ''''
				].
		].
		return
	].
	Builtins singleton at: #int put: function.
%
category: 'other'
method: builtins
isinstance
	"On startup this creates a builtin isinstance function to check if an object is an instance of a class"

	| function |
	function := FunctionDef new
		params: { #object. #classinfo };
		yourself.
	function block: [:currentScope |
		| obj classinfo |
		obj := currentScope at: #object.
		classinfo := currentScope at: #classinfo.
		bool ___value: (obj class == classinfo or: [obj class includesBehavior: classinfo]).
	].
	Builtins singleton at: #isinstance put: function.
%
category: 'other'
method: builtins
issubclass
	"On startup this creates a builtin issubclass function to check if a class is a subclass of another"

	| function |
	function := FunctionDef new
		params: { #class. #classinfo };
		yourself.
	function block: [:currentScope |
		| cls classinfo |
		cls := currentScope at: #class.
		classinfo := currentScope at: #classinfo.
		bool ___value: (cls == classinfo or: [cls includesBehavior: classinfo]).
	].
	Builtins singleton at: #issubclass put: function.
%
category: 'other'
method: builtins
len
	"On startup this creates a builtin len function to return the length of anything that has a __len method"

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		[(currentScope at: #object) __len__]
			on: MessageNotUnderstood
			do: [TypeError signal: 'TypeError: object of type ''', (currentScope at: #object) class asString, ''' has no len()'].
	].
	Builtins singleton at: #len put: function.
%
category: 'other'
method: builtins
list
	"On startup this creates a builtin list function to turn one iterable object into a list"

	| function |
	function := FunctionDef new
		params: { #object };
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		[
			| return |
			return := list ___value: {}.
			(currentScope at: #object) ~~ nil
				ifTrue: [
					(currentScope at: #object) class == str
						ifTrue: [
							(currentScope at: #object) ___value
								do: [:each | return append: (str ___value: each asString)].
						]
						ifFalse: [
							(currentScope at: #object) class == dict
								ifTrue: [
									(currentScope at: #object) keys ___container
										do: [:each | return append: each].
								]
								ifFalse: [
									(currentScope at: #object) ___container
										do: [:each | return append: each].
								].
						].
				].
			return
		]
		on: MessageNotUnderstood
		do: [TypeError signal: 'TypeError: ''', (currentScope at: #object) class asString, ''' object is not iterable'].
	].
	Builtins singleton at: #list put: function.
%
category: 'other'
method: builtins
locals
	"On startup this creates a builtin repr function to return the value of something's __repr method"

	| function |
	function := FunctionDef new
		params: {};
		yourself.
	function block: [:currentScope |
		dict ___value: currentScope parent dict.
	].
	Builtins singleton at: #locals put: function.
%
category: 'other'
method: builtins
max
	"On startup this creates a builtin max function to find the maximum value"

	| function |
	function := FunctionDef new
		vararg: #vararg;
		kwonlyargs: { #key. #default };
		kw_defaults: { nil. nil };
		yourself.
	function block: [:currentScope |
		| args maxVal keyFunc hasDefault defaultVal result |
		args := (currentScope at: #vararg) ___value.
		keyFunc := currentScope at: #key.
		defaultVal := currentScope at: #default.
		hasDefault := defaultVal ~~ nil.

		args size == 0 ifTrue: [
			ValueError signal: 'ValueError: max expected at least 1 argument, got 0'.
		].

		args size == 1 ifTrue: [
			args := (args at: 1) ___container.
			args size == 0 ifTrue: [
				hasDefault
					ifTrue: [result := defaultVal]
					ifFalse: [ValueError signal: 'ValueError: max() arg is an empty sequence'].
			].
		].

		result ifNil: [
			maxVal := args at: 1.
			args do: [:each |
				| compareVal maxCompareVal |
				keyFunc == nil
					ifTrue: [
						compareVal := each.
						maxCompareVal := maxVal.
					]
					ifFalse: [
						compareVal := keyFunc ___call: { each } keywords: Dictionary new scope: currentScope.
						maxCompareVal := keyFunc ___call: { maxVal } keywords: Dictionary new scope: currentScope.
					].
				((compareVal __gt__: maxCompareVal) ___value) ifTrue: [maxVal := each].
			].
			result := maxVal.
		].
		result.
	].
	Builtins singleton at: #max put: function.
%
category: 'other'
method: builtins
min
	"On startup this creates a builtin min function to find the minimum value"

	| function |
	function := FunctionDef new
		vararg: #vararg;
		kwonlyargs: { #key. #default };
		kw_defaults: { nil. nil };
		yourself.
	function block: [:currentScope |
		| args minVal keyFunc hasDefault defaultVal result |
		args := (currentScope at: #vararg) ___value.
		keyFunc := currentScope at: #key.
		defaultVal := currentScope at: #default.
		hasDefault := defaultVal ~~ nil.

		args size == 0 ifTrue: [
			ValueError signal: 'ValueError: min expected at least 1 argument, got 0'.
		].

		args size == 1 ifTrue: [
			args := (args at: 1) ___container.
			args size == 0 ifTrue: [
				hasDefault
					ifTrue: [result := defaultVal]
					ifFalse: [ValueError signal: 'ValueError: min() arg is an empty sequence'].
			].
		].

		result ifNil: [
			minVal := args at: 1.
			args do: [:each |
				| compareVal minCompareVal |
				keyFunc == nil
					ifTrue: [
						compareVal := each.
						minCompareVal := minVal.
					]
					ifFalse: [
						compareVal := keyFunc ___call: { each } keywords: Dictionary new scope: currentScope.
						minCompareVal := keyFunc ___call: { minVal } keywords: Dictionary new scope: currentScope.
					].
				((compareVal __lt__: minCompareVal) ___value) ifTrue: [minVal := each].
			].
			result := minVal.
		].
		result.
	].
	Builtins singleton at: #min put: function.
%
category: 'other'
method: builtins
oct
	"On startup this creates a builtin oct function to convert an integer to an octal string"

	| function |
	function := FunctionDef new
		params: { #number };
		yourself.
	function block: [:currentScope |
		| number value |
		number := currentScope at: #number.
		number class == int ifFalse: [
			TypeError signal: 'TypeError: ''', number class asString, ''' object cannot be interpreted as an integer'.
		].
		value := number ___value.
		value < 0
			ifTrue: [str ___value: '-0o', (value negated printStringRadix: 8)]
			ifFalse: [str ___value: '0o', (value printStringRadix: 8)].
	].
	Builtins singleton at: #oct put: function.
%
category: 'other'
method: builtins
open
	"open(file, mode='r', buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)"

	| function |
	"On startup this creates a builtin open function to open a file."
	function := FunctionDef new
		params: { #file. #mode. #buffering. #encoding. #errors. #newline. #closefd. #opener. };
		defaults: { None. 'r'. -1. None. None. None. True. None. };
		vararg: #'None';
		yourself.
	function block: [:currentScope |
		TextIOWrapper 
			file: (currentScope at: #file)
			mode: (currentScope at: #mode)
			buffering: (currentScope at: #buffering)
			encoding: (currentScope at: #encoding)
			errors: (currentScope at: #errors)
			newline: (currentScope at: #newline)
			closefd: (currentScope at: #closefd)
			opener: (currentScope at: #opener).
	].
	Builtins singleton at: #open put: function.
%
category: 'other'
method: builtins
ord
	"On startup this creates a builtin ord function to turn a character into its unicode integer"

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		(currentScope at: #object) class ~~ str
			ifTrue: [
				TypeError signal:
					'TypeError: ord() expected string of length 1, but ',
					(currentScope at: #object) class asString,
					' found'.
			].
		(currentScope at: #object) __len__ ___value == 1 ifFalse: [
				TypeError signal:
					'TypeError: ord() expected a character, but string of length ',
					(currentScope at: #object) __len__ asString,
					' found'.
		].
		int ___value: (currentScope at: #object) ___value first codePoint.
	].
	Builtins singleton at: #ord put: function.
%
category: 'other'
method: builtins
pow

	"On startup this creates a builtin pow function to return base raised to the pow of exp
	This should work for ints, floats, and complex numbers in any combination"

	| function |
	function := FunctionDef new
		params: { #base. #exp. #mod };
		defaults: { nil };
		yourself.

	function block: [:currentScope |
		| result base exp |
		base := currentScope at: #base.
		exp := currentScope at: #exp.
		result := base __pow__: exp.
		(currentScope at: #mod) ~~ nil
			ifTrue: [
				(result class = complex) | ((currentScope at: #mod) class = complex)
					ifTrue: [
						TypeError signal: 'TypeError: complex modulo'.
					].
				result := result __mod__: (currentScope at: #mod).
			].
		result.
	].

	Builtins singleton at: #pow put: function.
%
category: 'other'
method: builtins
print
	"this function prints the items stored in vararg
	vararg	- items to be printed
	sep		- character seperating each printed item
	end		- character at the end of the printed items
	file		- the file or stream where the elements are printed
	flush		- a boolean, on True the printing cache is flushed"

	| function |
	function := FunctionDef new
		vararg: #vararg;
		kwonlyargs: { #sep. #end. #file. #flush };
		kw_defaults: { str ___value: ''. str ___value: (Character lf asString). nil. bool ___value: False };
		yourself.
	function block: [:currentScope |
		| objects sep end file flush |
		(currentScope at: #file) == nil ifTrue: [
			| defaultFile |
			defaultFile := Builtins printFile.
			defaultFile ifNil: [defaultFile := GsFile stdout].
			currentScope at: #file put: defaultFile
		].
		objects := (currentScope at: #vararg) ___value.
		sep := currentScope at: #sep.
		end := currentScope at: #end.
		" TODO file should be a python object that has a write(string) method. By default, Python uses sys.stdout. Currently just needs to be a WriteStream or a GsFile. "
		file := currentScope at: #file.
		flush := currentScope at: #flush.

		sep class ~~ str ifTrue: [TypeError signal: 'sep must be a str, not ', sep class name].
		end class ~~ str ifTrue: [TypeError signal: 'end must be a str, not ', end class name].
		" TODO verify file is an object that has a 'write' method. AttributeError: 'str' object has no attribute 'write' "
		" TODO implicitly convert flush to a bool "

		1 to: objects size - 1 do: [:index | 
			file 
				nextPutAll: (objects at: index) __str__ ___value; 
				nextPutAll: sep __str__ ___value;
				yourself.
		].
		file nextPutAll: (objects at: objects size) __str__ ___value.
		file nextPutAll: end __str__ ___value.
		flush ___value ifTrue: [file flush].
		file close.
	].
	Builtins singleton at: #print put: function.
%
category: 'other'
method: builtins
quit
	"On startup this creates a builtin quit function to exit the REPL"

	| function |
	function := FunctionDef new
		params: { #code };
		defaults: { int ___value: 0 };
		yourself.
	function block: [:currentScope |
		| code status |
		code := currentScope at: #code.
		status := code class == int
			ifTrue: [code ___value]
			ifFalse: [0].
		ExitClientError signal: 'quit() called' status: status.
	].
	Builtins singleton at: #quit put: function.
%
category: 'other'
method: builtins
range
	"On startup this creates a builtin range function to convert an interval in to a range object"

	| function |
	function := FunctionDef new
		vararg: #vararg;
		yourself.
	function block: [:currentScope |
		| varargSize returnObject |
		"varargSize is the length of the varargs the function was passed in with."
		varargSize := (currentScope at: #vararg) ___value size.
		varargSize == 1 ifTrue: [
			returnObject := range new 
				__init__: ((currentScope at: #vararg) ___value at: 1).
		].
		varargSize == 2 ifTrue: [
			returnObject := range new 
				__init__: ((currentScope at: #vararg) ___value at: 1) 
				_: ((currentScope at: #vararg) ___value at: 2).
		].
		varargSize == 3 ifTrue: [
			returnObject := range new 
				__init__: ((currentScope at: #vararg) ___value at: 1) 
				_: ((currentScope at: #vararg) ___value at: 2) 
				_: ((currentScope at: #vararg) ___value at: 3).
		].
		varargSize > 3 ifTrue: [TypeError signal: 'range expected at most 3 arguments, got ', varargSize].
		returnObject.
	].
	Builtins singleton at: #range put: function.
%
category: 'other'
method: builtins
repr
	"On startup this creates a builtin repr function to return the value of something's __repr method"

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		(currentScope at: #object) __repr__
	].
	Builtins singleton at: #repr put: function.
%
category: 'other'
method: builtins
round
	"On startup this creates a builtin repr function to return the value of something's __repr method"

	| function |
	function := FunctionDef new
		params: { #object. #ndigits };
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		| result |
		(currentScope at: #ndigits) == nil
			ifTrue: [result := (currentScope at: #object) __round__]
			ifFalse: [result := (currentScope at: #object) __round__: (currentScope at: #ndigits)].
		result.
	].
	Builtins singleton at: #round put: function.
%
category: 'other'
method: builtins
set
	"On startup this creates a builtin set function to turn one iterable object into a set"

	| function |
	function := FunctionDef new
		params: { #object };
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		[
			| return |
			return := set ___value: {}.
			(currentScope at: #object) ~~ nil
				ifTrue: [
					(currentScope at: #object) class == str ifTrue: [
							((currentScope at: #object) ___value)
								do: [:each | return add: (str ___value: each asString)].
						] ifFalse: [
							(currentScope at: #object) class == dict ifTrue: [
									(currentScope at: #object) keys ___container do: [:each | return add: each].
								] ifFalse: [
									(currentScope at: #object) ___container do: [:each | return add: each].
								].
						].
				].
			return.
		]
		on: MessageNotUnderstood
		do: [TypeError signal: 'TypeError: ''', (currentScope at: #object) class asString, ''' object is not iterable'].
	].
	Builtins singleton at: #set put: function.
%
category: 'other'
method: builtins
sorted
	"On startup this creates a builtin sorted function to return a sorted list"

	| function |
	function := FunctionDef new
		params: { #iterable };
		kwonlyargs: { #key. #reverse };
		kw_defaults: { nil. bool ___value: false };
		yourself.
	function block: [:currentScope |
		| iterable keyFunc reverse result sortedArray |
		iterable := currentScope at: #iterable.
		keyFunc := currentScope at: #key.
		reverse := (currentScope at: #reverse) ___value.

		result := list ___value: {}.
		iterable ___container do: [:each | result append: each].

		sortedArray := keyFunc == nil
			ifTrue: [
				result ___container asSortedCollection: [:a :b | (a __lt__: b) ___value].
			]
			ifFalse: [
				result ___container asSortedCollection: [:a :b |
					| keyA keyB |
					keyA := keyFunc ___call: { a } keywords: Dictionary new scope: currentScope.
					keyB := keyFunc ___call: { b } keywords: Dictionary new scope: currentScope.
					(keyA __lt__: keyB) ___value.
				].
			].

		result := list ___value: sortedArray asArray.
		reverse ifTrue: [result reverse].
		result.
	].
	Builtins singleton at: #sorted put: function.
%
category: 'other'
method: builtins
str
	"On startup this creates a builtin str function to return anything with a __str__ method"

	| function |
	function := FunctionDef new
		params: { #object };
		yourself.
	function block: [:currentScope |
		(currentScope at: #object) __str__.
	].
	Builtins singleton at: #str put: function.
%
category: 'other'
method: builtins
sum
	"On startup this creates a builtin int function to turn anything with a __int__ method
		or that is a string into an int"

	| function |
	function := FunctionDef new
		params: { #object. #start };
		defaults: { int ___value: 0 };
		yourself.
	function block: [:currentScope |
		| sum integer summer |
		sum := complex ___real: 0 imaginary: 0.
		summer := (currentScope at: #list) 
			scope: currentScope
			positional: { currentScope at: #object }
			named: {}.
		integer := true.
		(currentScope at: #start) ___value 
			to: (summer  ___size - 1)
			do: [:i |
				| holder |
				holder := summer __getitem__: (int ___value: i).
				holder class == float ifTrue: [
					integer := false.
				].
				sum := sum __add__: holder.
			].
		sum imag ___value == 0
			ifTrue: [
				sum := sum real.
				integer ifTrue: [
					sum := int ___value: sum ___value.
				].
			].
		sum.
	].
	Builtins singleton at: #sum put: function.
%
category: 'other'
method: builtins
tuple
	"On startup this creates a builtin tuple function to convert an iterable to a tuple"

	| function |
	function := FunctionDef new
		params: { #iterable };
		defaults: { nil };
		yourself.
	function block: [:currentScope |
		| iterable result finalResult |
		iterable := currentScope at: #iterable.
		iterable == nil
			ifTrue: [
				finalResult := tuple ___value: #().
			]
			ifFalse: [
				result := {}.
				[
					iterable class == str
						ifTrue: [
							iterable ___value do: [:each | result add: (str ___value: each asString)].
						]
						ifFalse: [
							iterable ___container do: [:each | result add: each].
						].
				] on: MessageNotUnderstood do: [
					TypeError signal: 'TypeError: ''', iterable class asString, ''' object is not iterable'.
				].
				finalResult := tuple ___value: result.
			].
		finalResult.
	].
	Builtins singleton at: #tuple put: function.
%
category: 'other'
method: builtins
type
	"On startup this creates a builtin type function to return the type of a function or create a new type"

	| function |
	function := FunctionDef new
		vararg: #vararg;
		yourself.
	function block: [:currentScope |
		| varargSize result |
		varargSize := (currentScope at: #vararg) ___value size.
		varargSize == 1 ifTrue: [result := ((currentScope at: #vararg)  ___value at: 1) class].
		varargSize == 2 ifTrue: [TypeError signal: 'TypeError: type() takes 1 or 3 arguments'].
		varargSize == 3 ifTrue: [self error: 'Should return a new class with name first arg, inheritence second arg, and writeables is the thrid argument'].
		varargSize > 3 ifTrue: [TypeError signal: 'TypeError: type() takes 1 or 3 arguments'].
		result.
	].
	Builtins singleton at: #type put: function.
%
