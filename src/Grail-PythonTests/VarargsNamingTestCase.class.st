Class {
	#name : 'VarargsNamingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
VarargsNamingTestCase >> setUp [
	"Reload tests/python/varargs_naming.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'varargs_naming' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/varargs_naming.py')
		name: 'varargs_naming'.

]

{ #category : 'Grail-Tests - kwargs collision' }
VarargsNamingTestCase >> testKwargsCollisionPropagatesKwargs [
	"``def f(*args, **kwargs):'' — user's **kwarg literally named
	``kwargs'' matches the Smalltalk method param convention.
	Pre-fix, calling ``f(1, 2, name='World', extra=True)'' delivered
	an empty kwargs dict.  Fixed: kwargs has the 2 entries."

	| result |
	result := testModule @env1:collides_kwargs_result.
	self assert: (result @env1:__getitem__: 0) equals: 2.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: 'World'

]

{ #category : 'Grail-Tests - no collision' }
VarargsNamingTestCase >> testNoCollisionStillWorks [
	"``def f(*items, **options):'' — neither name collides with
	the method-param convention.  The original codegen path stays
	in effect.  Sanity check that the conditional rename doesn't
	break the non-collision case."

	| result |
	result := testModule @env1:no_collision_result.
	self assert: (result @env1:__getitem__: 0) equals: 3.
	self assert: (result @env1:__getitem__: 1) equals: 2.
	self assert: (result @env1:__getitem__: 2) equals: true

]

{ #category : 'Grail-Tests - positional collision' }
VarargsNamingTestCase >> testPositionalCollisionPropagatesArgs [
	"``def f(*positional, **kw):'' — symmetric collision on the
	positional side: the user's *vararg is named ``positional''
	(matching the Smalltalk method-param convention).  The first
	positional element must come through unchanged."

	| result |
	result := testModule @env1:collides_positional_result.
	self assert: (result @env1:__getitem__: 0) equals: 2.
	self assert: (result @env1:__getitem__: 1) equals: 1.
	self assert: (result @env1:__getitem__: 2) equals: 'first'

]
