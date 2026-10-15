Class {
	#name : 'NestedDefIdentityTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
NestedDefIdentityTestCase >> setUp [
	"Reload tests/python/nested_def_identity.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nested_def_identity' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/nested_def_identity.py')
		name: 'nested_def_identity'.

]

{ #category : 'Grail-Tests - annotate' }
NestedDefIdentityTestCase >> testAnnotateCapturesArePerExecution [
	"``def make(t): def f(x: t)'' built with int and with str must report
	int and str.  __annotate__ is a CLOSURE over the enclosing scope, so
	unlike __name__ / __code__ / __signature_spec__ it is not the same value
	for every execution of the def -- keying it by def site answered the
	FIRST execution's capture for every function built there."

	self assert: testModule @env1:annotate_captures_are_per_execution asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - identity' }
NestedDefIdentityTestCase >> testAnnotationsMemoDoesNotLeak [
	"PEP 649 computes __annotations__ on read and memoizes the dict PER
	OBJECT.  Mutating one execution's dict must not contaminate the next --
	this is the shape test_functools TestWraps.test_update_wrapper_annotations
	trips on, where the same method body runs twice in one process because
	TestWraps subclasses TestUpdateWrapper."

	| both |
	both := testModule @env1:annotations_memo_does_not_leak asArray.
	self assert: both size equals: 2.
	self assert: (both at: 1) @env1:keys asArray asSortedCollection asArray
		equals: #( 'a' ).
	self assert: (both at: 2) @env1:keys asArray asSortedCollection asArray
		equals: #( 'a' ).

]

{ #category : 'Grail-Tests - identity' }
NestedDefIdentityTestCase >> testAttributesAreNotSharedAcrossExecutions [
	"The original report.  ``inner.stamp = tag'' on one execution must not be
	visible to the next, so both executions see 'ABSENT'.  With the block
	shared, the second saw 'first'."

	self assert: testModule @env1:attrs_not_shared asArray
		equals: #( 'ABSENT' 'ABSENT' ).

]

{ #category : 'Grail-Tests - annotate' }
NestedDefIdentityTestCase >> testCapturingAnnotateIsPerObject [
	"The annotate functions themselves are distinct, not merely their
	results -- ``a.__annotate__ is b.__annotate__'' must be false."

	self assert: testModule @env1:capturing_annotate_is_per_object
		equals: false.

]

{ #category : 'Grail-Tests - annotate' }
NestedDefIdentityTestCase >> testCleanAnnotateStaysSharedAndBounded [
	"The complement, and the reason ExecBlockAttrs decides per def rather
	than always going per-object: an annotation naming only globals captures
	nothing, so GemStone answers the same clean-block literal every time and
	the value really IS def-site data.  Keeping it there is what stops a hot
	annotated def from accumulating one side-table entry per execution --
	measured at 200k entries for 200k executions when every annotate was
	stored per-object.  The function objects are still distinct."

	self assert: testModule @env1:clean_annotate_is_shared asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - closures' }
NestedDefIdentityTestCase >> testClosuresStillCapture [
	"A capturing def was already correct (distinct objects, working closure).
	shallowCopy preserves the captured home context, so counter(10) and
	counter(100) keep their own ``start''."

	self assert: testModule @env1:closures_still_capture asArray
		equals: #( 11 101 true ).

]

{ #category : 'Grail-Tests - metadata' }
NestedDefIdentityTestCase >> testDecoratedNestedDefIsFresh [
	"Decoration composes with the copy: the decorator receives the fresh
	object, the rebind stores the decorator's result, and the wrapper still
	reads the wrapped function's __name__."

	| r |
	r := testModule @env1:decorated_nested_def_is_fresh asArray.
	self assert: (r at: 1) equals: 6.
	self assert: (r at: 2) equals: 8.
	self assert: (r at: 3) equals: true.
	self assert: (r at: 4) asArray equals: #( 'work' 'work' ).

]

{ #category : 'Grail-Tests - closures' }
NestedDefIdentityTestCase >> testDefaultCaptureStillPerExecution [
	"A def with defaults compiles to an outer block run immediately (so
	def-time defaults resolve in the enclosing scope); the cascade -- and so
	the copy -- applies to the INNER block it returns."

	self assert: testModule @env1:default_capture_still_per_execution asArray
		equals: #( 1 2 true ).

]

{ #category : 'Grail-Tests - metadata' }
NestedDefIdentityTestCase >> testDefSiteMetadataSurvivesTheCopy [
	"All five def-time stamps resolve through the copy, because they are keyed
	by ``method'' and shallowCopy preserves it.  If the copy had a fresh
	identity the stamps could not reach, __name__ would answer the
	``<closure>'' placeholder and signature() would answer ``()''."

	| r |
	r := testModule @env1:def_site_metadata_survives asArray.
	self assert: (r at: 1) equals: 'annotated'.
	self assert: (r at: 2) equals: 'doc here'.
	self assert: (r at: 3) equals: true.
	self assert: (r at: 4) equals: true.
	self assert: (r at: 5) equals: '(x: int, y: int = 3) -> bool'.

]

{ #category : 'Grail-Tests - identity' }
NestedDefIdentityTestCase >> testDocOverrideDoesNotLeak [
	"__doc__ is stamped at the def SITE, and a runtime write lands in the
	per-object table which shadows it.  With one shared object that write was
	permanent, so the second execution read 'changed' as its docstring."

	self assert: testModule @env1:doc_override_does_not_leak asArray
		equals: #( 'original' 'original' ).

]

{ #category : 'Grail-Tests - identity' }
NestedDefIdentityTestCase >> testEachExecutionYieldsADistinctObject [
	"``a is not b'' for two executions, and ``a is a'' still holds within one --
	the copy is taken once per def execution, not once per reference."

	self assert: testModule @env1:distinct_objects asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - annotate' }
NestedDefIdentityTestCase >> testForwardRefRaisesOnEveryExecution [
	"An annotation naming a local bound only LATER must raise NameError on
	EVERY execution, then resolve once the name is bound.  The second
	execution used to be handed the first's already-resolved annotate
	function and so raised nothing -- which is what test_functools
	TestWraps.test_update_wrapper_annotations reports as 'NameError not
	raised', passing in the base class and failing in the subclass that
	inherits the same method body."

	| both |
	both := testModule @env1:forward_ref_raises_on_every_execution asArray.
	self assert: (both at: 1) asArray equals: #( 'NameError' true ).
	self assert: (both at: 2) asArray equals: #( 'NameError' true ).

]

{ #category : 'Grail-Tests - control flow' }
NestedDefIdentityTestCase >> testGeneratorNestedDefWorks [
	"A generator def wraps its body in extra machinery; the copy is still the
	callable that machinery drives."

	self assert: testModule @env1:generator_nested_def_works asArray
		equals: #( 0 1 2 ).

]

{ #category : 'Grail-Tests - control flow' }
NestedDefIdentityTestCase >> testRecursionByNameResolves [
	"A nested def calling itself reads the enclosing binding, which now holds
	the COPY rather than the block the literal answers -- so a copy the name
	did not point at would recurse into the wrong object or not terminate."

	self assert: testModule @env1:recursion_by_name_resolves equals: 120.

]

{ #category : 'Grail-Tests - closures' }
NestedDefIdentityTestCase >> testSharedEnclosingCellStaysShared [
	"Two nested defs over one enclosing binding must see each other's writes.
	A copy that SNAPSHOTTED the home context instead of sharing it would
	answer 0 here."

	self assert: testModule @env1:shared_enclosing_cell_stays_shared
		equals: 12.

]

{ #category : 'Grail-Tests - metadata' }
NestedDefIdentityTestCase >> testUpdateWrapperAppliesPerExecution [
	"functools.wraps writes __name__ and __annotate__ onto the wrapper.  Both
	executions must report the wrapped function's name and annotations from
	their OWN wrapper object."

	| both |
	both := testModule @env1:update_wrapper_applies_per_execution asArray.
	self assert: (both at: 1) asArray equals: #( 'inner' true ).
	self assert: (both at: 2) asArray equals: #( 'inner' true ).

]
