Class {
	#name : 'TypeThreeArgNamespaceTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TypeThreeArgNamespaceTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
TypeThreeArgNamespaceTestCase >> setUp [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'type_three_arg_namespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/type_three_arg_namespace.py')
		name: 'type_three_arg_namespace'.
	probe := (testModule @env1:___pyAttrLoad___: #'report')
		@env1:___pyCallValue___: #() kw: nil.

]

{ #category : 'Grail-Tests - Data Attributes' }
TypeThreeArgNamespaceTestCase >> testADataAttributeIsReadableOffAnInstance [
	"The other half of a class attribute: an instance sees it too."

	self assert: (self at: 'data_on_instance') equals: 5.
	self assert: (self at: 'data_name') @env0:asString equals: 'Data'.

]

{ #category : 'Grail-Tests - Data Attributes' }
TypeThreeArgNamespaceTestCase >> testADataAttributeIsReadableOffTheClass [
	"``type('Data', (), {'z': 5})'' then ``Data.z''.  This is the call that
	died inside the constructor."

	self assert: (self at: 'data_on_class') equals: 5.

]

{ #category : 'Grail-Tests - Methods' }
TypeThreeArgNamespaceTestCase >> testAFunctionInTheNamespaceBecomesACallableMethod [
	"``{'method': method}'' -- and it must bind the instance, since the
	function reads ``self.kind''."

	self assert: (self at: 'method_result') @env0:asString equals: 'method:plain'.

]

{ #category : 'Grail-Tests - Guards' }
TypeThreeArgNamespaceTestCase >> testAnEmptyNamespaceIsUnchanged [
	"The path werkzeug's ``type('WrapperTestResponse', (TestResponse,
	wrapper), {})'' takes.  It worked before and must be untouched --
	including the inherited class attribute the exclude set now filters,
	which for an empty namespace is still nothing."

	self assert: (self at: 'empty_inherited') @env0:asString equals: 'inherited'.
	self assert: (self at: 'empty_kind') @env0:asString equals: 'base'.

]

{ #category : 'Grail-Tests - Bases' }
TypeThreeArgNamespaceTestCase >> testAnInheritedMethodStillWorks [
	self assert: (self at: 'derived_inherited') @env0:asString equals: 'inherited'.

]

{ #category : 'Grail-Tests - Data Attributes' }
TypeThreeArgNamespaceTestCase >> testAttributesCanStillBeAddedAfterwards [
	"setattr on a dynamically built class lands in the same holder, so the
	holder the fix installs has to serve later stores as well as the ones
	the namespace made."

	self assert: (self at: 'setattr_after') @env0:asString equals: 'added'.

]

{ #category : 'Grail-Tests - Bases' }
TypeThreeArgNamespaceTestCase >> testTheNamespaceOverridesAnInheritedAttribute [
	"___inheritClassAttrs___ copies the parent's value into the subclass's
	slot, and that slot outranks the holder the namespace wrote to -- so this
	answered 'base'.  The namespace's own names are excluded from that pass."

	self assert: (self at: 'derived_override') @env0:asString equals: 'derived'.
	self assert: (self at: 'base_untouched') @env0:asString equals: 'base'.

]
