Class {
	#name : 'TracebackObjectTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TracebackObjectTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
TracebackObjectTestCase >> setUp [
	"Reload tests/python/traceback_object.py fresh each test -- the module body
	MUTATES the tracebacks it builds (tb_next is reassigned, cleared and
	re-pointed), so a shared instance would be reading a previous test's edits."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'traceback_object' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/traceback_object.py')
		name: 'traceback_object'.

]

{ #category : 'Grail-Tests - tb_next Is Guarded' }
TracebackObjectTestCase >> testALoopIsAValueError [
	"The one that matters most: every traceback walker loops until tb_next is
	None, so a cycle does not raise anything -- it HANGS.  Both the direct
	self-link and the two-node indirect one."

	self assertMatchesCPythonAt: 'self_loop'.
	self assertMatchesCPythonAt: 'indirect_loop'.

]

{ #category : 'Grail-Tests - with_traceback' }
TracebackObjectTestCase >> testAnAttachedTracebackIsPrependedToNotReplaced [
	"``raise X().with_traceback(tb)'' must leave __traceback__ as a NEW head
	whose tb_next is the attached chain.  Grail discarded the chain, so the
	whole idiom silently did nothing."

	self assertMatchesCPythonAt: 'accepts_traceback'.

]

{ #category : 'Grail-Tests - tb_next Is Guarded' }
TracebackObjectTestCase >> testAssigningANonTracebackIsATypeError [
	"Stored as-is before, so the failure surfaced later, inside whichever
	formatter walked into a string."

	self assertMatchesCPythonAt: 'assign_str'.

]

{ #category : 'Grail-Tests - The Type' }
TracebackObjectTestCase >> testATracebackIsAnInstanceOfTracebackType [
	"THE TEST THIS EXISTS FOR.  isinstance(tb, types.TracebackType) was False
	about a genuine traceback, which is the first thing any traceback-handling
	code asks."

	self assertMatchesCPythonAt: 'is_traceback_type'.
	self assertMatchesCPythonAt: 'type_is_tracebacktype'.

]

{ #category : 'Grail-Tests - tb_next Is Guarded' }
TracebackObjectTestCase >> testDeletingTbNextIsATypeError [
	"TypeError, not AttributeError: the attribute exists and is writable, so
	what is refused is the DELETION.  Grail removed the slot, and an absent slot
	reads back as AttributeError -- a different error, further away."

	self assertMatchesCPythonAt: 'delete_next'.

]

{ #category : 'Grail-Tests - Constructor' }
TracebackObjectTestCase >> testEachArgumentIsCheckedWithItsOwnMessage [
	"Three different shapes of message for four arguments, and CPython's own
	wording for each: ``expected traceback object or None'' names what was
	wanted, ``must be frame, not str'' names the argument, and the two integers
	share the generic ``cannot be interpreted as an integer''."

	self assertMatchesCPythonAt: 'construct_bad_next'.
	self assertMatchesCPythonAt: 'construct_bad_frame'.
	self assertMatchesCPythonAt: 'construct_bad_lasti'.
	self assertMatchesCPythonAt: 'construct_bad_lineno'.

]

{ #category : 'Grail-Tests - The Type' }
TracebackObjectTestCase >> testTheFieldsAWalkerReads [
	"tb_lasti was ABSENT, so reading it raised where CPython answers an int.
	Grail compiles to Smalltalk and has no bytecode offset, so it reports -1 --
	CPython's own value for ``no instruction index'', not a placeholder invented
	here."

	self assertMatchesCPythonAt: 'lineno_is_int'.
	self assertMatchesCPythonAt: 'lasti_is_int'.
	self assertMatchesCPythonAt: 'frame_is_not_none'.
	self assertMatchesCPythonAt: 'tb_next_of_leaf'.

]

{ #category : 'Grail-Tests - Still Legal' }
TracebackObjectTestCase >> testTheOrdinaryReportingPathIsUndisturbed [
	"A traceback is not only an object to poke at -- it is what the traceback
	module formats.  Renaming the type and guarding the field must leave the
	chain walkable and the report readable."

	self assertMatchesCPythonAt: 'walk_chain'.
	self assertMatchesCPythonAt: 'format_still_works'.

]

{ #category : 'Grail-Tests - The Type' }
TracebackObjectTestCase >> testTheTypeIsNamedTraceback [
	"CPython's is a builtin type spelled ``traceback'', module ``builtins''.
	Grail's internal ``PyTraceback'' spelling leaked into every repr and every
	type(tb).__name__."

	self assertMatchesCPythonAt: 'type_name'.
	self assertMatchesCPythonAt: 'type_module'.
	self assertMatchesCPythonAt: 'type_repr'.

]

{ #category : 'Grail-Tests - tb_next Is Guarded' }
TracebackObjectTestCase >> testTheValidAssignmentsStillWork [
	"The guard would be worthless if it also refused the writes the field exists
	for -- clearing to None, and re-pointing at another node."

	self assertMatchesCPythonAt: 'valid_assignments'.

]

{ #category : 'Grail-Tests - Constructor' }
TracebackObjectTestCase >> testTracebackTypeIsCallable [
	"types.TracebackType(tb_next, tb_frame, tb_lasti, tb_lineno) -- how a
	replacement node is built, and so how frames are trimmed off a chain before
	re-raising.  The class was not callable at all."

	self assertMatchesCPythonAt: 'construct'.
	self assertMatchesCPythonAt: 'construct_none_next'.

]

{ #category : 'Grail-Tests - with_traceback' }
TracebackObjectTestCase >> testWithTracebackNoneClearsIt [
	"None has to be stored as the ABSENCE of a traceback, not as the None
	singleton: everything that asks whether there is a chain yet asks
	``tracebackObj isNil'', and a stored None answered that wrong."

	self assertMatchesCPythonAt: 'with_traceback_none_clears'.

]
