"Tests that an instance's __doc__ is its class's docstring -- None when the
class has none -- and that unbound-method metadata (__module__, __qualname__) is
always a Python string rather than Smalltalk nil.  Drives
tests/python/instance_docstring.py."
Class {
	#name : 'InstanceDocstringTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
InstanceDocstringTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
InstanceDocstringTestCase >> setUp [
	"Reload tests/python/instance_docstring.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'instance_docstring' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/instance_docstring.py')
		name: 'instance_docstring'.

]

{ #category : 'Grail-Tests - Instance __doc__' }
InstanceDocstringTestCase >> testADocumentedClassGivesItsInstancesItsOwnDocstring [
	"The read has to reach the class's docstring, not merely stop reaching
	object's -- an implementation that answered None unconditionally would pass
	the test above and fail this one."

	self assert: (self resultAt: 'documented_class') asString
		equals: '''One line summary.'''.
	self assert: (self resultAt: 'documented_instance') asString
		equals: '''One line summary.'''.

]

{ #category : 'Grail-Tests - Instance __doc__' }
InstanceDocstringTestCase >> testAnUndocumentedClassGivesItsInstancesNoDocstring [
	"The whole bug in one line: the class was already right, the instance was
	not."

	self assert: (self resultAt: 'plain_class') asString equals: 'None'.
	self assert: (self resultAt: 'plain_instance') asString equals: 'None'.

]

{ #category : 'Grail-Tests - Instance __doc__' }
InstanceDocstringTestCase >> testASubclassDoesNotInheritItsBasesDocstring [
	"CPython gives Sub its own __dict__ entry of None, so neither the class nor
	its instances borrow Documented's text."

	self assert: (self resultAt: 'sub_class') asString equals: 'None'.
	self assert: (self resultAt: 'sub_instance') asString equals: 'None'.

]

{ #category : 'Grail-Tests - Instance __doc__' }
InstanceDocstringTestCase >> testGetdocCanFinallyAnswerNone [
	"inspect.getdoc is the consumer that could not work at all: it exists to
	report ``no docstring here'', and every object answered object's."

	self assert: (self resultAt: 'getdoc_undocumented') asString equals: 'None'.
	self assert: (self resultAt: 'getdoc_documented') asString
		equals: '''One line summary.'''.
	self assert: (self resultAt: 'enum_member') asString equals: 'None'.
	self assert: (self resultAt: 'method') asString equals: '''Method docstring.'''.

]

{ #category : 'Grail-Tests - Instance __doc__' }
InstanceDocstringTestCase >> testObjectKeepsItsOwnDocstring [
	"The fix is about where the lookup STOPS, not about removing the text."

	self assert: (self resultAt: 'object_still_documented') asString
		equals: '''The base class of the class hierarchy.'''.

]

{ #category : 'Grail-Tests - Unbound-method metadata' }
InstanceDocstringTestCase >> testUnboundMethodMetadataIsAlwaysAPythonValue [
	"Phrased as ``is it a string'' rather than pinned to exact text, because the
	values legitimately differ between Grail and CPython -- what must not differ
	is that they are Python values at all.  A Smalltalk metaclass is spelled
	``Color class'', two words, so the space check catches it leaking into a
	qualified name without asserting which class Grail reports."

	self assert: (self resultAt: 'unbound_module_is_str') asString equals: 'True'.
	self assert: (self resultAt: 'unbound_qualname_is_str') asString equals: 'True'.
	self assert: (self resultAt: 'unbound_qualname_is_a_name') asString equals: 'True'.
	self assert: (self resultAt: 'method_module_is_str') asString equals: 'True'.
	self assert: (self resultAt: 'method_qualname') asString equals: '''Meth.m'''.

]
