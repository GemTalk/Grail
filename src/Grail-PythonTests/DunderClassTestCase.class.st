Class {
	#name : 'DunderClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
DunderClassTestCase >> setUp [
	"Reload tests/python/dunder_class.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'dunder_class' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/dunder_class.py')
		name: 'dunder_class'.

]

{ #category : 'Grail-Tests - __doc__' }
DunderClassTestCase >> testDocstringNotCallable [
	"``cls.__doc__'' goes through the same dunder-value whitelist
	as ``__class__'' and must NOT come back as a BoundMethod."

	self assert: (testModule @env1:___pyAttrLoad___: #doc_not_callable) equals: true

]

{ #category : 'Grail-Tests - __class__' }
DunderClassTestCase >> testInstanceClassReturnsClass [
	"``t.__class__'' must return the actual class (Thing), not a
	BoundMethod wrapping the unary getter."

	self assert: (testModule @env1:___pyAttrLoad___: #cls_is_thing) equals: true

]

{ #category : 'Grail-Tests - __class__' }
DunderClassTestCase >> testObjectNewWithDunderClassWorks [
	"``object.__new__(t.__class__)'' must materialise a fresh
	instance.  Pre-fix MNU'd because ``cls'' was a BoundMethod and
	``object.__new__'' did ``cls new'' on it.  jinja2 Symbols.copy()
	exact failure shape."

	self assert: (testModule @env1:___pyAttrLoad___: #fresh_is_thing) equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #fresh_is_not_t) equals: true

]

{ #category : 'Grail-Tests - __class__' }
DunderClassTestCase >> testSubclassDunderClassPicksMostSpecific [
	"``s.__class__'' on a Sub(Thing) instance returns Sub, not Thing.
	The dunder-whitelist branch must dispatch via ``self class'' rather
	than a hardcoded class reference."

	self assert: (testModule @env1:___pyAttrLoad___: #sub_is_sub) equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #sub_not_thing) equals: true

]
