"A __repr__ that answers something other than a str.

CPython's PyObject_Repr refuses it with ``TypeError: __repr__ returned
non-string (type int)'.  Grail handed the value on -- repr(x) answered an
int, '{!r}'.format(x) and ascii(x) formatted it, and repr([x]) failed with a
Smalltalk doesNotUnderstand:.  Every site that takes a repr now sends
object >> ___reprResult___ to what __repr__ answered.

Every expectation in tests/python/repr_requires_a_str.py was produced by
CPython 3.14; the fixture gate re-checks it there."
Class {
	#name : 'ReprRequiresAStrTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ReprRequiresAStrTestCase >> assertAll: keys [
	keys do: [:each |
		| v |
		v := self resultAt: each.
		self assert: v == true description: each , ' -> ' , v printString]

]

{ #category : 'Grail-Helpers' }
ReprRequiresAStrTestCase >> resultAt: aKey [
	^ (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ReprRequiresAStrTestCase >> setUp [
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'repr_requires_a_str' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/repr_requires_a_str.py')
		name: 'repr_requires_a_str'.

]

{ #category : 'Grail-Tests' }
ReprRequiresAStrTestCase >> testEveryRouteChecks [
	"%r/%a (str and bytes), f-string !r/!a, str.format/format_map !r, ascii(),
	and the element repr of every built-in container."

	self assertAll: #('every_formatting_route_checks' 'every_container_repr_checks')

]

{ #category : 'Grail-Tests' }
ReprRequiresAStrTestCase >> testGoodReprsAreUnchanged [
	"A raising __repr__ still propagates its own error, and the
	recursive-container guards still answer their ellipses."

	self assertAll: #('good_reprs_are_unchanged')

]

{ #category : 'Grail-Tests' }
ReprRequiresAStrTestCase >> testReprRefusesANonStr [
	"repr() itself, and the two valid shapes: a str subclass and a str holding
	a lone surrogate."

	self assertAll: #('repr_refuses_a_non_str' 'a_str_subclass_and_a_surrogate_are_accepted')

]
