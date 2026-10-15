Class {
	#name : 'CodeFlagsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
CodeFlagsTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
CodeFlagsTestCase >> setUp [
	"Reload tests/python/code_flags.py fresh each test: the probes ASSIGN
	__code__ on the functions they build, so a shared instance would let one
	test read code another test installed."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'code_flags' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/code_flags.py')
		name: 'code_flags'.

]

{ #category : 'Grail-Tests - The Assignment Rule' }
CodeFlagsTestCase >> testAssigningAcrossKindsWarns [
	"THE TEST THIS EXISTS FOR: one DeprecationWarning, carrying CPython's
	wording.  test_funcattrs matches on ``code object of non-matching type'',
	so the phrase is part of the contract rather than incidental prose."

	self assertMatchesCPythonAt: 'assign_across_kinds_warns'.

]

{ #category : 'Grail-Tests - The Assignment Rule' }
CodeFlagsTestCase >> testEveryMismatchedPairWarns [
	"All twelve ordered pairs, as test_funcattrs walks them.  A rule that fired
	in one direction only, or for one kind only, would still pass a single
	case."

	self assertMatchesCPythonAt: 'every_mismatched_pair_warns'.

]

{ #category : 'Grail-Tests - The Flag Word' }
CodeFlagsTestCase >> testParameterShapeAndNesting [
	"``*args'', ``**kwargs'', both, and neither; and CO_NESTED set for a def
	inside a def but clear for a module-level one.  These bits are not what the
	assignment rule reads, which is exactly why they are checked -- a rule that
	compared whole flag words would trip on them."

	self assertMatchesCPythonAt: 'parameter_shape_bits'.
	self assertMatchesCPythonAt: 'nesting_is_a_flag'.

]

{ #category : 'Grail-Tests - The Flag Word' }
CodeFlagsTestCase >> testTheFourKinds [
	"Plain function, generator, async generator and coroutine, as CPython's own
	numbers -- 19 / 51 / 531 / 147 -- rather than four values that merely differ
	from one another.  Distinctness is asserted separately because it is what
	the assignment rule is stated in terms of: two kinds that collided could
	not be told apart at all."

	self assertMatchesCPythonAt: 'the_four_kinds'.
	self assertMatchesCPythonAt: 'the_four_kinds_are_all_distinct'.

]

{ #category : 'Grail-Tests - The Assignment Rule' }
CodeFlagsTestCase >> testTheRuleDoesNotOvershoot [
	"Two guards a careless reading of the rule breaks.  Same KIND must go
	through in silence even when the parameter-shape bits differ -- otherwise
	nearly every assignment warns.  And the warning is a WARNING: the
	assignment still takes effect, which is what distinguishes this from the
	free-variable rule beside it, where the write is refused outright."

	self assertMatchesCPythonAt: 'same_kind_does_not_warn'.
	self assertMatchesCPythonAt: 'the_assignment_still_happens'.

]
