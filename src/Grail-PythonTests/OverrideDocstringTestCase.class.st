Class {
	#name : 'OverrideDocstringTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
OverrideDocstringTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
OverrideDocstringTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
OverrideDocstringTestCase >> setUp [

	importlib @env1:modules removeKey: #'override_docstrings' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/override_docstrings.py')
		name: 'override_docstrings'

]

{ #category : 'Grail-Tests - overrides' }
OverrideDocstringTestCase >> testAnUndocumentedOverrideIsNone [

	self assertAll: #('a_decorator_sees_no_docstring_on_an_override'
		'an_undocumented_override_is_none' 'every_method_kind_is_none_when_overridden'
		'the_nearest_definition_decides' 'several_bases_follow_the_mro')

]

{ #category : 'Grail-Tests - overrides' }
OverrideDocstringTestCase >> testEveryFixtureCheckIsAssertedByATestHere [

	self assert: (self results @env1:__len__) equals: 10

]

{ #category : 'Grail-Tests - overrides' }
OverrideDocstringTestCase >> testGoogleAuthCopyDocstringDecoratesAnOverride [

	self assertAll: #('google_auth_copy_docstring_decorates_an_override')

]

{ #category : 'Grail-Tests - overrides' }
OverrideDocstringTestCase >> testWhatAlreadyWorkedStillDoes [

	self assertAll: #('an_inherited_method_still_reports_its_base'
		'an_alias_is_the_base_function' 'a_setter_keeps_the_getter_docstring'
		'a_redefinition_without_a_docstring_is_none')

]
