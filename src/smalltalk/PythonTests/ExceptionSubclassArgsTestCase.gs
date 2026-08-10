! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ExceptionSubclassArgsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ExceptionSubclassArgsTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
ExceptionSubclassArgsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ExceptionSubclassArgsTestCase - a user-defined exception subclass records the
! constructor arguments it was given, even with no __init__ of its own.
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ExceptionSubclassArgsTestCase removeAllMethods: 0.
ExceptionSubclassArgsTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Tests - Exceptions'
method: ExceptionSubclassArgsTestCase
loadFixture
	"Re-import the fixture module each time so its classes are freshly built."

	importlib @env1:modules removeKey: #'exception_subclass_args' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/exception_subclass_args.py')
		name: 'exception_subclass_args'
%

category: 'Grail-Tests - Exceptions'
method: ExceptionSubclassArgsTestCase
runChecks: selectorNames
	"Run each named fixture function; each answers true when it matches CPython."

	| mod |
	mod := self loadFixture.
	selectorNames do: [:k |
		self assert: ((mod @env0:perform: k asSymbol env: 1) = true)
			description: 'exception-subclass args check failed: ' , k]
%

category: 'Grail-Tests - Exceptions'
method: ExceptionSubclassArgsTestCase
testSubclassWithNoInitRecordsArgs
	"``class MyError(Exception): pass'' -- the commonest way to declare an
	exception -- recorded NO args, so str(e) was '' and the message vanished
	from every render.  The generated constructor probes the VARARGS selector
	``___init__:kw:'' when the subclass defines no __init__ of its own, and
	BaseException implemented only the 0- and 1-argument forms; the resulting
	MessageNotUnderstood is swallowed by design, so the miss was silent."

	self runChecks: #( 'a_subclass_with_no_init_records_args'
	                   'args_is_the_whole_positional_tuple'
	                   'a_subclass_that_chains_to_super_still_works' )
%

category: 'Grail-Tests - Exceptions'
method: ExceptionSubclassArgsTestCase
testRaisedSubclassCarriesItsMessage
	"The consequence that matters: ``raise MyError('boom')'' has to report its
	message, both from the constructed instance and through an actual
	raise/except round trip."

	self runChecks: #( 'the_message_reaches_the_rendered_traceback'
	                   'a_raised_subclass_carries_its_message'
	                   'repr_sees_the_args' )
%

category: 'Grail-Tests - Exceptions'
method: ExceptionSubclassArgsTestCase
testBaseExceptionTakesNoKeywordArguments
	"CPython: ``Exception(x=1)'' is a TypeError.  A subclass that wants keyword
	arguments defines its own __init__, and is then dispatched statically
	without ever reaching BaseException's varargs form."

	self runChecks: #( 'keyword_arguments_are_rejected' )
%
