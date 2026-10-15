Class {
	#name : 'ClassDictOrderTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
ClassDictOrderTestCase >> assertAll: names [

	| results |
	results := testModule @env1:___pyAttrLoad___: #RESULTS.
	names do: [:name | | result |
		result := results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Setup' }
ClassDictOrderTestCase >> setUp [

	importlib @env1:modules removeKey: #'class_dict_order' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_dict_order.py')
		name: 'class_dict_order'

]

{ #category : 'Grail-Tests' }
ClassDictOrderTestCase >> testBodyNamesInSourceOrder [
	"object >> ___grailInBodyOrder___: re-keys the __dict__ snapshot by
	ClassDefAst's ___classBodyOrder___."

	self assertAll: #('body_names_in_source_order' 'slots_in_source_order'
		'vars_agrees')

]

{ #category : 'Grail-Tests' }
ClassDictOrderTestCase >> testWhatTypeNewAddsFollowsTheBody [
	"Slot descriptors, then a None __doc__, then attributes set later."

	self assertAll: #('no_docstring_puts_doc_last' 'empty_class'
		'slot_descriptors_follow_the_body' 'attribute_set_later_follows_the_body'
		'type_keeps_the_namespace_order' 'type_appends_module_and_doc')

]
