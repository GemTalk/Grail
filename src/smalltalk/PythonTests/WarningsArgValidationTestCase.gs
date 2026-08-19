! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'WarningsArgValidationTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
WarningsArgValidationTestCase comment:
'warnings checks its arguments, and honours a replaced showwarning.

Three things CPython does that Grail did not:

	warn_explicit validates lineno, the message/category pair and the
	registry, raising TypeError at the CALL rather than failing obscurely
	later in the display;

	warn(..., skip_file_prefixes=X) requires a TUPLE OF STR -- a list, a bytes
	element or a bare string are each a TypeError.  Grail does not act on the
	argument (it selects which frames to skip when attributing a warning), but
	accepting a malformed one silently is worse than not supporting it;

	showwarning is a documented hook, so a replacement is USED, and one that
	is not callable is a TypeError at the point of use.

Two things this got wrong first, both worth keeping:

The validation went into the varargs entry alone, and checked nothing -- a
four-positional ``warn_explicit(a, b, c, d)'' takes the FIXED-ARITY selector.
It now lives in one helper both entries call.

The showwarning hook was read from the module''s SymbolDictionary only.  A
module attribute assignment can land there or in the dynamic-instVar holder
depending on the path taken, and a hook found in only one of them is a hook
that silently does not apply; reading both fixed two tests rather than the one
it was aimed at.

See tests/python/warnings_arg_validation.py.'
%

expectvalue /Class
doit
WarningsArgValidationTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
WarningsArgValidationTestCase removeAllMethods: 0.
WarningsArgValidationTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: WarningsArgValidationTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'warnings_arg_validation' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/warnings_arg_validation.py')
		name: 'warnings_arg_validation'.
%

category: 'Grail-Helpers'
method: WarningsArgValidationTestCase
resultAt: aKey
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey
%

category: 'Grail-Helpers'
method: WarningsArgValidationTestCase
assertAll: keys
	keys do: [:each | self assert: (self resultAt: each) equals: true]
%

category: 'Grail-Tests - warn_explicit'
method: WarningsArgValidationTestCase
testWarnExplicitChecksItsArguments
	"lineno must be an int; either the message is a Warning instance or the
	category is a Warning subclass; registry must be a mapping."

	self assertAll: #('lineno_must_be_an_int'
		'message_or_category_must_carry_the_category'
		'registry_must_be_a_mapping')
%

category: 'Grail-Tests - warn_explicit'
method: WarningsArgValidationTestCase
testAWellFormedCallStillWarns
	"The checks must not cost the ordinary path."

	self assertAll: #('a_well_formed_call_still_warns')
%

category: 'Grail-Tests - skip_file_prefixes'
method: WarningsArgValidationTestCase
testSkipFilePrefixesMustBeATupleOfStrs
	"A list, a bytes element and a bare string are each rejected."

	self assertAll: #('a_list_is_rejected' 'a_bytes_element_is_rejected'
		'a_bare_string_is_rejected' 'a_tuple_of_strs_is_accepted')
%

category: 'Grail-Tests - showwarning'
method: WarningsArgValidationTestCase
testAReplacedShowwarningIsUsed
	"It is a documented hook, so a replacement actually receives the warning."

	self assertAll: #('a_replacement_is_used')
%

category: 'Grail-Tests - showwarning'
method: WarningsArgValidationTestCase
testANonCallableReplacementRaises
	self assertAll: #('a_non_callable_replacement_raises')
%
