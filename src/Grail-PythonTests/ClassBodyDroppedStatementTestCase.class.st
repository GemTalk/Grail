Class {
	#name : 'ClassBodyDroppedStatementTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
ClassBodyDroppedStatementTestCase >> setUp [
	"Reload tests/python/class_body_dropped_statement.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_dropped_statement' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/class_body_dropped_statement.py')
		name: 'class_body_dropped_statement'.

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testDelDoesNotReachTheEnclosingLocal [
	"The enclosing def binds ``x'' too.  Emitting the ordinary function-local
	delete (``x := nil'') would have nilled THAT temp -- this is why the class
	body needs a delete of its own rather than either existing branch."

	self assert: testModule @env1:del_does_not_reach_the_enclosing_local asArray
		equals: #( false 7 ).

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testDelInAMethodIsStillALocal [
	"A method is a FUNCTION scope.  The class-body routing keys off a flag
	ClassDefAst sets only around class-body-level statements, so a ``del''
	inside a method keeps the local emit and its UnboundLocalError."

	self assert: testModule @env1:del_in_a_method_is_still_a_local
		equals: 'UnboundLocalError'.

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testDelLeavesTheOtherAttributesAlone [
	"Only the named binding goes -- the delete is by name, not a reset of the
	class's attribute set."

	self assert: testModule @env1:del_leaves_the_other_attributes_alone asArray
		equals: #( false 2 ).

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testDelOfAnUnboundNameRaises [
	"CPython's class-body ``del'' is DELETE_NAME on the body's own namespace,
	so it raises rather than quietly reaching the module global or the
	enclosing local of that name."

	self assert: testModule @env1:del_of_an_unbound_name_raises equals: 'NameError'.

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testDelOfASubscriptStillWorks [
	"A target carrying its own receiver needs no class routing and keeps the
	emit it always had; it was simply never reached at class-body level."

	self assert: (testModule @env1:del_of_a_subscript_still_works
		collect: [:pair | pair asArray]) asArray
			equals: (Array with: #( 'b' 2 )).

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testDelRemovesAClassAttribute [
	"The name is GONE, not emptied: hasattr is false and the read raises
	AttributeError, which is what removing the accessor pair buys over nilling
	its slot."

	self assert: testModule @env1:del_removes_a_class_attribute asArray
		equals: #( false 'AttributeError' ).

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testSubscriptAssignRuns [
	"THE BUG.  The write was dropped, so the read that follows it raised
	KeyError."

	self assert: testModule @env1:subscript_assign_runs asArray first equals: 1.

]

{ #category : 'Grail-Tests' }
ClassBodyDroppedStatementTestCase >> testSubscriptAssignRunsInSourceOrder [
	"THE ORDERING CASE.  ``before'' is computed ahead of the write and
	``after'' behind it, so emitting the write in a pass after the attributes
	answers ( true true )."

	self assert: testModule @env1:subscript_assign_runs_in_source_order asArray
		equals: #( false true ).

]
