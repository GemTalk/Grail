Class {
	#name : 'ClassBodyTracebackTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'irModule',
		'textModule',
		'irRegistrySnapshot'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyTracebackTestCase >> ___expectedReprOf___: aModule key: aKey [
	^ ((aModule @env1:___pyAttrLoad___: #'EXPECTED') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
ClassBodyTracebackTestCase >> ___fixturePath___ [
	^ importlib grailDir , '/tests/python/class_body_traceback.py'

]

{ #category : 'Grail-Private' }
ClassBodyTracebackTestCase >> ___irModule___ [
	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'cbt_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbt_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbt_ir'.
	^ irModule

]

{ #category : 'Grail-Private' }
ClassBodyTracebackTestCase >> ___keys___ [
	"Every key of the fixture.  ``a_nested_class_body'' was its XFAIL until P3.4
	gave a nested class body a helper -- a frame -- of its own."

	^ #('a_simple_class_body' 'a_class_body_calling_a_function'
	    'a_nested_class_body' 'raises_outside_any_class')

]

{ #category : 'Grail-Private' }
ClassBodyTracebackTestCase >> ___reprOf___: aModule key: aKey [
	^ ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString

]

{ #category : 'Grail-Private' }
ClassBodyTracebackTestCase >> ___textModule___ [
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'cbt_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'cbt_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'cbt_text'.
	^ textModule

]

{ #category : 'Grail-Setup' }
ClassBodyTracebackTestCase >> tearDown [
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'cbt_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'cbt_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'cbt_ir'.
	self ___forgetCanonicalModule___: 'cbt_text'.
	irModule := nil.
	textModule := nil

]

{ #category : 'Grail-Tests - class body traceback' }
ClassBodyTracebackTestCase >> testANestedClassBodyHasItsOwnFrame [
	"Cut 114's XFAIL, closed by P3.4: a class nested in a method-local class
	body is built by a helper of its own, so the failing line is reported under
	the NESTED class's name, with the outer class's frame at the ``class
	Inner:'' line above it, as CPython reports them."

	| got |
	got := self ___reprOf___: self ___irModule___ key: 'a_nested_class_body'.
	self assert: ((got includesString: '(''Inner'', ''w = 1 // 0'')')
		and: [got includesString: '(''Outer'', ''class Inner:'')'])
		description: 'the nested class-body frame is missing: ' , got

]

{ #category : 'Grail-Tests - class body traceback' }
ClassBodyTracebackTestCase >> testTheClassBodyFrameIsReportedUnderIR [
	"The cut.  Four shapes: a class body whose attribute value raises, one
	whose value raises inside a CALL, a class nested in one (P3.4), and -- as
	the control that the ordinary path is untouched -- a raise with no class
	involved at all."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: self ___irModule___ key: k.
		want := self ___expectedReprOf___: self ___irModule___ key: k.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'class-body traceback frames disagreeing with CPython under '
			, 'IR: ' , bad asArray printString

]

{ #category : 'Grail-Tests - class body traceback' }
ClassBodyTracebackTestCase >> testTheFailingLineIsNotLost [
	"The defect stated on its own, and the assertion that fails if any ONE of
	the three pieces is reverted.

	Named by the source TEXT rather than a line number so editing the fixture
	does not rewrite it."

	| got |
	got := self ___reprOf___: self ___irModule___ key: 'a_simple_class_body'.
	self assert: (got includesString: 'b = 1 // 0')
		description: 'the failing line of a class body is missing from the '
			, 'traceback again: ' , got

]

{ #category : 'Grail-Tests - class body traceback' }
ClassBodyTracebackTestCase >> testTheIRArmActuallyCompiledTheFixture [
	"Correct frames prove nothing if the seam fell back to text, which reports
	the body's line under the enclosing def's name and would satisfy a
	line-only assertion."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'

]

{ #category : 'Grail-Tests - class body traceback' }
ClassBodyTracebackTestCase >> testTheTextPathStillHasNoClassBodyFrame [
	"THE ASYMMETRY, pinned as a measurement rather than left in a comment.

	The text inlines a method-local class build into the enclosing def, so
	there is no frame to name and the body's line is reported against the
	ENCLOSING def.  The IR path has a real helper method and so can carry
	CPython's class-body frame; this is one of the few places where the IR
	path is the more accurate of the two.

	Fails when the text path grows a class-body frame, which is when the note
	in the class comment retires."

	| got |
	got := self ___reprOf___: self ___textModule___ key: 'a_simple_class_body'.
	self assert: (got includesString: '''C''') not
		description: 'the text path now reports a class-body frame -- retire the '
			, 'asymmetry note: ' , got

]
