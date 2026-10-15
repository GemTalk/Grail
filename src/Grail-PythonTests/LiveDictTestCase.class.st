Class {
	#name : 'LiveDictTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
LiveDictTestCase >> setUp [
	"Reload tests/python/live_dict.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'live_dict' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/live_dict.py')
		name: 'live_dict'.

]

{ #category : 'Grail-Tests - Read' }
LiveDictTestCase >> testDictContainmentByStringKey [
	"``'x' in b.__dict__'' is True after ``b.x = 1''."

	self assert: (testModule @env1:___pyAttrLoad___: #d1_x_in) equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #d1_missing_in) equals: false

]

{ #category : 'Grail-Tests - Iteration' }
LiveDictTestCase >> testDictItemsLength [
	"``len(list(b.__dict__.items()))'' = number of attributes."

	self assert: (testModule @env1:___pyAttrLoad___: #b3_items_count) equals: 3

]

{ #category : 'Grail-Tests - Iteration' }
LiveDictTestCase >> testDictKeysReflectCurrentState [
	"``b.__dict__.keys()'' yields the current set of String keys."

	| keys |
	keys := testModule @env1:___pyAttrLoad___: #b3_keys.
	self assert: keys size equals: 3.
	"Box('iter') sets 'label' in __init__; the body adds 'x' and 'y'."
	self assert: (keys @env1:__getitem__: 0) equals: 'label'.
	self assert: (keys @env1:__getitem__: 1) equals: 'x'.
	self assert: (keys @env1:__getitem__: 2) equals: 'y'

]

{ #category : 'Grail-Tests - Read' }
LiveDictTestCase >> testDictReadsInstanceWrites [
	"After ``b.label = 'start'; b.x = 1'', the __dict__ view shows
	both."

	self assert: (testModule @env1:___pyAttrLoad___: #d1_label) equals: 'start'.
	self assert: (testModule @env1:___pyAttrLoad___: #d1_x) equals: 1

]

{ #category : 'Grail-Tests - Write' }
LiveDictTestCase >> testDictSetitemPropagates [
	"``b.__dict__['injected'] = 42'' must propagate to b's
	dynamic-instVar storage — ``b.injected'' reads 42."

	self assert: (testModule @env1:___pyAttrLoad___: #b2_reads_injected) equals: 42

]

{ #category : 'Grail-Tests - Write' }
LiveDictTestCase >> testDictUpdateOverwritesExistingKey [
	"update() OVERWRITES same-named keys — but ``label'' is also
	in src as 'source', and dst's pre-existing 'destination'
	gets replaced.  This pins the overwrite semantics."

	self assert: (testModule @env1:___pyAttrLoad___: #dst_label) equals: 'source'.
	self assert: (testModule @env1:___pyAttrLoad___: #dst_label_in_dict) equals: true

]

{ #category : 'Grail-Tests - Write' }
LiveDictTestCase >> testDictUpdatePropagatesAllEntries [
	"``dst.__dict__.update(src.__dict__)'' copies every entry from
	src's view into dst's dynamic-instVar storage.  Reads of the
	new attrs through dst.<name> see the propagated values."

	self assert: (testModule @env1:___pyAttrLoad___: #dst_a) equals: 10.
	self assert: (testModule @env1:___pyAttrLoad___: #dst_b) equals: 20

]

{ #category : 'Grail-Tests - Frame.copy idiom' }
LiveDictTestCase >> testFrameCopyIdiomMaterialisesInstance [
	"``rv = object.__new__(src.__class__); rv.__dict__.update(
	src.__dict__)'' — exact jinja2 Frame.copy() / Symbols.copy()
	shape.  rv must be a fresh Box instance carrying src's attrs."

	self assert: (testModule @env1:___pyAttrLoad___: #copied_is_box) equals: true.
	self assert: (testModule @env1:___pyAttrLoad___: #copied_label) equals: 'orig'.
	self assert: (testModule @env1:___pyAttrLoad___: #copied_flag) equals: true

]
