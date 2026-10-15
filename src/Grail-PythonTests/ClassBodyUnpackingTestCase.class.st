Class {
	#name : 'ClassBodyUnpackingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyUnpackingTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassBodyUnpackingTestCase >> setUp [
	"Reload tests/python/class_body_unpacking.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_unpacking' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_unpacking.py')
		name: 'class_body_unpacking'.

]

{ #category : 'Grail-Tests - del' }
ClassBodyUnpackingTestCase >> testADeletedNameStaysDeleted [
	"The paired half: routing a del-ed name's stores through the definitional
	store must not resurrect it.  Asserted because the fix reorders when the
	holder is created, and getting that wrong makes hasattr answer true."

	self assert: (self resultAt: 'del_stays_deleted') asString equals: 'False'.

]

{ #category : 'Grail-Tests - del' }
ClassBodyUnpackingTestCase >> testANameCanBeDeletedAndAssignedAgain [
	self assert: (self resultAt: 'del_then_reassign') asString equals: '2'.

]

{ #category : 'Grail-Tests - if branches' }
ClassBodyUnpackingTestCase >> testAnIfBranchAssignmentToANonNameTargetIsNotDropped [
	"Silently dropped before -- no error, no binding.  Both a tuple target and a
	subscript target, since the emitter's test was ``all targets are plain
	names'' and so discarded either."

	self assert: (self resultAt: 'if_branch_tuple_assign') asString equals: '11'.
	self assert: (self resultAt: 'if_branch_subscript_assign') asString
		equals: '[(''k'', ''v'')]'.

]

{ #category : 'Grail-Tests - Loop targets' }
ClassBodyUnpackingTestCase >> testATupleLoopTargetBindsEveryNameItUnpacks [
	"The read half.  Both names were stored and neither could be read."

	self assert: (self resultAt: 'for_tuple_target') asString
		equals: '[(''A'', 1), (''A'', 2)]'.
	self assert: (self resultAt: 'for_tuple_binds_after_loop') asString
		equals: '(3, 4)'.

]

{ #category : 'Grail-Tests - with-as targets' }
ClassBodyUnpackingTestCase >> testATupleWithAsTargetCompilesAndBinds [
	"This one was a COMPILE error, not a NameError: a bare ``u := ...'' names an
	undefined symbol and takes the whole enclosing module down, so the class
	that used it made its module unimportable."

	self assert: (self resultAt: 'with_tuple_as') asString equals: '3'.

]

{ #category : 'Grail-Tests - Loop targets' }
ClassBodyUnpackingTestCase >> testStarAndNestedLoopTargetsBindToo [
	"The collector recurses, so a star target and a nested tuple are covered by
	construction rather than by three separate branches."

	self assert: (self resultAt: 'for_star_target') asString equals: '[(1, [2, 3])]'.
	self assert: (self resultAt: 'for_nested_target') asString equals: '[(1, 2, 3)]'.

]

{ #category : 'Grail-Tests - del' }
ClassBodyUnpackingTestCase >> testThePydocHelperShapeWholeWorks [
	"All of it together, which is how it was found: a nested loop over an
	unpacking target, reads of both names inside, a del of four, and a
	re-assignment of one of them afterwards."

	self assert: (self resultAt: 'pydoc_helper_shape') asString
		equals: '[(''"'', ''STRINGS''), (''%'', ''OPERATORS''), ("''", ''STRINGS''), (''j'', ''COMPLEX'')]'.
	self assert: (self resultAt: 'pydoc_helper_topics') asString
		equals: '{''TYPES'': ''types''}'.

]

{ #category : 'Grail-Tests - Already worked' }
ClassBodyUnpackingTestCase >> testTheShapesThatAlreadyWorkedStillDo [
	"An unconditional tuple assignment at class-body level, and a plain loop
	target.  Both go through different emitters than the four above and are
	asserted so a regression says which side moved."

	self assert: (self resultAt: 'toplevel_tuple_assign') asString equals: '(7, 8)'.
	self assert: (self resultAt: 'simple_for_target') asString equals: '(6, 3)'.

]
