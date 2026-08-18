! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'NotImplementedSingletonTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
NotImplementedSingletonTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! NotImplementedSingletonTestCase - NotImplemented as a real singleton.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
NotImplementedSingletonTestCase removeAllMethods.
NotImplementedSingletonTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - Builtin Types'
method: NotImplementedSingletonTestCase
testNotImplementedIsASingletonOfItsOwnType
	"A binary dunder returns ``NotImplemented'' to decline an operand; the
	operator layer then reflects to the other side and, if that declines too,
	raises TypeError.  It is a control-flow marker, never a value.

	Grail modelled it as the SYMBOL #'___NotImplemented___'.  The identity test
	worked and nothing else did:

		type(NotImplemented)             Symbol   CPython: NotImplementedType
		repr(NotImplemented)             a quoted Symbol   CPython: 'NotImplemented'
		isinstance(NotImplemented, str)  True     CPython: False
		bool(NotImplemented)             True     CPython: TypeError

	The last line is the dangerous one, and unlike the ellipsis case it had
	ALREADY DRAWN BLOOD -- twice.  A Symbol is truthy, so a marker reaching a
	boolean context took the wrong branch in silence; and where a GemStone
	primitive wanted a real Boolean it died with an uncatchable ``Expected ... to
	be a Boolean'' rather than any Python exception.  builtins.gs and list.gs
	still carry the workarounds written for that.  CPython raises TypeError here
	precisely so the mistake cannot be silent (GH-79893; a TypeError since 3.12).

	The ``declines'' checks near the end are the ones that matter for regression:
	the marker must still be CONSUMED by the operator layer and never surface as
	the result of an expression.  ``min(3j, 1j)'' is the uncatchable case,
	reproduced.

	All eighteen checks answer identically under real CPython, verified by running
	the fixture.  See tests/python/notimplemented_singleton.py."

	| mod |
	importlib @env1:modules removeKey: #'notimplemented_singleton' ifAbsent: [].
	mod := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/notimplemented_singleton.py')
		name: 'notimplemented_singleton'.
	#( 'its_type_is_named_notimplementedtype'
	   'types_notimplementedtype_is_that_type'
	   'calling_the_type_answers_the_same_object'
	   'it_is_not_a_string'
	   'it_does_not_equal_the_old_sentinel_spelling'
	   'bool_of_it_raises_typeerror'
	   'using_it_in_an_if_raises_typeerror'
	   'negating_it_raises_typeerror'
	   'repr_is_the_bare_name'
	   'str_falls_through_to_repr'
	   'a_declining_eq_still_compares_false'
	   'a_declining_eq_returns_it_when_called_directly'
	   'a_builtin_dunder_declines_the_same_way'
	   'declining_both_ways_raises_typeerror_not_a_bogus_bool'
	   'sorting_incomparables_raises_typeerror'
	   'reduce_answers_the_name_to_save_it_under'
	   'copy_preserves_identity'
	   'pickle_round_trips_to_the_same_object' ) do: [:k |
		| answer |
		answer := mod @env0:perform: k asSymbol env: 1.
		self assert: (answer = true)
			description: 'NotImplemented check failed: ' , k , ' -> ' , answer printString]
%
