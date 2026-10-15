Class {
	#name : 'ClassBodyDunderClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyDunderClassTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ClassBodyDunderClassTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_dunder_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath:
			(importlib grailDir , '/tests/python/class_body_dunder_class.py')
		name: 'class_body_dunder_class'.
	probe := testModule @env1:___pyAttrLoad___: #'r'.

]

{ #category : 'Grail-Tests - No enclosing class' }
ClassBodyDunderClassTestCase >> testAClassBodyInsideAClassBodyRaisesNameError [
	"A class body is NOT a scope names resolve through, so ``class Outer: class
	Inner: x = __class__'' does not see Outer.  Getting this wrong is the natural
	failure of the fix itself -- the enclosing class IS sitting right there in the
	compile context, and publishing it unconditionally answers Outer."

	self assert: (self at: 'class_body_in_class_body') @env0:asString
		equals: 'NameError'.

]

{ #category : 'Grail-Tests' }
ClassBodyDunderClassTestCase >> testAClassBodyReadsTheEnclosingMethodLocalClass [
	"The other way of reaching an enclosing class, and it compiles differently:
	a method-local class is read through its closure cell rather than off the
	module instance.  The cell STORE is only emitted for names registered as
	captured, so this passes only when the read registers itself against the
	enclosing class's captured set -- the inner class's set is the wrong one."

	self assert: (self at: 'enclosing_is_method_local_class') equals: true.

]

{ #category : 'Grail-Tests' }
ClassBodyDunderClassTestCase >> testAClassBodyReadsTheEnclosingModuleScopeClass [
	"The shape the whole change is about, and the one test_super asserts:
	``X.x is type(self)'' for a class defined inside a method.  Answered a
	BoundMethod for builtins.__class__ before -- not a class at all, and no error
	to say so."

	self assert: (self at: 'enclosing_is_module_scope_class') equals: true.

]

{ #category : 'Grail-Tests' }
ClassBodyDunderClassTestCase >> testAMethodOfTheInnerClassStillGetsTheInnerClass [
	"The guard on all of it.  ``__class__'' in a METHOD is the ORDINARY rule --
	the class the method was defined in -- and widening the class-BODY case must
	not disturb it."

	self assert: (self at: 'inner_method_still_gets_inner_class') equals: true.

]

{ #category : 'Grail-Tests - No enclosing class' }
ClassBodyDunderClassTestCase >> testAModuleScopeClassBodyRaisesNameError [
	"``name '__class__' is not defined''.  Raised explicitly: falling through
	does not raise, because ``__class__'' resolves as a builtins attribute and
	comes back as a BoundMethod."

	self assert: (self at: 'module_scope_body') @env0:asString equals: 'NameError'.

]

{ #category : 'Grail-Tests' }
ClassBodyDunderClassTestCase >> testTheClassBeingDefinedIsNotTheAnswer [
	"Stated as its own test because it is the trap: the obvious reading of
	``__class__'' in a class body is the class being defined, and it is wrong --
	that class does not exist while its body runs."

	self assert: (self at: 'inner_class_is_not_the_answer') equals: true.

]
