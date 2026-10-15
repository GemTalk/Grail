Class {
	#name : 'BuiltinProtocolDispatchTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - builtin protocol dispatch' }
BuiltinProtocolDispatchTestCase >> testAKeyedSpecifierOverANonMappingIsCatchable [
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

]

{ #category : 'Grail-Tests - builtin protocol dispatch' }
BuiltinProtocolDispatchTestCase >> testDivmodReportsItselfRatherThanFloorDivision [
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

]

{ #category : 'Grail-Tests - builtin protocol dispatch' }
BuiltinProtocolDispatchTestCase >> testEveryProtocolCheckAgreesWithCPython [
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

]
