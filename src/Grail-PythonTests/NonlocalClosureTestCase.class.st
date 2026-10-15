Class {
	#name : 'NonlocalClosureTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
NonlocalClosureTestCase >> setUp [
	"Load tests/python/nonlocal_closure.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'nonlocal_closure' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/nonlocal_closure.py')
		name: 'nonlocal_closure'.

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testClosureAssignReachesOuter [
	"``nonlocal captured; captured = X'' in an inner def writes to
	the outer's binding via Smalltalk closure capture."

	self assert: testModule @env1:closure_assign_reaches_outer equals: true

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testClosureViaCallback [
	"A nonlocal-mutating closure passed elsewhere as a callable
	still writes to the original outer binding."

	self assert: testModule @env1:closure_via_callback equals: true

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testFreevarThroughNestedClassMethod [
	"A free variable read by a nested class's method, where the nested
	class is defined inside a METHOD of an outer class, so the closure
	cell must be FORWARDED through the intervening method's own cell
	(two class boundaries between reference and binding).  This is the
	shape of CPython test_dict.test_update's BogonIter raising the
	enclosing function's Exc; pre-fix the outer method string-compiled
	with a bare, undefined reference (a codegen gap)."

	self assert: testModule @env1:freevar_through_nested_class_method equals: true

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testNonlocalWriteInMethodAug [
	"``nonlocal x; x += 1'' inside a method of a function-local class
	mutates the enclosing local through a setter closure cell (the method
	has no lexical link to the outer temp).  CPython test_dict
	test_str_nonstr's Key3.__eq__ shape."

	self assert: testModule @env1:nonlocal_write_in_method_aug equals: true

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testNonlocalWriteInMethodPlain [
	"Plain ``nonlocal x; x = v'' inside a method reaches the enclosing
	binding through the setter cell."

	self assert: testModule @env1:nonlocal_write_in_method_plain equals: true

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testNonlocalWriteThroughNestedClassMethod [
	"``nonlocal'' write from a method of a class nested inside another
	class's method: the setter cell is FORWARDED through the intervening
	method's own setter cell (two class boundaries)."

	self assert: testModule @env1:nonlocal_write_through_nested_class_method equals: true

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testTwoNonlocals [
	"``nonlocal a, b'' declares both names — independent mutations
	each reach their respective outer bindings."

	self assert: testModule @env1:two_nonlocals equals: true

]

{ #category : 'Grail-Tests' }
NonlocalClosureTestCase >> testWsgiLikePattern [
	"The exact pattern that werkzeug.test.run_wsgi_app uses for
	its ``start_response'' closure (the WSGI inversion-of-control
	idiom)."

	self assert: testModule @env1:wsgi_like_pattern equals: true

]
