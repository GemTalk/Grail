! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'StrIsATypeTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
StrIsATypeTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! StrIsATypeTestCase - the bare name ``str'' must evaluate to the string TYPE.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
StrIsATypeTestCase removeAllMethods.
StrIsATypeTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Builtin Types'
method: StrIsATypeTestCase
testStrIsAType
	"Grail published a ``str:'' fast-path method on builtins, and NameAst treats
	any name builtins publishes a method for as a fast-path builtin
	(isFastPathBuiltinName:) -- so the bare name ``str'' evaluated to a
	BoundMethod WRAPPER rather than the string class.

	The wrapper was well camouflaged: ``isinstance(x, str)'', ``str('x')'',
	``str.__name__'', ``issubclass(str, object)'' and even ``class S(str)'' all
	worked.  Two things gave it away, and both are pinned below: ``type('a') is
	str'' was False, and ``dir(str)'' described a FUNCTION object -- 53 of str's
	98 names missing.  It was found by a dir() parity sweep against CPython
	(scripts/dir_parity.py), which is also what showed only ``str'' and ``type''
	are affected; int, float, list, dict, set, tuple, bytes, bool, frozenset,
	object, bytearray and complex were already the real classes.

	The fix removes builtins>>str: -- the same fix ``enumerate'' had -- so the
	name resolves to the class and ``str(x)'' becomes ordinary instantiation.
	The semantics that method carried moved into str.gs's __new__:, which is
	where CPython keeps them, and the constructor checks below are what hold
	them: a str SUBCLASS coerces DOWN to a plain str (otherwise
	FooStr.__float__ calling str(self) recurses forever), an OVERRIDING __str__
	is honoured (the str-mixin enum member shape), and a WIDE string is not
	narrowed on the way through.

	All fourteen checks answer identically under real CPython 3.14.6, verified
	by running the fixture directly.  See tests/python/str_is_a_type.py."

	| mod |
	importlib @env1:modules removeKey: #'str_is_a_type' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_is_a_type.py')
		name: 'str_is_a_type'.
	#( 'the_name_str_is_the_string_type'
	   'str_is_a_type_not_a_function'
	   'dir_str_lists_its_methods'
	   'str_of_no_arguments_is_empty'
	   'str_of_a_string_is_that_string'
	   'str_of_a_number_is_its_text'
	   'str_of_none_is_the_word_none'
	   'str_of_a_list_is_its_repr'
	   'str_of_a_subclass_is_a_plain_str'
	   'str_honours_an_overriding_dunder_str'
	   'a_wide_string_survives_str'
	   'isinstance_still_works'
	   'subclassing_still_works'
	   'str_is_reachable_as_a_builtin_attribute' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'str check failed: ' , k , ' -> ' , answer printString]
%
