! ------------------- Remove existing behavior from Builtins
expectvalue /Metaclass3       
doit
Builtins removeAllMethods.
Builtins class removeAllMethods.
%
! ------------------- Class methods for Builtins
set compile_env: 0
! ------------------- Instance methods for Builtins
set compile_env: 0
category: 'functions'
method: Builtins
__import__: name keywords: keywords
	"https://docs.python.org/3/library/functions.html"

	name == #'sys' 	ifTrue: [^Sys current].
	name == #'time'	ifTrue: [^Time current].
	self halt.
%
category: 'functions'
method: Builtins
abs: aNumber
	"https://docs.python.org/3/library/functions.html#abs"
	
	^aNumber abs
%
category: 'functions'
method: Builtins
all: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
all(iterable)
Return True if all elements of the iterable are true (or if the iterable is empty). Equivalent to:

def all(iterable):
    for element in iterable:
        if not element:
            return False
    return True
"
	^arguments allSatisfy: [:each | each]
%
category: 'functions'
method: Builtins
any: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
any(iterable)
Return True if any element of the iterable is true. If the iterable is empty, return False. Equivalent to:

def any(iterable):
    for element in iterable:
        if element:
            return True
    return False
"
	^arguments anySatisfy: [:each | each]
%
category: 'functions'
method: Builtins
ascii: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
ascii(object)
As repr(), return a string containing a printable representation of an object, 
but escape the non-ASCII characters in the string returned by repr() using 
\x, \u or \U escapes. This generates a string similar to that returned by repr() in Python 2.
"
self halt.
%
category: 'functions'
method: Builtins
bin: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
bin(x)
Convert an integer number to a binary string prefixed with “0b”. 
The result is a valid Python expression. If x is not a Python int object,
 it has to define an __index__() method that returns an integer. Some examples:

>>> bin(3)
'0b11'
>>> bin(-10)
'-0b1010'
If prefix “0b” is desired or not, you can use either of the following ways.

>>> format(14, '#b'), format(14, 'b')
('0b1110', '1110')
>>> f'{14:#b}', f'{14:b}'
('0b1110', '1110')
See also format() for more information.
"
	^(arguments first negative ifTrue: ['-'] ifFalse: ['']), '0b' , (arguments first abs printStringRadix: 2)
%
category: 'functions'
method: Builtins
bool: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class bool([x])
Return a Boolean value, i.e. one of True or False. 
x is converted using the standard truth testing procedure. 
If x is false or omitted, this returns False; otherwise it returns True.
The bool class is a subclass of int (see Numeric Types — int, float, complex). 
It cannot be subclassed further. Its only instances are False and True (see Boolean Values).

Changed in version 3.7: x is now a positional-only parameter.
"
self halt.
%
category: 'functions'
method: Builtins
breakpoint: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
breakpoint(*args, **kws)
This function drops you into the debugger at the call site. 
Specifically, it calls sys.breakpointhook(), passing args and
 kws straight through. By default, sys.breakpointhook() 
calls pdb.set_trace() expecting no arguments. In this case, 
it is purely a convenience function so you don’t 
have to explicitly import pdb or type as much code to enter the
 debugger. However, sys.breakpointhook() can be set
 to some other function and breakpoint() will automatically 
call that, allowing you to drop into the debugger of choice.

New in version 3.7.
"
self halt.
%
category: 'functions'
method: Builtins
bytearray: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class bytearray([source[, encoding[, errors]]])
Return a new array of bytes. The bytearray class is a 
mutable sequence of integers in the range 0 <= x < 256.
 It has most of the usual methods of mutable sequences, 
described in Mutable Sequence Types, as well as most methods
 that the bytes type has, see Bytes and Bytearray Operations.

The optional source parameter can be used to initialize the array in a few different ways:

If it is a string, you must also give the encoding (and optionally, errors) 
parameters; bytearray() then converts the string to bytes using str.encode().
If it is an integer, the array will have that size and will be initialized with null bytes.
If it is an object conforming to the buffer interface, a read-only buffer of the object
 will be used to initialize the bytes array.
If it is an iterable, it must be an iterable of integers in the range 0 <= x < 256, 
which are used as the initial contents of the array.
Without an argument, an array of size 0 is created.

See also Binary Sequence Types — bytes, bytearray, memoryview and Bytearray Objects.
"
self halt.
%
category: 'functions'
method: Builtins
bytes: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class bytes([source[, encoding[, errors]]])
Return a new “bytes” object, which is an immutable
 sequence of integers in the range 0 <= x < 256. bytes is 
an immutable version of bytearray – it has the same
 non-mutating methods and the same indexing and slicing behavior.

Accordingly, constructor arguments are interpreted as for bytearray().

Bytes objects can also be created with literals, see String and Bytes literals.

See also Binary Sequence Types — bytes, bytearray, memoryview,
 Bytes Objects, and Bytes and Bytearray Operations.
"
self halt.
%
category: 'functions'
method: Builtins
callable: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
callable(object)
Return True if the object argument appears callable, 
False if not. If this returns true, it is still possible that a
 call fails, but if it is false, calling object will never succeed. 
Note that classes are callable (calling a class returns a new instance);
 instances are callable if their class has a __call__() method.

New in version 3.2: This function was first removed in Python 3.0 
and then brought back in Python 3.2.
"
self halt.
%
category: 'functions'
method: Builtins
chr: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
chr(i)
Return the string representing a character whose Unicode code point is the integer i. 
For example, chr(97) returns the string 'a', while chr(8364) returns the string '€'. 
This is the inverse of ord().

The valid range for the argument is from 0 through 1,114,111 (0x10FFFF in base 16).
 ValueError will be raised if i is outside that range.
"
	^(Character codePoint: arguments first) asString
%
category: 'functions'
method: Builtins
classmethod: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
@classmethod
Transform a method into a class method.

A class method receives the class as implicit first argument,
 just like an instance method receives the instance. To declare a class method, use this idiom:

class C:
    @classmethod
    def f(cls, arg1, arg2, ...): ...
The @classmethod form is a function decorator – see Function definitions for details.

A class method can be called either on the class 
(such as C.f()) or on an instance (such as C().f()). 
The instance is ignored except for its class. 
If a class method is called for a derived class, the derived class object is passed as the implied first argument.

Class methods are different than C++ or Java static methods. If you want those, see staticmethod().

For more information on class methods, see The standard type hierarchy.
"
self halt.
%
category: 'functions'
method: Builtins
compile: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
compile(source, filename, mode, flags=0, dont_inherit=False, optimize=-1)
Compile the source into a code or AST object. Code objects can be executed by exec() or 
eval(). source can either be a normal string, a byte string, or an AST object. Refer to the
 ast module documentation for information on how to work with AST objects.

The filename argument should give the file from which the code was read; 
pass some recognizable value if it wasn’t read from a file ('<string>' is commonly used).

The mode argument specifies what kind of code must be compiled; it can be 'exec' 
if source consists of a sequence of statements, 'eval' if it consists of a single expression, 
or 'single' if it consists of a single interactive statement (in the latter case, expression 
statements that evaluate to something other than None will be printed).

The optional arguments flags and dont_inherit control which future statements 
affect the compilation of source. If neither is present (or both are zero) the code 
is compiled with those future statements that are in effect in the code that is calling 
compile(). If the flags argument is given and dont_inherit is not (or is zero) 
then the future statements specified by the flags argument are used in addition 
to those that would be used anyway. If dont_inherit is a non-zero integer then 
the flags argument is it – the future statements in effect around the call to compile are ignored.

Future statements are specified by bits which can be bitwise ORed together 
to specify multiple statements. The bitfield required to specify a given feature
 can be found as the compiler_flag attribute on the _Feature instance in the __future__ module.

The argument optimize specifies the optimization level of the compiler; 
the default value of -1 selects the optimization level of the interpreter as 
given by -O options. Explicit levels are 0 (no optimization; __debug__ is true), 
1 (asserts are removed, __debug__ is false) or 2 (docstrings are removed too).

This function raises SyntaxError if the compiled source is invalid, and ValueError
 if the source contains null bytes.

If you want to parse Python code into its AST representation, see ast.parse().

Note When compiling a string with multi-line code in 'single' or 'eval' mode, input 
must be terminated by at least one newline character. 
This is to facilitate detection of incomplete and complete statements in the code module.
Warning It is possible to crash the Python interpreter with a
 sufficiently large/complex string when compiling to an AST object 
due to stack depth limitations in Python’s AST compiler.
Changed in version 3.2: Allowed use of Windows and Mac newlines. 
Also input in 'exec' mode does not have to end in a newline anymore. Added the optimize parameter.

Changed in version 3.5: Previously, TypeError was raised when null bytes were encountered in source.
"
self halt.
%
category: 'functions'
method: Builtins
complex: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class complex([real[, imag]])
Return a complex number with the value real + imag*1j or
 convert a string or number to a complex number. If the first 
parameter is a string, it will be interpreted as a complex number 
and the function must be called without a second parameter. 
The second parameter can never be a string. Each argument 
may be any numeric type (including complex). If imag is omitted, 
it defaults to zero and the constructor serves as a numeric conversion
 like int and float. If both arguments are omitted, returns 0j.

Note When converting from a string, the string must not contain
 whitespace around the central + or - operator. For example, 
complex('1+2j') is fine, but complex('1 + 2j') raises ValueError.
The complex type is described in Numeric Types — int, float, complex.

Changed in version 3.6: Grouping digits with underscores as in code literals is allowed.
"

^Complex real: arguments first imag: arguments second.
%
category: 'functions'
method: Builtins
delattr: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
delattr(object, name)
This is a relative of setattr(). The arguments are an object and a string. 
The string must be the name of one of the object’s attributes. The function 
deletes the named attribute, provided the object allows it. 
For example, delattr(x, 'foobar') is equivalent to del x.foobar.
"
self halt.
%
category: 'functions'
method: Builtins
dict: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
class dict(**kwarg)
class dict(mapping, **kwarg)
class dict(iterable, **kwarg)
Create a new dictionary. The dict object is the dictionary class.
 See dict and Mapping Types — dict for documentation about this class.

For other containers see the built-in list, set, and tuple classes, as well as the collections module.
"

	arguments notEmpty ifTrue: [
		(arguments first isKindOf: Dictionary) ifTrue: [
			arguments first keysAndValuesDo: [:eachKey :eachValue | 
				keywords at: eachKey evaluate put: eachValue evaluate.
			]
		] ifFalse: [
			arguments first do: [ :each | 
				keywords at: (each at: 1) put: (each at: 2).
			]
		].
	].
	^keywords
%
category: 'functions'
method: Builtins
dir: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
dir([object])
Without arguments, return the list of names in the current local scope. 
With an argument, attempt to return a list of valid attributes for that object.

If the object has a method named __dir__(), this method will be called 
and must return the list of attributes. This allows objects that implement 
a custom __getattr__() or __getattribute__() function to customize
 the way dir() reports their attributes.

If the object does not provide __dir__(), the function tries its best 
to gather information from the object’s __dict__ attribute, if defined, 
and from its type object. The resulting list is not necessarily complete,
 and may be inaccurate when the object has a custom __getattr__().

The default dir() mechanism behaves differently with different types of 
objects, as it attempts to produce the most relevant, rather than complete, information:

If the object is a module object, the list contains the names of the module’s attributes.
If the object is a type or class object, the list contains the names of its attributes, 
and recursively of the attributes of its bases.
Otherwise, the list contains the object’s attributes’ names, the names 
of its class’s attributes, and recursively of the attributes of its class’s base classes.
The resulting list is sorted alphabetically. For example:

>>> import struct
>>> dir()   # show the names in the module namespace  # doctest: +SKIP
['__builtins__', '__name__', 'struct']
>>> dir(struct)   # show the names in the struct module # doctest: +SKIP
['Struct', '__all__', '__builtins__', '__cached__', '__doc__', '__file__',
 '__initializing__', '__loader__', '__name__', '__package__',
 '_clearcache', 'calcsize', 'error', 'pack', 'pack_into',
 'unpack', 'unpack_from']
>>> class Shape:
...     def __dir__(self):
...         return ['area', 'perimeter', 'location']
>>> s = Shape()
>>> dir(s)
['area', 'location', 'perimeter']
Note Because dir() is supplied primarily as a convenience for use 
at an interactive prompt, it tries to supply an interesting set of
 names more than it tries to supply a rigorously or consistently 
defined set of names, and its detailed behavior may change across
 releases. For example, metaclass attributes are not in the result list 
when the argument is a class.

"
self halt.
%
category: 'functions'
method: Builtins
divmod: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
divmod(a, b)
Take two (non complex) numbers as arguments and return 
a pair of numbers consisting of their quotient and remainder 
when using integer division. With mixed operand types,
 the rules for binary arithmetic operators apply. For integers, 
the result is the same as (a // b, a % b). For floating point numbers 
the result is (q, a % b), where q is usually math.floor(a / b) but may be 
1 less than that. In any case q * b + a % b is very close to a, if a % b is 
non-zero it has the same sign as b, and 0 <= abs(a % b) < abs(b).
"

"May need some improvements for floating point or negative numbers"
| a b q r |
a := arguments first.
b := arguments second.
q := (a / b) floor.
r := a - (b * q).
^(Array with: q with: r) immediateInvariant
%
category: 'functions'
method: Builtins
enumerate: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
enumerate(iterable, start=0)
Return an enumerate object. iterable must be a 
sequence, an iterator, or some other object which 
supports iteration. The __next__() method of the
 iterator returned by enumerate() returns a tuple 
containing a count (from start which defaults to 0) 
and the values obtained from iterating over iterable.

>>> seasons = ['Spring', 'Summer', 'Fall', 'Winter']
>>> list(enumerate(seasons))
[(0, 'Spring'), (1, 'Summer'), (2, 'Fall'), (3, 'Winter')]
>>> list(enumerate(seasons, start=1))
[(1, 'Spring'), (2, 'Summer'), (3, 'Fall'), (4, 'Winter')]
Equivalent to:

def enumerate(sequence, start=0):
    n = start
    for elem in sequence:
        yield n, elem
        n += 1
"
self halt.
%
category: 'functions'
method: Builtins
eval: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
eval(expression, globals=None, locals=None)
The arguments are a string and optional globals and locals.
 If provided, globals must be a dictionary. If provided, locals can be any mapping object.

The expression argument is parsed and evaluated as a Python
 expression (technically speaking, a condition list) using the
 globals and locals dictionaries as global and local namespace. 
If the globals dictionary is present and does not contain a value
 for the key __builtins__, a reference to the dictionary of the built-in
 module builtins is inserted under that key before expression is parsed. 
This means that expression normally has full access to the standard 
builtins module and restricted environments are propagated. 
If the locals dictionary is omitted it defaults to the globals dictionary.
 If both dictionaries are omitted, the expression is executed in the 
environment where eval() is called. The return value is the result of
 the evaluated expression. Syntax errors are reported as exceptions. Example:

>>> x = 1
>>> eval('x+1')
2
This function can also be used to execute arbitrary code objects
 (such as those created by compile()). In this case pass a code object 
instead of a string. If the code object has been compiled with 'exec' as 
the mode argument, eval()’s return value will be None.

Hints: dynamic execution of statements is supported by the exec() function. 
The globals() and locals() functions returns the current global and local dictionary, 
respectively, which may be useful to pass around for use by eval() or exec().

See ast.literal_eval() for a function that can safely evaluate strings with expressions containing only literals.
"
self halt.
%
category: 'functions'
method: Builtins
exec: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
exec(object[, globals[, locals]])
This function supports dynamic execution of Python code. 
object must be either a string or a code object. If it is a string,
 the string is parsed as a suite of Python statements which is
 then executed (unless a syntax error occurs). 1 If it is a code
 object, it is simply executed. In all cases, the code that’s 
executed is expected to be valid as file input (see the section
 “File input” in the Reference Manual). Be aware that the return 
and yield statements may not be used outside of function definitions 
even within the context of code passed to the exec() function. The return value is None.

In all cases, if the optional parts are omitted, the code is executed 
in the current scope. If only globals is provided, it must be a dictionary,
 which will be used for both the global and the local variables. 
If globals and locals are given, they are used for the global and
 local variables, respectively. If provided, locals can be any mapping object.
 Remember that at module level, globals and locals are the same dictionary.
 If exec gets two separate objects as globals and locals, the code will be
 executed as if it were embedded in a class definition.

If the globals dictionary does not contain a value for the key
 __builtins__, a reference to the dictionary of the built-in module
 builtins is inserted under that key. That way you can control
 what builtins are available to the executed code by inserting 
your own __builtins__ dictionary into globals before passing it to exec().

Note The built-in functions globals() and locals() return the 
current global and local dictionary, respectively, which may
 be useful to pass around for use as the second and third argument to exec().
Note The default locals act as described for function locals() 
below: modifications to the default locals dictionary should not
 be attempted. Pass an explicit locals dictionary if you need to
 see effects of the code on locals after function exec() returns.
"
self halt.
%
category: 'functions'
method: Builtins
filter: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
filter(function, iterable)
Construct an iterator from those
 elements of iterable for which function 
returns true. iterable may be either a sequence, 
a container which supports iteration, or an iterator.
 If function is None, the identity function is assumed,
 that is, all elements of iterable that are false are removed.

Note that filter(function, iterable) is equivalent to the
 generator expression (item for item in iterable if function(item)) 
if function is not None and (item for item in iterable if item) if function is None.

See itertools.filterfalse() for the complementary function that 
returns elements of iterable for which function returns false.
"
self halt.
%
category: 'functions'
method: Builtins
float: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class float([x])
Return a floating point number constructed from a number or string x.

If the argument is a string, it should contain a decimal number,
 optionally preceded by a sign, and optionally embedded in whitespace.
 The optional sign may be '+' or '-'; a '+' sign has no effect on the value produced.
 The argument may also be a string representing a NaN (not-a-number),
 or a positive or negative infinity. More precisely, the input must conform 
to the following grammar after leading and trailing whitespace characters are removed:

sign           ::=  + | - (Got rid of ''')
infinity       ::=  Infinity | inf (I got rid of "")
nan            ::=  nan
numeric_value  ::=  floatnumber | infinity | nan
numeric_string ::=  [sign] numeric_value
Here floatnumber is the form of a Python floating-point literal,
 described in Floating point literals. Case is not significant, so, 
for example, “inf”, “Inf”, “INFINITY” and “iNfINity” are all acceptable spellings for positive infinity.

Otherwise, if the argument is an integer or a floating point number, 
a floating point number with the same value 
(within Python’s floating point precision) is returned. If the 
argument is outside the range of a Python float, an OverflowError will be raised.

For a general Python object x, float(x) delegates to x.__float__().

If no argument is given, 0.0 is returned.

Examples:

>>>
>>> float('+1.23')
1.23
>>> float('   -12345\n')
-12345.0
>>> float('1e-003')
0.001
>>> float('+1E6')
1000000.0
>>> float('-Infinity')
-inf
The float type is described in Numeric Types — int, float, complex.

Changed in version 3.6: Grouping digits with underscores as in code literals is allowed.

Changed in version 3.7: x is now a positional-only parameter.
"
self halt.
%
category: 'functions'
method: Builtins
format: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
format(value[, format_spec])
Convert a value to a “formatted” representation,
 as controlled by format_spec. The interpretation 
of format_spec will depend on the type of the value 
argument, however there is a standard formatting
 syntax that is used by most built-in types: Format
 Specification Mini-Language.

The default format_spec is an empty string which 
usually gives the same effect as calling str(value).

A call to format(value, format_spec) is translated to
 type(value).__format__(value, format_spec) which 
bypasses the instance dictionary when searching for 
the value’s __format__() method. A TypeError exception
 is raised if the method search reaches object and the
 format_spec is non-empty, or if either the format_spec
 or the return value are not strings.

Changed in version 3.4: object().__format__(format_spec)
 raises TypeError if format_spec is not an empty string.
"
self halt.
%
category: 'functions'
method: Builtins
frozenset: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class frozenset([iterable])
Return a new frozenset object, optionally with 
\elements taken from iterable. frozenset is a
 built-in class. See frozenset and Set Types — 
set, frozenset for documentation about this class.

For other containers see the built-in set, list, tuple,
\ and dict classes, as well as the collections module.
"
self halt.
%
category: 'functions'
method: Builtins
getattr: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
getattr(object, name[, default])
Return the value of the named attribute of object.
 name must be a string. If the string is the name 
of one of the object’s attributes, the result is the 
value of that attribute. For example, getattr(x, 'foobar')
 is equivalent to x.foobar. If the named attribute does not exist, 
default is returned if provided, otherwise AttributeError is raised.
"
self halt.
%
category: 'functions'
method: Builtins
globals
	"https://docs.python.org/3/library/functions.html"
	
"
globals()
Return a dictionary representing the current global symbol table. 
This is always the dictionary of the current module (inside a function or method,
 this is the module where it is defined, not the module from which it is called).
"
self halt.
%
category: 'functions'
method: Builtins
globals: arguments

	^self globals
%
category: 'functions'
method: Builtins
hasattr: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
hasattr(object, name)
The arguments are an object and a string. 
The result is True if the string is the name of one 
of the object’s attributes, False if not.
 (This is implemented by calling getattr(object, name) 
and seeing whether it raises an AttributeError or not.)
"
self halt.
%
category: 'functions'
method: Builtins
hash: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
hash(object)
Return the hash value of the object (if it has one). Hash values are integers. 
They are used to quickly compare dictionary keys during a dictionary lookup.
 Numeric values that compare equal have the same hash value 
(even if they are of different types, as is the case for 1 and 1.0).

Note For objects with custom __hash__() methods, note that hash() 
truncates the return value based on the bit width of the host machine. 
See __hash__() for details.
"
	^arguments first hash
%
category: 'functions'
method: Builtins
help: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
help([object])
Invoke the built-in help system. 
(This function is intended for interactive use.) 
If no argument is given, the interactive help system starts 
on the interpreter console. If the argument is a string, then 
the string is looked up as the name of a module, function, class,
 method, keyword, or documentation topic, and a help page is 
printed on the console. If the argument is any other kind of object, 
a help page on the object is generated.

Note that if a slash(/) appears in the parameter list of a function, 
when invoking help(), it means that the parameters prior to the
 slash are positional-only. For more info, see the FAQ entry on positional-only parameters.

This function is added to the built-in namespace by the site module.

Changed in version 3.4: Changes to pydoc and inspect mean that
 the reported signatures for callables are now more comprehensive and consistent.
"
self halt.
%
category: 'functions'
method: Builtins
hex: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
hex(x)
Convert an integer number to a lowercase hexadecimal 
string prefixed with “0x”. If x is not a Python int object, it has to define an __index__() method that returns an integer. Some examples:

>>> hex(255)
'0xff'
>>> hex(-42)
'-0x2a'
If you want to convert an integer number to an uppercase or
 lower hexadecimal string with prefix or not, you can use either of the following ways:

>>> '%#x' % 255, '%x' % 255, '%X' % 255
('0xff', 'ff', 'FF')
>>> format(255, '#x'), format(255, 'x'), format(255, 'X')
('0xff', 'ff', 'FF')
>>> f'{255:#x}', f'{255:x}', f'{255:X}'
('0xff', 'ff', 'FF')
See also format() for more information.

See also int() for converting a hexadecimal string to
 an integer using a base of 16.

Note To obtain a hexadecimal string representation
 for a float, use the float.hex() method.
"

^(arguments first negative ifTrue: ['-'] ifFalse: ['']), '0x' , (arguments first abs asHexString)
%
category: 'functions'
method: Builtins
id: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
id(object)
Return the “identity” of an object. This is an integer which is guaranteed to 
be unique and constant for this object during its lifetime. Two objects with 
non-overlapping lifetimes may have the same id() value.

CPython implementation detail: This is the address of the object in memory.
"
self halt.
%
category: 'functions'
method: Builtins
input: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
input([prompt])
If the prompt argument is present, it is written to standard output 
without a trailing newline. The function then reads a line from input, 
converts it to a string (stripping a trailing newline), and returns that. 
When EOF is read, EOFError is raised. Example:

>>>
>>> s = input('--> ')  
--> Monty Python's Flying Circus
>>> s  
Monty Python's Flying Circus (took out qoutations)
If the readline module was loaded, then input() will use it to provide
 elaborate line editing and history features.
"
	| prompt result |
	prompt := arguments notEmpty
		ifTrue: [String withAll: arguments first]
		ifFalse: [''].
	result := UserInteraction new prompt: prompt.
	result ifNil: [CancelNotification signal].
	result := result decodeToString.
	self print: (Array with: arguments first with: (Py_String withAll: result)).
	^Py_String withAll: result
%
category: 'functions'
method: Builtins
int: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class int([x])
class int(x, base=10)
Return an integer object constructed from a number 
or string x, or return 0 if no arguments are given. If 
x defines __int__(), int(x) returns x.__int__(). If x 
defines __trunc__(), it returns x.__trunc__(). For 
floating point numbers, this truncates towards zero.

If x is not a number or if base is given, then x must be a 
string, bytes, or bytearray instance representing an integer
 literal in radix base. Optionally, the literal can be preceded 
by + or - (with no space in between) and surrounded by 
whitespace. A base-n literal consists of the digits 0 to n-1, 
with a to z (or A to Z) having values 10 to 35. The default base is 10. 
The allowed values are 0 and 2–36. Base-2, -8, and -16 literals can 
be optionally prefixed with 0b/0B, 0o/0O, or 0x/0X, as with integer 
literals in code. Base 0 means to interpret exactly as a code literal, 
so that the actual base is 2, 8, 10, or 16, and so that int('010', 0)
 is not legal, while int('010') is, as well as int('010', 8).

The integer type is described in Numeric Types — int, float, complex.

Changed in version 3.4: If base is not an instance of int and the 
base object has a base.__index__ method, that method is called 
to obtain an integer for the base. Previous versions used base.__int__ 
instead of base.__index__.

Changed in version 3.6: Grouping digits with underscores as in code literals is allowed.

Changed in version 3.7: x is now a positional-only parameter.
"
	arguments isEmpty ifTrue: [^0].
	arguments size == 1 ifTrue: [
		| arg stream int |
		arg := arguments first.
		(arg isKindOf: Number) ifTrue: [^arg truncated].
		stream := ReadStream on: arg trimWhiteSpace.
		int := Integer fromStream: stream.
		stream position == stream contents size ifFalse: [self error: 'Invalid Literal'].
		^int
	].
	arguments size == 2 ifTrue: [
		| num rad |
		num := arguments first.
		rad := arguments second.
		rad == 0 ifTrue: [
			num first == $0 ifFalse: [self error: 'Number must begin with 0'].
			rad := #(2 8 16) at: ('BOX' indexOf: num second asUppercase).
			num := num copyFrom: 3 to: num size.
		].
		^Integer fromString: rad asString, 'r', num trimWhiteSpace.
	].
	self error: 'Too many arguments'.
%
category: 'functions'
method: Builtins
isinstance: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
isinstance(object, classinfo)¶
Return true if the object argument is an instance of the 
classinfo argument, or of a (direct, indirect or virtual) subclass
 thereof. If object is not an object of the given type, the function
 always returns false. If classinfo is a tuple of type objects 
(or recursively, other such tuples), return true if object is an
 instance of any of the types. If classinfo is not a type 
or tuple of types and such tuples, a TypeError exception is raised.
"
self halt.
%
category: 'functions'
method: Builtins
issubclass: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
issubclass(class, classinfo)
Return true if class is a subclass (direct, indirect or virtual) of classinfo.
 A class is considered a subclass of itself. classinfo may be a tuple of class 
objects, in which case every entry in classinfo will be checked. In any other
 case, a TypeError exception is raised.
"
self halt.
%
category: 'functions'
method: Builtins
iter: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
iter(object[, sentinel])
Return an iterator object. The first argument is interpreted 
very differently depending on the presence of the second argument. 
Without a second argument, object must be a collection object which
 supports the iteration protocol (the __iter__() method), or it must
 support the sequence protocol (the __getitem__() method with integer
 arguments starting at 0). If it does not support either of those protocols, 
TypeError is raised. If the second argument, sentinel, is given, then
 object must be a callable object. The iterator created in this case 
will call object with no arguments for each call to its __next__() method; 
if the value returned is equal to sentinel, StopIteration will be raised, 
otherwise the value will be returned.

See also Iterator Types.

One useful application of the second form of iter() is to build a 
block-reader. For example, reading fixed-width blocks from a 
binary database file until the end of file is reached:

from functools import partial
with open('mydata.db', 'rb') as f:
    for block in iter(partial(f.read, 64), b''):
        process_block(block)
"
self halt.
%
category: 'functions'
method: Builtins
len: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
len(s)
Return the length (the number of items) of an object. 
The argument may be a sequence (such as a string, bytes, tuple,
 list, or range) or a collection (such as a dictionary, set, or frozen set).

class list([iterable])
Rather than being a function, list is actually a mutable sequence 
type, as documented in Lists and Sequence Types — list, tuple, range.
"
self halt.
%
category: 'functions'
method: Builtins
list: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class list([iterable])
Rather than being a function, list is actually a 
mutable sequence type, as documented in Lists and 
Sequence Types — list, tuple, range.
"
	^Py_List withAll: arguments first
%
category: 'functions'
method: Builtins
locals
	"https://docs.python.org/3/library/functions.html"
	
"
locals()
Update and return a dictionary representing the current local symbol table. 
Free variables are returned by locals() when it is called in function blocks, 
but not in class blocks. Note that at the module level, locals() and globals()
 are the same dictionary.

Note The contents of this dictionary should not be modified; 
changes may not affect the values of local and free variables 
used by the interpreter.
"
self halt.
%
category: 'functions'
method: Builtins
locals: arguments

	^self locals
%
category: 'functions'
method: Builtins
map: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
map(function, iterable, ...)
Return an iterator that applies function to every item of iterable,
 yielding the results. If additional iterable arguments are passed,
 function must take that many arguments and is applied to the 
items from all iterables in parallel. With multiple iterables, the iterator 
stops when the shortest iterable is exhausted. For cases where the
 function inputs are already arranged into argument tuples, see itertools.starmap().
"
^arguments second collect: [:each | arguments first value: (Array with: each) value: Dictionary new]
%
category: 'functions'
method: Builtins
max: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
max(iterable, *[, key, default])
max(arg1, arg2, *args[, key])
Return the largest item in an iterable or the largest of two or more arguments.

If one positional argument is provided, it should be an iterable. 
The largest item in the iterable is returned. 
If two or more positional arguments are provided, 
the largest of the positional arguments is returned.

There are two optional keyword-only arguments. 
The key argument specifies a one-argument ordering function like that used for list.sort(). 
The default argument specifies an object to return if the provided iterable is empty. 
If the iterable is empty and default is not provided, a ValueError is raised.

If multiple items are maximal, the function returns the first one encountered. 
This is consistent with other sort-stability preserving tools such as sorted
(iterable, key=keyfunc, reverse=True)[0] and heapq.nlargest(1, iterable, key=keyfunc).

New in version 3.4: The default keyword-only argument.
"
arguments size == 1 ifTrue: [ 
	"key"
	arguments first size == 0 ifTrue: [^keywords at: 'default' ifAbsent: [self error: 'value error']].
	^arguments first
		inject: arguments first first 
		into: [:last :each | last max: each]
].

^arguments
		"key"
		inject: arguments first
		into: [:last :each | last max: each]
%
category: 'functions'
method: Builtins
memoryview: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
memoryview(obj)
Return a “memory view” object created from the given argument.
 See Memory Views for more information.
"
self halt.
%
category: 'functions'
method: Builtins
min: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html"
	
"
min(iterable, *[, key, default])
min(arg1, arg2, *args[, key])
Return the smallest item in an iterable or the smallest of two or more arguments.

If one positional argument is provided, it should be an iterable. 
The smallest item in the iterable is returned. 
If two or more positional arguments are provided, 
the smallest of the positional arguments is returned.

There are two optional keyword-only arguments. 
The key argument specifies a one-argument ordering function like that used for list.sort(). 
The default argument specifies an object to return
 if the provided iterable is empty. 
If the iterable is empty and default is not provided, a ValueError is raised.

If multiple items are minimal, the function returns the first one encountered. 
This is consistent with other sort-stability preserving tools such as 
sorted(iterable, key=keyfunc)[0] and heapq.nsmallest(1, iterable, key=keyfunc).

New in version 3.4: The default keyword-only argument.
"
arguments size == 1 ifTrue: [ 
	"key"
	arguments first size == 0 ifTrue: [^keywords at: 'default' ifAbsent: [self error: 'value error']].
	^arguments first
		inject: arguments first first 
		into: [:last :each | last min: each]
].

^arguments
		"key"
		inject: arguments first
		into: [:last :each | last min: each]
%
category: 'functions'
method: Builtins
next: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
next(iterator[, default])¶
Retrieve the next item from the iterator by calling its __next__() 
method. If default is given, it is returned if the iterator is exhausted,
 otherwise StopIteration is raised.
"
self halt.
%
category: 'functions'
method: Builtins
object: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class object
Return a new featureless object. object is a base for all classes. 
It has the methods that are common to all instances of Python classes. 
This function does not accept any arguments.

Note object does not have a __dict__, so you can’t assign arbitrary 
attributes to an instance of the object class.
"
self halt.
%
category: 'functions'
method: Builtins
oct: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
oct(x)¶
Convert an integer number to an octal string prefixed with “0o”. 
The result is a valid Python expression. If x is not a Python int object,
 it has to define an __index__() method that returns an integer. For example:

>>> oct(8)
'0o10'
>>> oct(-56)
'-0o70'
If you want to convert an integer number to octal string either 
with prefix “0o” or not, you can use either of the following ways.

>>> '%#o' % 10, '%o' % 10
('0o12', '12')
>>> format(10, '#o'), format(10, 'o')
('0o12', '12')
>>> f'{10:#o}', f'{10:o}'
('0o12', '12')
See also format() for more information.
"
^(arguments first negative ifTrue: ['-'] ifFalse: ['']), '0o' , (arguments first abs printStringRadix: 8)
%
category: 'functions'
method: Builtins
open: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
see documentation for more details
"
self halt.
%
category: 'functions'
method: Builtins
ord: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
ord(c)
Given a string representing one Unicode character,
 return an integer representing the Unicode code point of that character. 
For example, ord('a') returns the integer 97 and ord('€') (Euro sign) returns 8364. 
This is the inverse of chr().
"

^(arguments first _decodeFromUtf8: true maxSize: 1) first codePoint
%
category: 'functions'
method: Builtins
pow: arguments
	"https://docs.python.org/3/library/functions.html"
	
"	pow(x, y[, z])
Return x to the power y; if z is present, return x to the power y, 
modulo z (computed more efficiently than pow(x, y) % z). 
The two-argument form pow(x, y) is equivalent to using the power operator: x**y.

The arguments must have numeric types. With mixed operand types, 
the coercion rules for binary arithmetic operators apply. 
For int operands, the result has the same type as the operands 
(after coercion) unless the second argument is negative;
 in that case, all arguments are converted to float and a float result is delivered. 
For example, 10**2 returns 100, but 10**-2 returns 0.01.
 If the second argument is negative, the third argument must be omitted.
 If z is present, x and y must be of integer types, and y must be non-negative.
"

	| result |
	result := arguments first raisedTo: (arguments at: 2).
	^arguments size == 2
		ifTrue: [result]
		ifFalse:[result rem: (arguments at: 3)]
%
category: 'functions'
method: Builtins
print: arguments keywords: keywords
	"https://docs.python.org/3/library/functions.html#print"

	| separator1 separator2 stream terminator |
	separator1 := keywords at: #'sep' ifAbsent: [' '].
	terminator := keywords at: #'end' ifAbsent: [Character lf asString].
	"We should default to stdout, but Transcript is easier (and more useful) for now"
	stream := keywords at: #'file' ifAbsent: [stdout ifNil: [Transcript]].
	separator2 := ''.
	arguments do: [:each | 
		| string |
		"https://docs.python.org/3/library/stdtypes.html#str"
		string := (each isKindOf: String) 
			ifTrue: [each]
			ifFalse: [each printString].
		stream nextPutAll: separator2; nextPutAll: string.
		separator2 := separator1.
	].
	stream nextPutAll: terminator.
	(keywords at: #'flush' ifAbsent: [false]) ifTrue: [stream flush].
%
category: 'functions'
method: Builtins
property: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
see documentation for more details
"
self halt.
%
category: 'functions'
method: Builtins
range: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
range(stop)
range(start, stop[, step])
Rather than being a function, range is actually an immutable sequence type, as documented 
in Ranges and Sequence Types — list, tuple, range.
"

arguments size == 1 ifTrue: [^Interval from: 0 to: arguments first - 1].
arguments size == 2 ifTrue: [^Interval from: arguments first to: arguments second - 1].
^Interval from: arguments first to: arguments second - 1 by: (arguments at: 3).
%
category: 'functions'
method: Builtins
repr: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
repr(object)
Return a string containing a printable representation of an object. 
For many types, this function makes an attempt to return a string
 that would yield an object with the same value when passed to eval(), 
otherwise the representation is a string enclosed in angle brackets that 
contains the name of the type of the object together with additional
 information often including the name and address of the object. 
A class can control what this function returns for its instances by defining a __repr__() method.
"
self halt.
%
category: 'functions'
method: Builtins
reversed: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
reversed(seq)
Return a reverse iterator. seq must be an object which has 
a __reversed__() method or supports the sequence protocol 
(the __len__() method and the __getitem__() method with 
integer arguments starting at 0).
"

^arguments first reverse
%
category: 'functions'
method: Builtins
round: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
Return number rounded to ndigits precision after the decimal point. 
If ndigits is omitted or is None, it returns the nearest integer to its input.

For the built-in types supporting round(), values are rounded to the closest 
multiple of 10 to the power minus ndigits; if two multiples are equally close, 
rounding is done toward the even choice (so, for example, both round(0.5) 
and round(-0.5) are 0, and round(1.5) is 2). Any integer value is valid for ndigits 
(positive, zero, or negative). The return value is an integer if ndigits is omitted or None. 
Otherwise the return value has the same type as number.

For a general Python object number, round delegates to number.__round__.

Note The behavior of round() for floats can be surprising: for example, 
round(2.675, 2) gives 2.67 instead of the expected 2.68. This is not a bug: 
it’s a result of the fact that most decimal fractions can’t be represented exactly as a float. 
See Floating Point Arithmetic: Issues and Limitations for more information.
"
	| number |
	arguments size == 1 ifTrue: [^arguments first roundedHalfToEven].
	number := 10 raisedTo: (arguments at: 2).
	^((arguments first * number) roundedHalfToEven / number) asFloat
%
category: 'functions'
method: Builtins
set: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class set([iterable])
Return a new set object, optionally with elements taken from iterable.
 set is a built-in class. See set and Set Types — set, frozenset for documentation about this class.

For other containers see the built-in frozenset, list, tuple, and 
dict classes, as well as the collections module.
"
self halt.
%
category: 'functions'
method: Builtins
setattr: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
setattr(object, name, value)
This is the counterpart of getattr(). The arguments are an 
object, a string and an arbitrary value. The string may name 
an existing attribute or a new attribute. The function assigns the value to the attribute, 
provided the object allows it. For example, setattr(x, 'foobar', 123) 
is equivalent to x.foobar = 123.
"
self halt.
%
category: 'functions'
method: Builtins
slice: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class slice(stop)¶
class slice(start, stop[, step])
Return a slice object representing the set of indices specified 
by range(start, stop, step). The start and step arguments default 
to None. Slice objects have read-only data attributes start, stop 
and step which merely return the argument values (or their default).
 They have no other explicit functionality; however they are used by
 Numerical Python and other third party extensions. Slice objects are 
also generated when extended indexing syntax is used.
 For example: a[start:stop:step] or a[start:stop, i].
 See itertools.islice() for an alternate version that returns an iterator.
"
self halt.
%
category: 'functions'
method: Builtins
staticmethod: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
@staticmethod¶
Transform a method into a static method.

A static method does not receive an implicit first argument. 
To declare a static method, use this idiom:

class C:
    @staticmethod
    def f(arg1, arg2, ...): ...
The @staticmethod form is a function decorator – see Function 
definitions for details.

A static method can be called either on the class (such as C.f()) 
or on an instance (such as C().f()).

Static methods in Python are similar to those found in Java or C++.
 Also see classmethod() for a variant that is useful for creating alternate class constructors.

Like all decorators, it is also possible to call staticmethod as a regular
 function and do something with its result. This is needed in some cases 
where you need a reference to a function from a class body and you 
want to avoid the automatic transformation to instance method. For 
these cases, use this idiom:

class C:
    builtin_open = staticmethod(open)
For more information on static methods, see The standard type hierarchy.
"
self halt.
%
category: 'functions'
method: Builtins
str: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class str(object='')
class str(object=b'', encoding='utf-8', errors='strict')
Return a str version of object. See str() for details.

str is the built-in string class. For general
 information about strings, see Text Sequence Type — str.
"
self halt.
%
category: 'functions'
method: Builtins
sum: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
Sums start and the items of an iterable from left to right and returns the total. 
start defaults to 0. The iterable’s items are normally numbers, and the start 
value is not allowed to be a string.

For some use cases, there are good alternatives to sum(). 
The preferred, fast way to concatenate a sequence of strings is by calling ''.
join(sequence). To add floating point values with extended precision, see math.fsum(). 
To concatenate a series of iterables, consider using itertools.chain().
"

	^arguments first
		inject: (arguments size > 1 ifTrue: [arguments at: 2] ifFalse: [0]) 
		into: [:sum :each | sum + each]
%
category: 'functions'
method: Builtins
super: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
super([type[, object-or-type]])
Return a proxy object that delegates method calls to a parent 
or sibling class of type. This is useful for accessing inherited methods 
that have been overridden in a class. The search order is same as 
that used by getattr() except that the type itself is skipped.

The __mro__ attribute of the type lists the method resolution search 
order used by both getattr() and super(). The attribute is dynamic and 
can change whenever the inheritance hierarchy is updated.

If the second argument is omitted, the super object returned is unbound.
 If the second argument is an object, isinstance(obj, type) must be true. 
If the second argument is a type, issubclass(type2, type) must be true 
(this is useful for classmethods).

There are two typical use cases for super. In a class hierarchy with single
 inheritance, super can be used to refer to parent classes without naming
 them explicitly, thus making the code more maintainable. This use closely
 parallels the use of super in other programming languages.

The second use case is to support cooperative multiple inheritance in a
 dynamic execution environment. This use case is unique to Python and 
is not found in statically compiled languages or languages that only support 
single inheritance. This makes it possible to implement “diamond diagrams”
 where multiple base classes implement the same method. Good design 
dictates that this method have the same calling signature in every case 
(because the order of calls is determined at runtime, because that order 
adapts to changes in the class hierarchy, and because that order can 
include sibling classes that are unknown prior to runtime).

For both use cases, a typical superclass call looks like this:

class C(B):
    def method(self, arg):
        super().method(arg)    # This does the same thing as:
                               # super(C, self).method(arg)
Note that super() is implemented as part of the binding process for
 explicit dotted attribute lookups such as super().__getitem__(name).
 It does so by implementing its own __getattribute__() method for 
searching classes in a predictable order that supports cooperative
 multiple inheritance. Accordingly, super() is undefined for implicit 
lookups using statements or operators such as super()[name].

Also note that, aside from the zero argument form, super() is not
 limited to use inside methods. The two argument form specifies 
the arguments exactly and makes the appropriate references.
 The zero argument form only works inside a class definition,
 as the compiler fills in the necessary details to correctly 
retrieve the class being defined, as well as accessing the 
current instance for ordinary methods.

For practical suggestions on how to design cooperative
 classes using super(), see guide to using super().
"
self halt.
%
category: 'functions'
method: Builtins
tuple: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
tuple([iterable])
Rather than being a function, tuple is actually an immutable sequence type, 
as documented in Tuples and Sequence Types — list, tuple, range.
"
	^arguments first asArray copy immediateInvariant
%
category: 'functions'
method: Builtins
type: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
class type(object)
class type(name, bases, dict)
With one argument, return the type of an object. 
The return value is a type object and generally the same object as returned by object.__class__.

The isinstance() built-in function is recommended 
for testing the type of an object, because it takes subclasses into account.

With three arguments, return a new type object. 
This is essentially a dynamic form of the class statement. 
The name string is the class name and becomes the __name__ 
attribute; the bases tuple itemizes the base classes and becomes 
the __bases__ attribute; and the dict dictionary is the namespace
 containing definitions for class body and is copied to a standard 
dictionary to become the __dict__ attribute. For example, the following 
two statements create identical type objects:

>>> class X:
...     a = 1
...
>>> X = type('X', (object,), dict(a=1))
See also Type Objects.

Changed in version 3.6: Subclasses of type which don’t override
 type.__new__ may no longer use the one-argument form to get the type of an object.
"
self halt.
%
category: 'functions'
method: Builtins
vars: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
vars([object])
Return the __dict__ attribute for a module, class, instance, 
or any other object with a __dict__ attribute.

Objects such as modules and instances have an updateable
 __dict__ attribute; however, other objects may have write
 restrictions on their __dict__ attributes (for example,
 classes use a types.MappingProxyType to prevent direct dictionary updates).

Without an argument, vars() acts like locals(). Note,
 the locals dictionary is only useful for reads since
 updates to the locals dictionary are ignored.
"
self halt.
%
category: 'functions'
method: Builtins
zip: arguments
	"https://docs.python.org/3/library/functions.html"
	
"
zip(*iterables)
Make an iterator that aggregates elements from each of the iterables.

Returns an iterator of tuples, where the i-th tuple contains 
the i-th element from each of the argument sequences or iterables. 
The iterator stops when the shortest input iterable is exhausted. 
With a single iterable argument, it returns an iterator of 1-tuples.
 With no arguments, it returns an empty iterator. Equivalent to:

def zip(*iterables):
    # zip('ABCD', 'xy') --> Ax By
    sentinel = object()
    iterators = [iter(it) for it in iterables]
    while iterators:
        result = []
        for it in iterators:
            elem = next(it, sentinel)
            if elem is sentinel:
                return
            result.append(elem)
        yield tuple(result)
The left-to-right evaluation order of the iterables is guaranteed. 
This makes possible an idiom for clustering a data series into n-length 
groups using zip(*[iter(s)]*n). This repeats the same iterator n times
 so that each output tuple has the result of n calls to the iterator. This 
has the effect of dividing the input into n-length chunks.

zip() should only be used with unequal length inputs when you don’t care
 about trailing, unmatched values from the longer iterables. If those values 
are important, use itertools.zip_longest() instead.

zip() in conjunction with the * operator can be used to unzip a list:

>>>
>>> x = [1, 2, 3]
>>> y = [4, 5, 6]
>>> zipped = zip(x, y)
>>> list(zipped)
[(1, 4), (2, 5), (3, 6)]
>>> x2, y2 = zip(*zip(x, y))
>>> x == list(x2) and y == list(y2)
True
"
self halt.
%
set compile_env: 0
category: 'other'
method: Builtins
initialize
"
	SessionTemps current removeKey: #'Python_Builtins' ifAbsent: [].
"
	super initialize.
	dictionary 
		at: #'None' 			put: nil;
		at: #'True'				put: true;
		at: #'False'				put: false;
		at: #'__import__'		put: [:arguments :keywords | self __import__: arguments first keywords: keywords];
		at: #'abs'				put: [:arguments :keywords | self abs: arguments first];
		at: #'print'				put: [:arguments :keywords | self print: arguments keywords: keywords];
		yourself.
%
category: 'other'
method: Builtins
stdout: aStream

	stdout := aStream.
%
