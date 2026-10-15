Class {
	#name : 'ReSubCallableTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests-ReSubCallable' }
ReSubCallableTestCase >> loadFixture [
	"Load tests/python/re_sub_callable.py fresh."

	importlib @env1:modules removeKey: #'re_sub_callable' ifAbsent: [].
	^ importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/re_sub_callable.py')
		name: 're_sub_callable'

]

{ #category : 'Grail-Tests-ReSubCallable' }
ReSubCallableTestCase >> testSubBytesCallable [
	"A lambda replacement over a bytes subject (the werkzeug cookie
	shape)."

	self assert: self loadFixture @env1:sub_bytes_callable equals: 'aXbXc' asByteArray

]

{ #category : 'Grail-Tests-ReSubCallable' }
ReSubCallableTestCase >> testSubCallableUsesGroup [
	"The replacement reads m.group() — the exact werkzeug cookie
	quoting shape."

	self assert: self loadFixture @env1:sub_callable_uses_group equals: 'a\"b\\c'

]

{ #category : 'Grail-Tests-ReSubCallable' }
ReSubCallableTestCase >> testSubNamedDefCallable [
	"A named def (not a lambda) as the replacement."

	self assert: self loadFixture @env1:sub_named_def_callable equals: 'ABCDEF'

]

{ #category : 'Grail-Tests-ReSubCallable' }
ReSubCallableTestCase >> testSubnCallableCounts [
	"subn returns (result, count) with a callable replacement."

	| r |
	r := self loadFixture @env1:subn_callable_counts.
	self assert: (r @env1:__getitem__: 0) equals: 'a#b#c#'.
	self assert: (r @env1:__getitem__: 1) equals: 3

]

{ #category : 'Grail-Tests-ReSubCallable' }
ReSubCallableTestCase >> testSubStrCallable [
	"A lambda replacement over a str subject."

	self assert: self loadFixture @env1:sub_str_callable equals: 'aXbXc'

]
