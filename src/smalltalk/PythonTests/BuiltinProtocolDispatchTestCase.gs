! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for BuiltinProtocolDispatchTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'BuiltinProtocolDispatchTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
BuiltinProtocolDispatchTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! BuiltinProtocolDispatchTestCase - builtins that skipped the protocol they
! stand for
! ===============================================================================
! Four entry points computed a result instead of asking the protocol.  For the
! BUILT-IN types the shortcut and the protocol agree, so each was invisible until
! a class implemented the protocol and nothing else.  All four were found by
! test.test_decimal -- one error each, and its whole remaining error count:
!
!   1. ``%'' WITH A MAPPING ON THE RIGHT.  CPython keeps the mapping for
!      ``%(name)s'' lookups and, because the operand is not a tuple, also lets an
!      UNKEYED specifier consume the mapping itself, exactly once.  Grail read
!      "operand is a mapping" as "keys are mandatory" and raised ``format
!      requires a mapping'' for ``'%s' % {}''.  That message belongs to the
!      OPPOSITE case -- a keyed specifier whose operand is not a mapping -- which
!      Grail did not check at all, so ``'%(a)s' % [1]'' took an UNCATCHABLE
!      ArgumentTypeError (error 2283) out of OrderedCollection>>at:.
!
!   2. divmod().  A binary operator dispatched on __divmod__/__rdivmod__, not
!      sugar for ``(a // b, a % b)''.  Grail computed the pair, so a class
!      defining __divmod__ and no __floordiv__ was never asked -- and the
!      TypeError named ``//'', an operator the call never used.  Chasing that
!      name is how the defect stayed hidden: the report pointed at floor
!      division in a test that does not use it.
!
!   3. THREE-ARGUMENT pow().  Dispatched on __pow__/__rpow__ with the modulus
!      passed through.  Grail implemented modular exponentiation for integers
!      only and raised for anything else.  The MODULUS is never dispatched on,
!      which is why pow(10, 2, Decimal(7)) is still a TypeError -- test_decimal
!      pins both halves of that rule.
!
!   4. threading.Thread(context=...), 3.14's way of handing a thread a KNOWN
!      contextvars context instead of whatever thread_inherit_context would give
!      it.  Grail's Thread did not accept the keyword.
!
! WHAT THE FIX TO (2) EXPOSED, and the reason Int.gs and Float.gs are in the
! change: routing divmod() through __divmod__ put it on dunders that had never
! carried the traffic.  Int>>__divmod__ and Float>>__divmod__ did raw kernel
! arithmetic with no operand guard, so ``divmod(10, Decimal(3))'' became an
! uncatchable _generality DNU where the floordiv/mod pair had fallen back
! correctly; and Float>>__divmod__ never coerced its quotient, so
! ``divmod(7.5, 2)'' answered (3, 1.5) where CPython answers (3.0, 1.5).  Both
! are asserted below -- a fix that moves work onto a colder path has to carry the
! colder path with it.
!
! tests/python/builtin_protocol_dispatch.py holds the 25 checks below and is run
! under real CPython 3.14 by scripts/check_python_fixtures.sh.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
BuiltinProtocolDispatchTestCase removeAllMethods.
BuiltinProtocolDispatchTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Tests - builtin protocol dispatch'
method: BuiltinProtocolDispatchTestCase
testEveryProtocolCheckAgreesWithCPython
	"Every check in tests/python/builtin_protocol_dispatch.py, which the fixture
	gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING fails
	too -- a fixture that stopped defining checks would otherwise pass this test
	with an empty loop."

	| fixture results names |
	importlib @env1:modules removeKey: #'builtin_protocol_dispatch' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_protocol_dispatch.py')
		name: 'builtin_protocol_dispatch'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_keyed_specifier_needs_a_mapping'
	  'a_keyed_specifier_still_reads_the_mapping'
	  'a_mapping_is_one_positional_only'
	  'a_mapping_key_may_be_read_twice'
	  'a_sequence_operand_must_be_consumed'
	  'a_thread_runs_in_the_context_it_was_given'
	  'a_thread_without_a_context_still_runs'
	  'an_unread_mapping_is_not_an_error'
	  'divmod_asks_the_left_operand'
	  'divmod_asks_the_right_operand'
	  'divmod_by_zero_is_catchable'
	  'divmod_names_itself_when_unsupported'
	  'divmod_of_a_float_answers_floats'
	  'divmod_of_two_ints'
	  'divmod_rounds_toward_negative_infinity'
	  'percent_s_renders_a_populated_mapping'
	  'percent_s_renders_an_empty_mapping'
	  'percent_s_still_renders_a_list'
	  'the_modulus_is_never_dispatched_on'
	  'three_arg_pow_accepts_a_negative_exponent'
	  'three_arg_pow_asks_the_base'
	  'three_arg_pow_asks_the_exponent'
	  'three_arg_pow_of_ints'
	  'two_arg_pow_passes_no_modulus'
	  'unreferenced_keys_are_fine').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 25
%

category: 'Grail-Tests - builtin protocol dispatch'
method: BuiltinProtocolDispatchTestCase
testAKeyedSpecifierOverANonMappingIsCatchable
	"``'%(a)s' % [1]'' used to reach OrderedCollection>>at: with a String key and
	take an UNCATCHABLE ArgumentTypeError (error 2283) -- a Smalltalk error that
	no Python ``except'' can see.  It is now the TypeError CPython raises.

	Asserted through a Python ``except'' rather than by inspecting the message,
	because CATCHABILITY is the property that changed: CPython's own wording for
	a list operand is ``list indices must be integers or slices, not str'' (a
	list passes its mapping check and then fails the lookup), where Grail says
	``format requires a mapping''.  Both are TypeError, and the difference is
	recorded rather than asserted."

	self assert: (self eval:
'try:
    "%(a)s" % [1]
    r = "no raise"
except TypeError:
    r = "TypeError"
r
') equals: 'TypeError'
%

category: 'Grail-Tests - builtin protocol dispatch'
method: BuiltinProtocolDispatchTestCase
testDivmodReportsItselfRatherThanFloorDivision
	"The name in the message is what sent the original investigation to the wrong
	operator: divmod() on a class with no numeric protocol reported ``unsupported
	operand type(s) for //'', so test_decimal's test_rop looked like a floor
	division defect in a test that never uses floor division."

	self assert: (self eval:
'try:
    divmod(object(), object())
    r = "no raise"
except TypeError as exc:
    r = str(exc)
r
') equals: 'unsupported operand type(s) for divmod(): ''object'' and ''object'''
%
